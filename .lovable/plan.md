

# Plan: Corregir el sistema de participantes globales y analítica

## Problemas detectados

Tras inspeccionar la base de datos, he encontrado varios problemas graves:

1. **Evento 1 ("Slow Friending Enero '26") tiene 0 participantes vinculados** a `global_participants` — sus 62 participantes nunca fueron enlazados porque el sistema de linking se implementó después.

2. **El contador `events_attended` está completamente inflado** — se incrementa cada vez que se llama `findOrCreateGlobalParticipant` (por ejemplo, al regenerar mesas), en vez de contar eventos reales. Ejemplo: un participante marca `events_attended=21` pero solo aparece en 0 eventos vinculados.

3. **Las queries de `loadStats` no filtran por `organizer_id`** — cuentan participantes de TODOS los organizadores, no solo del actual.

4. **La demografía cuenta participantes duplicados** — un participante que asiste a 3 eventos se cuenta 3 veces en los gráficos de género/edad.

## Plan de corrección

### 1. Migración SQL: Backfill + corregir contadores
- Vincular participantes del evento 1 a `global_participants` haciendo match por email (normalizado a minúsculas).
- Crear nuevos registros en `global_participants` para emails que no existan aún.
- Recalcular `events_attended` para TODOS los global_participants basándose en `COUNT(DISTINCT event_id)` real desde la tabla `participants`.

### 2. Corregir `useGlobalParticipants.ts`
- En `findOrCreateGlobalParticipant`: en vez de incrementar ciegamente el contador, calcular `events_attended` como `COUNT(DISTINCT event_id)` desde `participants` vinculados.
- Evitar que llamadas repetidas (regenerar mesas) inflen el contador.

### 3. Corregir `AdminDashboard.tsx` → `loadStats`
- Filtrar `global_participants` por `organizer_id = user.id`.
- Filtrar `participants` por eventos del organizador actual (join con `events`).
- Filtrar `participant_selections` por eventos del organizador.

### 4. Corregir `DashboardAnalytics.tsx` → demografía
- Deduplicar participantes por `global_participant_id` para las métricas de "únicos".
- Mostrar demografía basada en participantes únicos, no registros por evento.
- Usar la información más reciente (último evento) cuando un participante tenga datos actualizados.

### 5. Corregir `DashboardHome.tsx`
- Aplicar las mismas correcciones de filtrado por organizador en las métricas del home.

## Archivos a modificar
- **SQL migration**: backfill linking + recalcular contadores
- `src/hooks/useGlobalParticipants.ts`: corregir lógica de contador
- `src/pages/AdminDashboard.tsx`: filtrar queries por organizador
- `src/components/admin/DashboardAnalytics.tsx`: deduplicar demografía
- `src/components/admin/DashboardHome.tsx`: ajustar métricas

