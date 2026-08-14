# Edición de respuestas del juego «¿Quién es quién?» en participantes

## Objetivo
Permitir que los organizadores vean y editen las respuestas del juego social de un participante directamente desde el modal **Editar participante** en el detalle del evento. Esto es necesario para los asistentes que se registraron antes de activar el juego y aún no tienen `game_answers`.

## Alcance
- Solo cambios en frontend: `EditParticipantModal.tsx` y `EventDetail.tsx`.
- No se requieren cambios de base de datos ni Edge Functions: el campo `game_answers` ya existe en `public.participants`.

## Cambios planeados

### 1. Extender `EditParticipantModal.tsx`

**Props e interfaces**
- Añadir `game_answers?: Record<string, unknown> | null` a la interfaz `ParticipantData` interna del modal.
- Añadir dos nuevas props:
  - `socialGameEnabled?: boolean`
  - `socialGame?: unknown` (la configuración JSONB del evento)

**Estado**
- Crear estado `gameAnswers: SocialGameAnswers` precargado con las respuestas existentes de `participant.game_answers` (mapeadas por id de pregunta y convertidas a texto), de modo que quien ya contestó vea sus respuestas actuales en los campos y pueda corregirlas.
- Si el participante tiene respuestas con ids que ya no están en la configuración actual del evento, mostrarlas también como filas de solo lectura para no perder información.
- Usar `normalizeSocialGame(socialGame)` para obtener la lista de preguntas activas del evento.

**UI**
- Renderizar un nuevo bloque colapsable/sección debajo de Wrapped (cuando el evento social tenga el juego habilitado y no sea profesional).
- Reutilizar el componente existente `SocialGameForm` para mostrar los campos de texto de cada pregunta.
- Mostrar un mensaje informativo si el participante aún no tiene respuestas: "Este participante se registró antes de activar el juego. Puedes completar las respuestas aquí."

**Guardado**
- Incluir `game_answers: gameAnswers` en el objeto `updateData` que se envía a Supabase en `participants.update`.
- Devolver `game_answers` actualizadas en el objeto que se pasa a `onSave` para que la lista se refresque sin recargar.

### 2. Actualizar `EventDetail.tsx`

**Paso de configuración al modal**
- Importar `isSocialGameEnabled` desde `@/lib/socialGame`.
- Pasar al `EditParticipantModal`:
  - `socialGameEnabled={isSocialGameEnabled(eventData?.social_game)}`
  - `socialGame={eventData?.social_game}`

**Actualización de estado**
- Verificar que `DbParticipant` incluya `game_answers` en su interfaz (debe existir ya que se usa en `ParticipantDetailModal`).
- `handleUpdateParticipant` ya fusiona el objeto actualizado con el participante existente, por lo que las respuestas del juego se reflejarán automáticamente en la lista.

## Validaciones y límites
- Respetar `SOCIAL_GAME_MAX_LENGTH` (140 caracteres) por respuesta, ya implementado en `SocialGameForm`.
- No mostrar el bloque de edición del juego en eventos profesionales.
- No mostrar el bloque si el evento no tiene el juego habilitado.

## Resultado esperado
Al abrir **Editar participante** desde la lista de asistentes de un evento social con juego activado, el organizador verá una sección "Juego ¿Quién es quién?" con campos editables para cada pregunta. Al guardar, las respuestas se almacenan en `participants.game_answers` y se muestran en la previsualización del participante.
