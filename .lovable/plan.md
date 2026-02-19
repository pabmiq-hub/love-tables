
# Fix: Envio de codigos para participantes ya checked-in sin codigo

## Problema raiz

Los participantes fueron checked-in de forma masiva (actualizacion directa en la base de datos), lo que les dejo con `checked_in = true` pero `verification_code = null`. Cuando se intenta enviar el codigo:

1. El cliente ve que `verification_code` es null, asi que llama a `checkin-participant`
2. `checkin-participant` detecta que ya tiene check-in y devuelve error 400 inmediatamente, **sin generar el codigo que falta**
3. El cliente recibe un error y muestra "No se pudo enviar el codigo"

## Solucion

Modificar la edge function `checkin-participant` para que, cuando un participante ya tiene check-in pero NO tiene codigo de verificacion, **genere el codigo** y lo devuelva en lugar de simplemente rechazar la peticion.

## Detalle tecnico

### Archivo: `supabase/functions/checkin-participant/index.ts`

En el bloque que maneja `participant.checked_in` (alrededor de la linea que devuelve "Ya has realizado el check-in"), cambiar la logica para:

```text
SI participant.checked_in Y participant.verification_code EXISTE:
  -> Devolver el codigo existente (sin error, o con flag alreadyCheckedIn)

SI participant.checked_in Y verification_code ES NULL:
  -> Generar un nuevo codigo con generateUniqueCode()
  -> Actualizar el participante en la base de datos
  -> Enviar email si sendEmail = true
  -> Devolver el codigo nuevo
```

Esto cubre tanto el caso de reenvio (ya tiene codigo) como el de generacion tardía (check-in masivo sin codigo).

### Archivo: `src/pages/EventDetail.tsx`

Ajustar `handleSendCode` para manejar correctamente la respuesta del caso "already checked in + code generated":
- Cuando `checkin-participant` devuelve un participante con `alreadyCheckedIn: true` y un `verificationCode`, actualizar el estado local y mostrar un toast de exito en lugar de error.
