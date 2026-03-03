

# Plan: Analítica avanzada del panel de administración

## Situación actual

La sección de Analítica (`DashboardAnalytics`) muestra solo 4 tarjetas con métricas básicas (recurrentes, media por evento, completados/activos, tasa de selección). No hay gráficos, ni desglose por tipo de evento, ni análisis individual por evento.

## Diseño propuesto

Reorganizar la pantalla en secciones diferenciadas con gráficos (recharts, ya instalado) y tablas comparativas:

### Sección 1: Resumen general (KPIs mejorados)
- 6 tarjetas: Total eventos, Participantes únicos, Conexiones totales, Tasa de selección, Participantes recurrentes, Media por evento
- Indicadores visuales con iconos y colores

### Sección 2: Análisis por tipo de evento
- Gráfico circular (PieChart): distribución de eventos por módulo (social, dating, professional)
- Gráfico de barras: participantes promedio por tipo de módulo
- Tarjetas comparativas: tasa de selección por tipo, conexiones por tipo

### Sección 3: Evolución temporal
- Gráfico de líneas (LineChart): evolución de participantes a lo largo del tiempo (por fecha de evento)
- Gráfico de barras apiladas: eventos creados por mes con desglose por estado

### Sección 4: Ranking de eventos
- Tabla con todos los eventos ordenables, mostrando:
  - Nombre, fecha, módulo, participantes, estado
  - Tasa de selección individual (requiere query adicional)
  - Conexiones/matches generados (requiere query adicional)
- Indicadores de rendimiento (badge verde/amarillo/rojo según métricas)

### Sección 5: Insights de marketing
- Mejor día de la semana para eventos (basado en participación)
- Tamaño óptimo de evento (correlación participantes vs. tasa de selección)
- Tasa de no-show promedio
- Retención de participantes (% que repiten)

## Cambios técnicos

### 1. `AdminDashboard.tsx`
- Ampliar `loadStats` para cargar datos adicionales por evento: selecciones, participantes por evento, encounters
- Pasar datos enriquecidos a `DashboardAnalytics`

### 2. `DashboardAnalytics.tsx` (reescritura completa)
- Importar componentes de recharts (PieChart, BarChart, LineChart, ResponsiveContainer, etc.)
- Calcular todas las métricas derivadas con `useMemo`
- Organizar en secciones con cards y gráficos
- Usar los mismos patrones de estilo que `EventAnalytics.tsx` (que ya tiene gráficos bien implementados)

### 3. Queries adicionales en `AdminDashboard.tsx`
- Cargar `participants` con `selection_submitted_at` para calcular tasas por evento
- Cargar `participant_selections` agrupadas por evento
- Cargar `participant_encounters` agrupadas por evento
- Todo filtrado por el `organizer_id` del usuario (RLS ya lo cubre)

### Datos disponibles sin cambios en BD
- Eventos: nombre, fecha, estado, módulo, participantes_count
- `global_participants`: recurrentes (events_attended > 1)
- `participant_encounters`: conexiones por evento
- `participants`: selecciones enviadas por evento
- `participant_selections`: selecciones por evento

No se requieren migraciones de base de datos.

