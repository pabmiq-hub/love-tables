

## Plan: Reestructurar Analítica en pestañas (General / Social / Profesional)

### Problema actual
- Todo en una sola vista monolítica
- Demografía rota: géneros duplicados por idioma (Man/Hombre, Woman/Mujer), rangos de edad duplicados con datos diferentes
- No hay métricas específicas por módulo
- Sin empty states atractivos

### Arquitectura propuesta

Reescribir `DashboardAnalytics.tsx` con 3 pestañas usando `Tabs` de Radix:

**Pestaña "General"** — datos compartidos entre módulos:
- KPIs globales: total eventos, participantes únicos, matches mutuos, tasa de selección, retención, no-show
- Distribución por módulo (pie chart)
- Evolución temporal (participantes por evento + eventos por mes)
- Ranking de eventos (tabla sortable con todos los eventos)
- Insights de marketing (mejor día, asistencia por día de semana)

**Pestaña "Social"** — solo eventos con `module === 'social'`:
- KPIs específicos social (eventos sociales, participantes sociales, matches sociales)
- **Demografía corregida**:
  - Género: normalizar valores equivalentes (`Man` → `Hombre`, `Woman` → `Mujer`, `Non-binary` → `No binario`) antes de agrupar, eliminando duplicados por idioma
  - Edad: recalcular TODOS los rangos desde `birth_date` con bandas fijas (`18-24`, `25-29`, `30-34`, `35-39`, `40-49`, `50+`), ignorando el campo `age_range` que contiene datos inconsistentes de formularios con rangos configurados de forma diferente
- **Nuevas métricas de selección**:
  - Media de selecciones enviadas por participante
  - Media de selecciones recibidas por participante
  - Ratio de coincidencia (matches mutuos / total selecciones)
  - % participantes que enviaron selecciones
- Empty state si no hay eventos sociales: ilustración divertida + "¡Aún no tienes eventos sociales!" + botón "Crear evento social"

**Pestaña "Profesional"** — solo eventos con `module === 'professional'`:
- KPIs: eventos profesionales, empresas participantes, matches B2B
- **Métricas específicas**:
  - Distribución por tipo de entidad (clientes vs proveedores)
  - Sectores más representados (top 5 bar chart)
  - Media de necesidades/soluciones por participante
  - Tasa de compatibilidad sectorial
- Empty state si no hay eventos profesionales: "¡Aún no tienes eventos profesionales!" + botón "Crear evento profesional"

### Cambios en datos (AdminDashboard.tsx)

Ampliar `ParticipantRecord` para incluir campos adicionales necesarios para las nuevas métricas:
- `entity_type`, `sector`, `needs`, `solutions`, `preference`, `name` 

Ampliar la query de `loadAnalyticsData` para traer estos campos adicionales. También cargar `selection_type` en `SelectionRecord`.

### Correcciones técnicas clave

1. **Normalización de género** — mapa de equivalencias:
```typescript
const GENDER_NORMALIZE: Record<string, string> = {
  "man": "Hombre", "hombre": "Hombre",
  "woman": "Mujer", "mujer": "Mujer", 
  "non-binary": "No binario", "no binario": "No binario",
};
// Normalizar: GENDER_NORMALIZE[g.toLowerCase()] || g
```

2. **Rangos de edad** — recalcular siempre desde `birth_date`:
```typescript
// Ignorar age_range almacenado, calcular desde birth_date
const age = calcAge(p.birth_date);
// Asignar a banda fija
```

3. **Empty states** — componente inline con emoji/icono, texto amigable y `Link` a `/admin/events/new`

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/admin/DashboardAnalytics.tsx` | Reescribir con 3 pestañas, corregir demografía, añadir métricas |
| `src/pages/AdminDashboard.tsx` | Ampliar `ParticipantRecord` y `SelectionRecord`, extender query |

