import * as XLSX from 'xlsx';

export interface Participant {
  id: string;
  name: string;
  age: number;
  ageRange: string;
  preferredAgeRange: string;
  preference: string;
  gender: string;
}

export interface ParseResult {
  success: boolean;
  participants: Participant[];
  errors: string[];
}

// Common column name mappings (Spanish variations)
const columnMappings: Record<string, string[]> = {
  name: ['nombre', 'nombre y apellidos', 'nombre completo', 'participante', 'name'],
  age: ['edad', 'age', 'años'],
  ageRange: ['rango de edad', 'rango edad', 'age range', 'mi edad'],
  preferredAgeRange: ['rango de edad preferido', 'edad preferida', 'busca edad', 'preferred age', 'rango preferido'],
  preference: ['preferencia', 'preferencias', 'tipo', 'busca', 'preference', 'tipo de conexión'],
  gender: ['género', 'genero', 'sexo', 'gender', 'sex'],
};

function normalizeColumnName(name: string): string {
  return name.toLowerCase().trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function findColumnMapping(header: string): string | null {
  const normalized = normalizeColumnName(header);
  
  for (const [key, variations] of Object.entries(columnMappings)) {
    for (const variation of variations) {
      if (normalized.includes(normalizeColumnName(variation))) {
        return key;
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
    // Try to extract a number from string like "25-30" -> take first number
    const match = value.match(/\d+/);
    if (match) return parseInt(match[0], 10);
  }
  return 0;
}

function normalizePreference(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('ligue') || lower.includes('romance') || lower.includes('romántico')) {
    return 'Amistad y ligue';
  }
  if (lower.includes('amistad') || lower.includes('friend')) {
    return 'Solo amistad';
  }
  return value;
}

function normalizeGender(value: string): string {
  const lower = value.toLowerCase();
  if (lower.includes('mujer') || lower.includes('femenino') || lower === 'f' || lower === 'female') {
    return 'Mujer';
  }
  if (lower.includes('hombre') || lower.includes('masculino') || lower === 'm' || lower === 'male') {
    return 'Hombre';
  }
  return 'Otro';
}

export function parseExcelFile(file: File): Promise<ParseResult> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
        
        if (jsonData.length < 2) {
          resolve({
            success: false,
            participants: [],
            errors: ['El archivo está vacío o no tiene datos suficientes'],
          });
          return;
        }
        
        // First row is headers
        const headers = jsonData[0] as string[];
        const columnMap: Record<string, number> = {};
        
        // Map columns to their indices
        headers.forEach((header, index) => {
          if (header) {
            const mapping = findColumnMapping(String(header));
            if (mapping) {
              columnMap[mapping] = index;
            }
          }
        });
        
        // Check required columns
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
        
        // Process data rows
        for (let i = 1; i < jsonData.length; i++) {
          const row = jsonData[i];
          if (!row || row.length === 0) continue;
          
          const name = row[columnMap.name];
          if (!name || String(name).trim() === '') {
            continue; // Skip empty rows
          }
          
          try {
            const participant: Participant = {
              id: generateId(),
              name: String(name).trim(),
              age: columnMap.age !== undefined ? parseAge(row[columnMap.age]) : 0,
              ageRange: columnMap.ageRange !== undefined ? String(row[columnMap.ageRange] || '') : '',
              preferredAgeRange: columnMap.preferredAgeRange !== undefined ? String(row[columnMap.preferredAgeRange] || '') : '',
              preference: columnMap.preference !== undefined ? normalizePreference(String(row[columnMap.preference] || 'Amistad y ligue')) : 'Amistad y ligue',
              gender: columnMap.gender !== undefined ? normalizeGender(String(row[columnMap.gender] || '')) : 'Otro',
            };
            
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
