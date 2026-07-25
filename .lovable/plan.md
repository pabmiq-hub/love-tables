## Diagnóstico

En `event_waitlist` ninguna fila tiene `wrapped_answers` (0/19). El culpable es una rama del envío final en `src/pages/ParticipantJoin.tsx` (handleSubmit, líneas 588‑641): cuando `quotasEnabled` y la cuota se detecta llena justo antes de enviar, se invoca `register-participant` con un body reducido que **omite `wrappedAnswers` y `spokenLanguages`** y usa `forceWaitlist: true`. Ese es el camino por el que entró Mireia Muñoz — su fila de lista de espera se guardó sin respuestas Wrapped, así que al promoverla desde la lista de espera no había nada que transferir y su participante quedó sin `wrapped_profile_id`.

El resto del flujo ya funciona:
- La rama "quota full" detectada en `handleWizardContinue` sí lleva al paso 2 (`setWizardForceWaitlist(true); setWizardStep(2)`), y el formulario Wrapped se renderiza porque `showStep2` depende de `wizardStep===2` (no de `showWaitlistMode`).
- El envío "normal" (línea 646) sí pasa `wrappedAnswers`.
- La Edge Function `register-participant` ya persiste `wrapped_answers` en `event_waitlist` (línea 547).
- La promoción en `EventDetail.tsx` ya reenvía `entry.wrapped_answers` a `register-participant`, que crea el `wrapped_profile` y enlaza al participante.

## Cambios

### 1. `src/pages/ParticipantJoin.tsx` — completar el body de la rama "cuota llena al enviar"
En el bloque de líneas ~588‑641 (dentro de `handleSubmit`, cuando `quotasEnabled` detecta la cuota llena y hay waitlist habilitada):
- Añadir al body de `supabase.functions.invoke('register-participant', ...)`:
  - `wrappedAnswers: wrappedEnabled && !hasWrappedProfile ? wrappedAnswers : undefined`
  - `spokenLanguages: languagesEnabled ? spokenLanguages : undefined`
- Antes de disparar ese invoke, ejecutar la misma validación de respuestas Wrapped obligatorias que hoy hace la rama principal (líneas 521‑541): si `wrappedEnabled && !hasWrappedProfile`, exigir que todas las preguntas `required` estén respondidas; si faltan, mostrar toast y abortar. Así una persona que caiga en waitlist por cuota completa nunca escapa sin completar Wrapped.

### 2. Backfill Mireia Muñoz
Ya existe (trabajo previo) la posibilidad de editar Wrapped desde `EditParticipantModal`. No hace falta código nuevo: informar al usuario que puede abrir el perfil de Mireia y completar sus intereses desde ese modal para que aparezca en Compatibilidad.

## No cambia
- La Edge Function `register-participant` (ya guarda `wrapped_answers` en waitlist y crea el `wrapped_profile` al promover).
- La lógica de promoción en `EventDetail.tsx` (ya reenvía `entry.wrapped_answers`).
- La UI del wizard, el formulario Wrapped ni el algoritmo de compatibilidad.

## Verificación
- Con cuota disponible al abrir el formulario pero llena al enviar → probar que ahora el toast bloquea si faltan respuestas Wrapped y, tras completarlas, la fila de `event_waitlist` queda con `wrapped_answers` no nulo.
- Promover a esa persona → el participante resultante debe tener `wrapped_profile_id` y aparecer en la pestaña Compatibilidad.
