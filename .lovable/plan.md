

# Plan: Rediseño del Dashboard Home

## Situación actual
La pantalla de inicio muestra 3 tarjetas KPI estáticas y una lista de eventos recientes. Es funcional pero plana y poco atractiva.

## Propuesta de rediseño

### 1. Saludo personalizado con contexto
- Mensaje de bienvenida dinámico con nombre de la empresa y hora del día ("Buenos días, [Company]")
- Frase motivacional con resumen rápido: "Tienes X eventos activos y X participantes esperando"

### 2. KPIs con mini-gráficos (sparklines)
- Mantener las 3 métricas actuales + añadir "Tasa de selección" y "Participantes recurrentes"
- Cada tarjeta incluye un mini-gráfico de tendencia (últimos eventos) usando recharts `<AreaChart>` en miniatura
- Indicador de variación (flecha arriba/abajo con %) comparando con el evento anterior

### 3. Próximo evento destacado (hero card)
- Card grande con el próximo evento pendiente/activo
- Muestra cuenta atrás ("en 3 días"), participantes registrados, y barra de progreso hacia el límite
- Botón de acción directa: "Gestionar evento"
- Si no hay próximo evento: CTA ilustrativo para crear uno

### 4. Actividad reciente (timeline)
- Reemplazar la lista plana de eventos por un feed de actividad visual
- Últimas acciones: "Nuevo participante registrado", "Evento completado", "X conexiones generadas"
- Formato timeline con iconos y timestamps relativos

### 5. Distribución rápida por módulo
- Mini donut chart mostrando proporción de eventos social/dating/professional
- Clickeable para ir a Analítica filtrada

### 6. Eventos recientes mejorados
- Cards más visuales con barra de progreso de participación
- Indicador de rendimiento (emoji/icono según tasa de selección)

## Cambios técnicos

### `DashboardHome.tsx` (reescritura)
- Importar recharts (`AreaChart`, `Area`, `ResponsiveContainer`, `PieChart`)
- Importar `Progress` de UI components
- Calcular métricas derivadas con `useMemo`: sparkline data, próximo evento, distribución por módulo
- Layout: greeting → hero card → KPIs con sparklines → distribución módulo + actividad reciente → eventos recientes

### `AdminDashboard.tsx`
- Ampliar props pasados a `DashboardHome`: añadir `participants`, `encounters`, `selections`, `organizer`
- DashboardHome ya recibe `stats` con `returningParticipants` y `selectionRate`

### Sin migraciones de BD
- Todos los datos necesarios ya están disponibles en las queries existentes

