

## Plan: Sesión persistente del participante y navegación "Volver"

### Problema 1: No hay persistencia de sesión
Cada vez que el participante recarga la página o navega, pierde su estado y tiene que volver a introducir el código de 6 dígitos. Todo el estado vive en `useState`.

### Problema 2: "Volver" lleva a la landing
Todos los `<Link to="/">` envían al participante a la página principal en vez de a la pantalla de introducción de código (`/event/{id}/access`).

---

### Solución

#### 1. Persistir sesión en `localStorage`

Al verificar el código exitosamente (`handleConfirmIdentity`), guardar en `localStorage`:
```
participant_session_{eventId} = { participantId, name, email, verificationCode, timestamp }
```

Al cargar `ParticipantAccess`, comprobar si existe una sesión guardada para ese `eventId`:
- Si existe y no ha expirado (comparar `timestamp` con la fecha del evento + 1 hora extra), saltar directamente al paso `panel` re-ejecutando `handleConfirmIdentity` con el código guardado.
- Si ha expirado, limpiar `localStorage` y mostrar `verify_code`.

Al llegar al paso `expired` o `done`, limpiar la sesión de `localStorage`.

**Archivo**: `src/pages/ParticipantAccess.tsx`

#### 2. Corregir enlaces "Volver"

Cambiar todos los `<Link to="/">` dentro de `ParticipantAccess.tsx` por `<Link to={/event/${eventId}/access}>` para que el participante vuelva a la pantalla de código (o directamente al panel si tiene sesión activa).

Esto afecta a: el enlace superior con `ArrowLeft`, y los botones "Volver" en los estados `not_started`, `expired`, `error` y `done`.

**Archivo**: `src/pages/ParticipantAccess.tsx`

#### 3. Mismo tratamiento en `ParticipantTables.tsx`

Revisar si tiene enlaces similares a `/` y corregirlos para mantener consistencia.

---

### Archivos a modificar
1. `src/pages/ParticipantAccess.tsx` — localStorage session + fix links
2. `src/pages/ParticipantTables.tsx` — fix back links si aplica

