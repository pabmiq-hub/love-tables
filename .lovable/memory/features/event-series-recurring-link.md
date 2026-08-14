---
name: Series de eventos recurrentes (enlace compartido)
description: Tabla event_series + events.series_id, enlace /s/:slug (y /o/:slug/s/:slug) que resuelve siempre el evento vigente
type: feature
---

- Tabla `event_series` (organizer_id = auth.uid del organizador, name, slug único). `events.series_id` opcional.
- Enlace compartido reutilizable: `/s/:seriesSlug` y `/o/:organizerSlug/s/:seriesSlug` → `SeriesJoin.tsx` resuelve vía RPC `get_series_current_event(_slug)` (SECURITY DEFINER, ejecutable por `anon`) y renderiza `ParticipantJoin` con `eventIdOverride`.
- Regla clave: la RPC devuelve el evento más próximo con estado `pending`/`active` y no de prueba; el siguiente evento de la serie solo se abre en el enlace cuando el vigente se cierra (status `completed`).
- Admin: `EventSeriesManager.tsx` (usado en CreateEvent paso "Información básica" y en Ajustes del evento) permite crear serie, asociar a serie existente, editar URL compartida, marcar/desmarcar recurrente y añadir varias fechas+horas de calendario para crear de golpe eventos futuros clonando la configuración del evento base (`createSeriesEventsFromBase` en `src/lib/eventSeries.ts`, resetea mesas/rondas/emails/contadores).
