

## Ronda Preliminar — Plan completo con confirmación de participación

### Resumen

Implementar el sistema de confirmación para la ronda preliminar, gestión de mesas invalidadas por el admin, y mejoras de transición al inicio del evento. Los participantes confirman si realmente estuvieron en la ronda 0 antes de poder enviar selecciones de esa ronda.

### 1. Modelo de datos ampliado

El campo `preliminary_round` en `events` pasa a tener esta estructura:

```text
{
  enabled: true,
  tables: [[{id, name}, ...], ...],
  started_at: "2026-03-27T...",
  closed_at: "2026-03-27T..." | null,
  confirmations: { "participant-id": true/false },
  dismissed_tables: [1, 3]  // índices de mesas invalidadas
}
```

No requiere migración SQL — es el mismo campo `jsonb` existente. Solo se amplía la estructura del JSON.

### 2. Nuevo edge function: `confirm-preliminary`

- **Endpoint**: `supabase/functions/confirm-preliminary/index.ts`
- **Input**: `{ eventId, verificationCode, confirmed: boolean }`
- **Lógica**:
  1. Valida código de verificación (6 dígitos) y eventId (UUID)
  2. Busca al participante por `verification_code` + `event_id`
  3. Lee `preliminary_round` del evento
  4. Encuentra en qué mesa está el participante
  5. Guarda `confirmations[participantId] = confirmed`
  6. Si `confirmed === false` y **todos** los participantes de esa mesa también dijeron `false`, añade el índice de la mesa a `dismissed_tables`
  7. Actualiza el campo `preliminary_round` en la tabla `events`

### 3. Actualizar `get-table-assignments`

- Filtrar mesas cuyo índice esté en `dismissed_tables` → no devolver esas asignaciones de ronda 0
- Incluir un campo `preliminaryConfirmation` en la respuesta: `true`, `false`, o `null` (no respondido)
- Si `confirmation === false`, no devolver la ronda 0 para ese participante

### 4. Panel del participante (`ParticipantAccess.tsx`)

**Flujo de confirmación:**

```text
Participante accede → carga asignaciones
  ¿Tiene ronda 0?
    NO → panel normal (solo rondas oficiales)
    SÍ → ¿Ya confirmó?
      true  → muestra ronda 0 + oficiales normalmente
      false → oculta ronda 0
      null  → Modal: "¿Participaste en la ronda de bienvenida?"
              [Sí, participé] → llama confirm-preliminary(true), muestra ronda 0
              [No participé]  → llama confirm-preliminary(false), oculta ronda 0
```

- El modal aparece al entrar en la pestaña "Selecciones" por primera vez
- Estado local `preliminaryConfirmed: boolean | null` basado en la respuesta del edge function
- La ronda 0 se muestra/oculta en ambas pestañas (mesas y selecciones)
- Las selecciones de ronda 0 **pueden enviarse más tarde** igual que las rondas oficiales (dentro del plazo de selección del evento)

### 5. Panel del administrador (`EventDetail.tsx`)

**Dialog de transición al iniciar evento:**
- Si `preliminary_round.enabled` y hay mesas creadas, el dialog "Iniciar evento" muestra:
  > "Hay una ronda preliminar activa con X mesas y Y participantes. Al iniciar, la ronda preliminar se cerrará y se generarán las rondas oficiales."
- Al confirmar: guarda `closed_at = now()` en el JSON antes de generar las rondas oficiales

**Gestión de mesas invalidadas en pestaña Mesas:**
- Mesas en `dismissed_tables`: se muestran con estilo gris/tachado + badge "Invalidada"
- Botón "Recuperar mesa" en cada mesa invalidada → elimina el índice de `dismissed_tables` y resetea las confirmaciones negativas de esa mesa
- Mesas activas muestran estado de confirmación: "2/4 confirmados", "Pendiente", etc.

**Badge en lista de participantes:**
- Si un participante tiene mesa preliminar asignada, mostrar badge "En mesa preliminar" junto a su nombre

### 6. Matches (`MatchesDashboard.tsx`)

- Al calcular matches, excluir selecciones donde el `selected_id` pertenece a una mesa en `dismissed_tables` de la ronda 0
- Las selecciones de ronda 0 confirmadas se tratan exactamente igual que las de rondas oficiales

### 7. Archivos a crear/modificar

| Archivo | Acción |
|---|---|
| `supabase/functions/confirm-preliminary/index.ts` | **Crear** — endpoint de confirmación |
| `supabase/config.toml` | Añadir `[functions.confirm-preliminary]` con `verify_jwt = false` |
| `supabase/functions/get-table-assignments/index.ts` | Modificar — filtrar dismissed, incluir campo confirmación |
| `src/pages/ParticipantAccess.tsx` | Modificar — modal de confirmación, lógica de visibilidad ronda 0 |
| `src/pages/EventDetail.tsx` | Modificar — dialog transición, mesas invalidadas, badge participantes, botón recuperar |
| `src/components/event/MatchesDashboard.tsx` | Modificar — excluir selecciones de mesas dismissed |

### 8. Internacionalización

Añadir traducciones en `src/i18n/translations.ts`:
- "¿Participaste en la ronda de bienvenida?" / "Did you participate in the welcome round?"
- "Sí, participé" / "Yes, I did"
- "No participé" / "No, I didn't"
- "Mesa invalidada" / "Table invalidated"
- "Recuperar mesa" / "Recover table"

