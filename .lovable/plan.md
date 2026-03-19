

## Diagnóstico del problema del Banquillo

**Hallazgo clave**: El código actual del banquillo es correcto — filtra participantes con `checked_in = false` y muestra botones "Incorporar" y "Eliminar". Sin embargo, para el evento Slow Friending, los 23 participantes no-show **ya no existen** en la base de datos (solo quedan 60, todos con `checked_in = true`).

**Causa probable**: Es muy posible que en una versión anterior del código, al iniciar el evento se eliminaban los participantes sin check-in en lugar de preservarlos. El comentario actual dice "Keep non-checked-in participants as bench (don't delete them)", lo que sugiere que esto se cambió después. El evento Slow Friending se inició con la versión anterior que sí los eliminaba.

**Estadística del evento**: `original_participants_count = 83`, `participants_count = 60` → los 23 no-shows se calculan por diferencia, pero los registros ya no están en la tabla `participants`.

---

## Plan de mejora para evitar que esto vuelva a pasar

### 1. Verificar que `finalizeTableGeneration` NO elimina participantes sin check-in
El código actual ya preserva los participantes. No se necesita cambio aquí — **confirmado correcto**.

### 2. Proteger el botón "Eliminar" en el banquillo
Actualmente el botón de eliminar en el bench llama a `handleDeleteParticipant` que borra permanentemente el registro. Cambiar esto para que:
- Muestre un `AlertDialog` de confirmación antes de eliminar
- El mensaje advierta que se perderá la posibilidad de incorporar al participante

### 3. Hacer visible el banquillo incluso sin registros individuales (fallback)
Si `original_participants_count > participants_count` pero no hay participantes con `checked_in = false`, mostrar una nota informativa indicando cuántos no-shows hubo (calculado por diferencia), para que el dato no se pierda visualmente en la pestaña de participantes.

### 4. Añadir botón "Incorporar" también en estado `completed`
Actualmente el botón "Incorporar" solo aparece cuando `eventStatus === "active"`. Cambiarlo para que también aparezca en `completed`, ya que puede haber situaciones donde se necesite rescatar participantes después de cerrar el evento.

---

### Archivos a modificar
- **`src/pages/EventDetail.tsx`**: 
  - Añadir `AlertDialog` al botón eliminar del bench
  - Mostrar fallback informativo cuando no hay bench pero sí hay no-shows por diferencia
  - Habilitar "Incorporar" en estado `completed`

