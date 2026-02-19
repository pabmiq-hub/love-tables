
# Plan: Filtrar preferencias de ligue por genero + Revisar envio de emails

## Problema 1: Preferencias de ligue incoherentes con el genero

Actualmente, al seleccionar genero "Mujer" en el formulario de registro, el selector de preferencias de ligue muestra TODAS las opciones, incluyendo "Soy un hombre y busco una mujer". No hay ninguna validacion que filtre las opciones segun el genero seleccionado.

### Solucion

Filtrar dinamicamente las opciones de `DATING_PREFERENCES` segun el genero seleccionado:

| Genero seleccionado | Opciones de ligue mostradas |
|---|---|
| Hombre | Soy un hombre y busco una mujer, Soy un hombre y busco un hombre, Estoy abierto a todo, Prefiero no contestar |
| Mujer | Soy una mujer y busco un hombre, Soy una mujer y busco una mujer, Estoy abierto a todo, Prefiero no contestar |
| No binario / Prefiero no decirlo | No binario, Estoy abierto a todo, Prefiero no contestar |

Ademas, si el usuario cambia de genero despues de haber seleccionado una preferencia de ligue, se resetea la seleccion de ligue para evitar combinaciones invalidas.

**Archivos:** `src/pages/ParticipantJoin.tsx`, `src/components/event/AddParticipantModal.tsx`, `src/components/event/EditParticipantModal.tsx`

---

## Problema 2: Emails no enviados

### Diagnostico

Al revisar la base de datos, los participantes importados via Excel y con check-in masivo (`handleCheckInAll`) tienen `verification_code: null`. Esto se debe a que:

1. **`handleCheckInAll`** hace un `UPDATE participants SET checked_in = true` directo en la base de datos, SIN pasar por la edge function `checkin-participant`. No genera codigos ni envia emails.
2. **`handleSendBulkCodes`** existe para resolver esto: genera codigos y envia emails a participantes con check-in pero sin codigo. Sin embargo, el flujo no esta encadenado automaticamente.
3. **Resend rate limiting**: el plan gratuito de Resend tiene un limite de 100 emails/dia y 2 emails/segundo. Si se envian muchos correos al mismo email repetido en testing, Resend puede silenciosamente descartarlos o marcarlos como suprimidos.

### Solucion

1. **Mejorar `handleCheckInAll`** para que, tras hacer el check-in masivo, lance automaticamente el envio de codigos a los participantes con email (usando `handleSendBulkCodes`).
2. **Mejorar la gestion de errores en el envio de emails**: capturar y mostrar errores de Resend (rate limiting, email suprimido, etc.) para que el organizador sepa que emails fallaron.
3. **Anadir reintento automatico** en `send-checkin-code` y `send-registration-confirmation` para errores 429 (rate limit) de Resend, con backoff de 2 segundos.
4. **Loguear resultados en `email_logs`** desde las edge functions de envio para tener trazabilidad de que emails se enviaron y cuales fallaron.

---

## Detalle tecnico

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/pages/ParticipantJoin.tsx` | Filtrar `eventDatingPreferences` segun el genero seleccionado. Resetear `datingPreference` al cambiar genero. |
| `src/components/event/AddParticipantModal.tsx` | Misma logica de filtrado de preferencias por genero. |
| `src/components/event/EditParticipantModal.tsx` | Misma logica de filtrado de preferencias por genero. |
| `src/pages/EventDetail.tsx` | Modificar `handleCheckInAll` para encadenar el envio masivo de codigos tras el check-in. |
| `supabase/functions/send-checkin-code/index.ts` | Anadir retry con backoff para errores 429, registrar en `email_logs`. |
| `supabase/functions/send-registration-confirmation/index.ts` | Anadir retry con backoff para errores 429, registrar en `email_logs`. |

### Logica de filtrado de preferencias de ligue

```text
function getFilteredDatingPreferences(gender: string, allPrefs: string[]): string[] {
  const genderNorm = gender.toLowerCase();
  return allPrefs.filter(pref => {
    const prefLower = pref.toLowerCase();
    if (prefLower.startsWith("soy un hombre")) return genderNorm === "hombre";
    if (prefLower.startsWith("soy una mujer")) return genderNorm === "mujer";
    if (prefLower === "no binario") return genderNorm === "no binario" || genderNorm === "prefiero no decirlo";
    // "Estoy abierto a todo" y "Prefiero no contestar" siempre visibles
    return true;
  });
}
```

### Logica de retry para Resend

```text
async function sendWithRetry(resend, emailPayload, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const result = await resend.emails.send(emailPayload);
    if (result.error?.statusCode === 429) {
      await new Promise(r => setTimeout(r, 2000 * (attempt + 1)));
      continue;
    }
    return result;
  }
  throw new Error("Rate limit exceeded after retries");
}
```
