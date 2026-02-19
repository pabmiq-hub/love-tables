

# Plan: Mejoras en flujo de codigos/check-in y edicion de evento

## Resumen

Hay dos grandes cambios:

1. **Separar el envio de codigos del check-in**: Actualmente, cuando el admin "envia el codigo" a un participante, se llama a `checkin-participant` que genera el codigo Y marca el check-in automaticamente. El nuevo flujo sera: generar y enviar el codigo SIN hacer check-in. Los participantes usaran ese codigo en la pagina `/checkin` (via QR) para confirmar su asistencia ellos mismos. Ademas, al importar Excel o anadir manualmente, se generara y enviara el codigo automaticamente.

2. **Editar configuracion del evento antes de empezarlo**: Anadir una pestana/seccion de "Ajustes" en la pagina del evento (solo cuando esta en estado `pending`) para editar: nombre, fecha, rondas, tamano mesa, duracion de ronda, modo de rotacion, paridad de genero, y preferencias personalizadas.

---

## 1. Nuevo flujo de codigos y check-in

### Situacion actual (problema)

- `handleSendCode` llama a `checkin-participant`, que genera codigo + marca `checked_in = true` + envia email
- `handleToggleCheckin` tambien llama a `checkin-participant`, mismo efecto
- Resultado: enviar codigo = hacer check-in automaticamente. No hay separacion

### Nuevo flujo deseado

```text
+-------------------+     +------------------+     +-------------------+
| Admin anade       | --> | Se genera codigo | --> | Se envia email    |
| participante      |     | de 6 digitos     |     | con codigo        |
| (manual/Excel)    |     | (checked_in=NO)  |     | + link a /checkin |
+-------------------+     +------------------+     +-------------------+
                                                          |
                                                          v
                                                   +-------------------+
                                                   | Participante va   |
                                                   | a /checkin con QR |
                                                   | introduce codigo  |
                                                   +-------------------+
                                                          |
                                                          v
                                                   +-------------------+
                                                   | checked_in = true |
                                                   | (auto en /checkin)|
                                                   +-------------------+
```

### Cambios tecnicos

**A) Nueva edge function: `generate-and-send-code`** (o modificar `checkin-participant`)

Crearemos una nueva funcion que:
- Genera un codigo de 6 digitos unico para el participante
- Guarda el codigo en `verification_code` pero NO cambia `checked_in`
- Envia email con el codigo + enlace a `/event/{id}/checkin?code=XXXXXX`
- Se usara desde el admin al anadir participantes y al importar Excel

**B) Modificar `handleSendCode` en EventDetail.tsx**

- En lugar de llamar a `checkin-participant`, llamara a la nueva funcion `generate-and-send-code`
- NO marcara `checked_in = true`
- Solo genera codigo + envia email

**C) Modificar `handleToggleCheckin` en EventDetail.tsx**

- Check-in manual del admin: seguira llamando a `checkin-participant` pero con `sendEmail: false` (el admin marca la asistencia directamente, sin enviar email)
- El admin puede marcar check-in manualmente si lo necesita

**D) Modificar `handleConfirmExcelImport` en EventDetail.tsx**

- Despues de insertar participantes, generar codigos y enviar emails automaticamente a todos los que tengan email
- NO marcar `checked_in = true`

**E) Modificar `handleAddParticipant` en EventDetail.tsx**

- Despues de insertar, generar codigo y enviar email automaticamente si tiene email
- NO marcar `checked_in = true` (excepto si el evento ya esta activo, mantener la logica actual)

**F) Pagina `/checkin` (ParticipantCheckin.tsx)**

- Funciona correctamente: el participante introduce su codigo, verifica su identidad, y confirma el check-in
- El `checkin-participant` edge function seguira haciendo `checked_in = true` cuando se llama desde esta pagina
- Cambio menor: asegurar que funcione cuando el evento esta en estado `pending` (actualmente ya lo permite)

**G) Modificar `handleSendBulkCodes` en EventDetail.tsx**

- Usar la nueva funcion en lugar de `checkin-participant`
- Solo genera y envia codigos sin cambiar el estado de check-in

**H) Modificar `handleCheckInAll` en EventDetail.tsx**

- Solo marca `checked_in = true` en BD (como ya hace)
- NO enviar codigos automaticamente (ya los habran recibido previamente)

---

## 2. Editar configuracion del evento

### Cambios tecnicos

**Archivo: `src/pages/EventDetail.tsx`**

Anadir una nueva pestana "Ajustes" (icono Settings2) visible solo cuando `eventStatus === "pending"`. Dentro:

- **Nombre del evento**: Input editable
- **Fecha**: Input date editable
- **Numero de rondas**: Input numerico
- **Tamano de mesa**: Input numerico
- **Duracion de ronda** (segundos): Input numerico
- **Modo de rotacion**: Select (fixed_host / all_rotate)
- **Paridad de genero**: Switch
- **Preferencias personalizadas**: Reutilizar `EventPreferencesEditor`

Boton "Guardar cambios" que actualiza todos los campos en la BD.

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/generate-and-send-code/index.ts` | Nueva edge function: genera codigo + envia email sin hacer check-in |
| `supabase/config.toml` | Registrar nueva funcion con `verify_jwt = false` |
| `src/pages/EventDetail.tsx` | Modificar handlers de codigos para separar del check-in; anadir pestana Ajustes; auto-envio tras Excel/manual |
| `src/components/event/EventPreferencesEditor.tsx` | Sin cambios (se reutiliza) |

