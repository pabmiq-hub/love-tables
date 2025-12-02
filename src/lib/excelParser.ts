import * as XLSX from 'xlsx';

export const AGE_RANGES = ['18–24', '25–32', '33–40', '41–50', '+ 50'] as const;
export const PREFERRED_AGE_RANGES = [...AGE_RANGES, 'Cualquier rango de edad'] as const;
export const GENDERS = ['Hombre', 'Mujer', 'No binario', 'Prefiero no decirlo'] as const;
export const PREFERENCES = ['Amistad y ligue', 'Solo amistad'] as const;
export const DATING_PREFERENCES = [
  'Soy un hombre y busco una mujer',
  'Soy un hombre y busco un hombre',
  'Soy una mujer y busco un hombre',
  'Soy una mujer y busco una mujer',
  'No binario',
  'Estoy abierto a todo',
  'Prefiero no contestar',
] as const;

export interface Participant {
  id: string;
  name: string;
  age: number;
  ageRange: string;
  preferredAgeRange: string;
  preference: string;
  datingPreference?: string; // Only when preference is "Amistad y ligue"
  gender: string;
  phone?: string;
}

export interface ParseResult {
  success: boolean;
  participants: Participant[];
  errors: string[];
}

// Column mappings ordered by specificity (most specific first)
// Each entry: [fieldKey, exact match patterns, partial match patterns]
const columnMappingsOrdered: Array<{
  key: string;
  exact: string[];
  partial: string[];
}> = [
  // More specific patterns first
  {
    key: 'preferredAgeRange',
    exact: ['rango de edad preferido', 'edad preferida', 'rango preferido'],
    partial: ['preferido', 'preferred age', 'busca edad']
  },
  {
    key: 'datingPreference',
    exact: ['preferencia acerca de ligue', 'preferencia de ligue', 'tipo de ligue'],
    partial: ['acerca de ligue', 'busco a']
  },
  // Then less specific patterns
  {
    key: 'ageRange',
    exact: ['rango de edad', 'mi rango de edad', 'mi edad'],
    partial: ['age range', 'rango edad']
  },
  {
    key: 'name',
    exact: ['nombre y apellidos', 'nombre completo'],
    partial: ['nombre', 'participante', 'name']
  },
  {
    key: 'preference',
    exact: ['preferencia', 'tipo de conexion'],
    partial: ['preferencias', 'preference']
  },
  {
    key: 'gender',
    exact: ['genero', 'género'],
    partial: ['sexo', 'gender', 'sex']
  },
  {
    key: 'age',
    exact: ['edad'],
    partial: ['age', 'años']
  },
  {
    key: 'phone',
    exact: ['teléfono', 'telefono', 'phone'],
    partial: ['tel', 'móvil', 'movil', 'celular', 'contacto']
  },
];

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findColumnMapping(header: string): string | null {
  const normalized = normalizeColumnName(header);
  
  // First pass: look for exact matches
  for (const mapping of columnMappingsOrdered) {
    for (const pattern of mapping.exact) {
      const normalizedPattern = normalizeColumnName(pattern);
      if (normalized === normalizedPattern) {
        return mapping.key;
      }
    }
  }
  
  // Second pass: look for patterns contained in header (more specific first due to order)
  for (const mapping of columnMappingsOrdered) {
    for (const pattern of mapping.exact) {
      const normalizedPattern = normalizeColumnName(pattern);
      if (normalized.includes(normalizedPattern)) {
        return mapping.key;
      }
    }
  }
  
  // Third pass: partial matches
  for (const mapping of columnMappingsOrdered) {
    for (const pattern of mapping.partial) {
      const normalizedPattern = normalizeColumnName(pattern);
      if (normalized.includes(normalizedPattern)) {
        return mapping.key;
      }
    }
  }
  
  return null;
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 11);
}

function parseAge(value: any): number {
  if (typeof value === 'number') return value;
  if (typeof value === 'string') {
    const match = value.match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  return 0;
}

function normalizeAgeRange(value: string): string {
  const normalized = value.trim();
  // Check if it matches any of the predefined ranges
  for (const range of AGE_RANGES) {
    if (normalized.includes(range.replace('–', '-')) || normalized.includes(range)) {
      return range;
    }
  }
  // Try to match patterns like "18-24" -> "18–24"
  if (normalized.includes('18') && normalized.includes('24')) return '18–24';
  if (normalized.includes('25') && normalized.includes('32')) return '25–32';
  if (normalized.includes('33') && normalized.includes('40')) return '33–40';
  if (normalized.includes('41') && normalized.includes('50')) return '41–50';
  if (normalized.includes('50') || normalized.includes('+')) return '+ 50';
  return normalized;
}

function normalizePreferredAgeRange(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('cualquier') || lower.includes('all')) {
    return 'Cualquier rango de edad';
  }
  // Handle multiple age ranges separated by commas
  if (value.includes(',')) {
    const ranges = value.split(',').map(r => normalizeAgeRange(r.trim())).filter(r => r);
    return ranges.join(', ');
  }
  return normalizeAgeRange(value);
}

function normalizePreference(value: string): string {
  const lower = value.toLowerCase().trim();
  // Check for "ligue" or "amistad y ligue"
  if (lower === 'ligue' || lower === 'amistad y ligue' || lower.includes('romance') || lower.includes('romántico') || lower.includes('cita')) {
    return 'Amistad y ligue';
  }
  // "Amistad" alone (without "y ligue") means "Solo amistad"
  if (lower === 'amistad' || lower === 'solo amistad' || (lower.includes('solo') && lower.includes('amistad'))) {
    return 'Solo amistad';
  }
  return value;
}

// Check if preference requires dating preference
function requiresDatingPreference(preference: string): boolean {
  const lower = preference.toLowerCase().trim();
  return lower === 'ligue' || lower === 'amistad y ligue' || lower.includes('ligue');
}

function normalizeDatingPreference(value: string): string {
  // Remove trailing periods and trim
  const cleaned = value.trim().replace(/\.$/, '');
  const lower = cleaned.toLowerCase();
  
  if (lower.includes('hombre') && lower.includes('busco') && lower.includes('mujer')) {
    return 'Soy un hombre y busco una mujer';
  }
  if (lower.includes('hombre') && lower.includes('busco') && lower.includes('hombre')) {
    return 'Soy un hombre y busco un hombre';
  }
  if (lower.includes('mujer') && lower.includes('busco') && lower.includes('hombre')) {
    return 'Soy una mujer y busco un hombre';
  }
  if (lower.includes('mujer') && lower.includes('busco') && lower.includes('mujer')) {
    return 'Soy una mujer y busco una mujer';
  }
  if (lower.includes('no binario') || lower.includes('non binary')) {
    return 'No binario';
  }
  if (lower.includes('abierto') || lower.includes('open')) {
    return 'Estoy abierto a todo';
  }
  if (lower.includes('prefiero no') || lower.includes('no contest')) {
    return 'Prefiero no contestar';
  }
  
  return cleaned;
}

function normalizeGender(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('mujer') || lower.includes('femenino') || lower === 'f' || lower === 'female') {
    return 'Mujer';
  }
  if (lower.includes('hombre') || lower.includes('masculino') || lower === 'm' || lower === 'male') {
    return 'Hombre';
  }
  if (lower.includes('no binario') || lower.includes('non binary') || lower.includes('non-binary')) {
    return 'No binario';
  }
  if (lower.includes('prefiero no') || lower.includes('no decir')) {
    return 'Prefiero no decirlo';
  }
  return 'Prefiero no decirlo';
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({
            success: false,
            participants: [],
            errors: ['El archivo está vacío o no tiene datos suficientes'],
          });
          return;
        }
        
        const headers = jsonData[0] as string[];
        const columnMap: Record<string, number> = {};
        
        headers.forEach((header, index) => {
          if (header) {
            const mapping = findColumnMapping(String(header));
            if (mapping) {
              columnMap[mapping] = index;
            }
          }
        });
        
        const requiredColumns = ['name'];
        const missingColumns = requiredColumns.filter(col => !(col in columnMap));
        
        if (missingColumns.length > 0) {
          resolve({
            success: false,
            participants: [],
            errors: [`No se encontraron las columnas requeridas: ${missingColumns.join(', ')}. Asegúrate de que el Excel tenga una columna con "Nombre"`],
          });
          return;
        }
        
        const participants: Participant[] = [];
        const errors: string[] = [];
        
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = row[columnMap.name];
          if (!name || String(name).trim() === '') {
            continue;
          }
          
          try {
            const preference = columnMap.preference !== undefined 
              ? normalizePreference(String(row[columnMap.preference] || 'Amistad y ligue')) 
              : 'Amistad y ligue';
            
            const participant: Participant = {
              id: generateId(),
              name: String(name).trim(),
              age: columnMap.age !== undefined ? parseAge(row[columnMap.age]) : 0,
              ageRange: columnMap.ageRange !== undefined ? normalizeAgeRange(String(row[columnMap.ageRange] || '')) : '',
              preferredAgeRange: columnMap.preferredAgeRange !== undefined ? normalizePreferredAgeRange(String(row[columnMap.preferredAgeRange] || '')) : '',
              preference,
              gender: columnMap.gender !== undefined ? normalizeGender(String(row[columnMap.gender] || '')) : 'Prefiero no decirlo',
              phone: columnMap.phone !== undefined ? String(row[columnMap.phone] || '').trim() : undefined,
            };
            
            // Add dating preference if preference includes "ligue"
            if (requiresDatingPreference(preference) && columnMap.datingPreference !== undefined) {
              const rawDatingPref = String(row[columnMap.datingPreference] || '').trim();
              if (rawDatingPref) {
                participant.datingPreference = normalizeDatingPreference(rawDatingPref);
              }
            }
            
            participants.push(participant);
          } catch (err) {
            errors.push(`Error en fila ${i + 1}: ${err}`);
          }
        }
        
        if (participants.length === 0) {
          resolve({
            success: false,
            participants: [],
            errors: ['No se encontraron participantes válidos en el archivo'],
          });
          return;
        }
        
        resolve({
          success: true,
          participants,
          errors,
        });
      } catch (error) {
        resolve({
          success: false,
          participants: [],
          errors: [`Error al procesar el archivo: ${error}`],
        });
      }
    };
    
    reader.onerror = () => {
      resolve({
        success: false,
        participants: [],
        errors: ['Error al leer el archivo'],
      });
    };
    
    reader.readAsArrayBuffer(file);
  });
}
