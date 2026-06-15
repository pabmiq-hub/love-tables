## Resumen

Añadir "Flechazo" como nueva acción dirigida (1 por participante por evento) que coexiste con Super Like. Aceptación bilateral, intercambio de datos de contacto por email y, si quedan rondas, materialización como inclusión obligatoria para la siguiente ronda generada. Además, reorganizar el panel de comunicaciones en bloques desplegables.

## 1. Base de datos

Nueva tabla `crush_requests` (migration):

- `requester_id`, `target_id` → `participants(id)`
- `event_id` → `events(id)`
- `status`: `pending | accepted | declined`
- `created_at`, `responded_at`
- Unicidad: `(event_id, requester_id)` para forzar 1 flechazo por participante por evento.
- RLS: solo el organizador puede leer/escribir (las acciones de participantes pasarán por edge functions con service role, como el resto del flujo público).
- GRANT a `authenticated` y `service_role`.

En `events` añadir flag JSON dentro de `settings` (o columna boolean nueva `crush_enabled`) para habilitar/deshabilitar.

## 2. Edge Functions

- `request-crush`: valida código OTP del solicitante, crea registro `pending`, envía email al destinatario con enlace de respuesta (HMAC token).
- `respond-crush`: token firmado → marca `accepted` o `declined`. Si `accepted`:
  1. Envía email recíproco a ambos con **nombre completo + email**.
  2. Inserta una entrada en `participant_inclusions` (mismo patrón que "Repetir") para que el próximo `generate-tables` los coloque en la misma mesa.
  3. Si los participantes ya tienen un match recíproco, también se registra como `mutuo`.
- Usar el mismo sistema de rate limit (350ms Resend) y `email_logs`.

## 3. Plantillas de email (personalizables)

Tres plantillas nuevas en `CommunicationSettingsEditor` / `templates`:

- `crush_request` → al destinatario ("Alguien te ha enviado un flechazo")
- `crush_declined` → al solicitante (opcional, configurable)
- `crush_mutual` → a ambos con datos de contacto

Variables: `{{requesterName}}`, `{{targetName}}`, `{{contactEmail}}`, `{{eventName}}`, `{{responseUrl}}`.

Página pública `/crush/:token` para aceptar/rechazar (similar a `/repeat/:token`).

## 4. Panel de participante

En `ParticipantSelect` (sección selecciones), añadir botón "💘 Flechazo" junto al Super Like en cada tarjeta, con:
- Confirmación previa (1 uso por evento).
- Disabled si ya envió o si el evento tiene `crush_enabled=false`.
- Estado visible: "Enviado · Pendiente / Aceptado / Rechazado".

## 5. Panel administrador

### Ajustes del evento
- Toggle `Habilitar Flechazo` (sección Funcionalidades).

### Pestaña Eventos (EventsViewer)
- Nueva sección "Flechazos" con tabla: De → Para, Estado (Pendiente/Aceptado/Rechazado), Mesa asignada en próxima ronda (si aplica).

## 6. Reorganización de Comunicaciones (UX)

Agrupar los chips actuales en bloques `Accordion` desplegables:

- **Inscripción y acceso**: Confirmación, Código de acceso, Recordatorio
- **Durante el evento**: Recordatorio de selecciones, Super Like
- **Post-evento**: Resultados, No-show
- **Repetir**: recibido, aceptada, rechazada
- **Flechazo**: solicitud, rechazado, mutuo (nuevo bloque)
- **Pagos**: Recordatorio pago

Misma lógica de edición, solo cambia el contenedor visual.

## 7. Retroactividad

Aplicar a todos los eventos existentes: `crush_enabled` por defecto `false` (opt-in del organizador). La tabla y las plantillas estarán disponibles para cualquier evento al activar el toggle.

## Detalles técnicos

- Tabla `crush_requests` con índices en `(event_id, status)` y `(target_id, status)`.
- HMAC con `SUPABASE_SERVICE_ROLE_KEY` (mismo patrón que `handle-participant-cancellation` y `respond-repeat`).
- La inclusión se crea con `priority='crush'` para distinguirla en analytics y exclusiones.
- Si no quedan rondas por generar, el email lo indica explícitamente ("os habéis perdido el match en mesa, pero aquí tenéis vuestros contactos").
- `submit-selections` y `generate-tables` no requieren cambios — leen inclusions existentes.

## Archivos afectados

**Nuevos:**
- `supabase/migrations/<ts>_crush_system.sql`
- `supabase/functions/request-crush/index.ts`
- `supabase/functions/respond-crush/index.ts`
- `src/pages/CrushResponse.tsx`
- `src/components/event/CommunicationGroups.tsx` (wrapper accordion)

**Editados:**
- `src/components/event/CommunicationSettingsEditor.tsx` (agrupación + 3 plantillas nuevas)
- `src/components/event/communication/types.ts` y `normalizeTemplates.ts`
- `src/components/event/EventSettingsEditor.tsx` (toggle)
- `src/components/event/EventsViewer.tsx` (sección Flechazos)
- `src/pages/ParticipantSelect.tsx` (botón + estado)
- `src/pages/EventDetail.tsx` (fetch crush_requests)
- `src/App.tsx` (ruta `/crush/:token`)
