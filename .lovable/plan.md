

# Plan: Copiar Evento y Anadir Participante a Evento Activo

## 1. Copiar Evento

Se anadira un boton "Copiar evento" en la cabecera del evento (visible en cualquier estado). Al pulsarlo, aparecera un dialogo con dos opciones:

- **Solo configuracion**: Crea un nuevo evento con el mismo nombre (+ " (copia)"), fecha, rondas, tamano mesa, duracion, modo rotacion, paridad de genero, preferencias personalizadas, modulo, configuracion profesional, cuotas de registro, etc. Sin participantes.
- **Configuracion + participantes**: Lo mismo pero copiando tambien todos los participantes del evento original, reseteando su check-in, codigo de verificacion y selecciones.

Tras crear el evento, se navega automaticamente a la pagina del nuevo evento.

---

## 2. Anadir Participante a Evento Activo (con asignacion a mesas)

Cuando el evento esta activo y ya tiene mesas generadas, al pulsar "Anadir" en la pestana de participantes, se mostrara un dialogo previo con dos secciones:

### A) Rescatar participantes sin check-in
Si hay participantes que fueron eliminados al iniciar el evento (no hicieron check-in), se mostrara una lista de participantes "originales" que no estan actualmente en el evento. El organizador podra seleccionar uno o varios para reincorporarlos. Nota: como actualmente se eliminan de la BD al iniciar, esta opcion solo estara disponible si quedan participantes sin check-in (lo cual solo ocurriria si se anadieron despues de iniciar sin hacer check-in). Como la logica actual los elimina, esta seccion se simplifica a "no hay participantes anteriores disponibles" en la mayoria de casos.

**Alternativa practica**: En lugar de rescatar eliminados (que ya no existen en BD), ofreceremos directamente "Crear nuevo participante" que abrira el modal actual de anadir participante.

### B) Asignacion a mesas
Tras crear/seleccionar el participante, se mostrara un **dialogo de asignacion manual a mesas** donde:

- Se muestran las rondas no completadas (la activa + las futuras)
- Para cada ronda, el organizador puede elegir en que mesa colocar al participante (mostrando el numero de participantes actuales en cada mesa)
- Opcion "Asignacion automatica" que coloca al participante en la mesa con menos personas en cada ronda pendiente
- Las rondas completadas no se tocan

---

## Detalle tecnico

### Archivo: `src/pages/EventDetail.tsx`

**Copiar evento:**
- Anadir estado `showCopyEventDialog` (boolean)
- Importar `useNavigate` de react-router-dom
- Crear funcion `handleCopyEvent(withParticipants: boolean)`:
  1. Insertar nuevo evento con campos clonados del actual (sin `tables`, `status = 'pending'`, `current_round = 0`, `completed_rounds = []`)
  2. Si `withParticipants`, copiar participantes con `checked_in = false`, `verification_code = null`, `selection_submitted_at = null`
  3. Navegar a `/admin/events/{nuevoId}`
- Anadir boton "Copiar" en la barra de acciones (junto a QR, Email, etc.) visible en todos los estados
- Anadir `AlertDialog` con las dos opciones

**Anadir participante a evento activo con asignacion:**
- Anadir estado `showTableAssignmentModal` y `pendingNewParticipant` (DbParticipant | null)
- Modificar `handleAddParticipant` y `handleAddProfessionalParticipant`:
  - Despues de insertar en BD, si el evento esta activo y tiene mesas, abrir el modal de asignacion en lugar de solo mostrar toast
- Crear componente `TableAssignmentModal` (inline o separado) que:
  - Muestra las rondas no completadas con sus mesas
  - Cada mesa muestra numero actual de participantes
  - Permite seleccionar una mesa por cada ronda pendiente
  - Boton "Asignacion automatica" que asigna a la mesa con menos personas
  - Al confirmar, actualiza el JSON de `tables` en la BD y el estado local
- El participante se marca con `checked_in = true` automaticamente (como ya ocurre)

### Nuevo componente: `src/components/event/TableAssignmentModal.tsx`

Modal que recibe:
- `participant`: el participante recien creado
- `tables`: las mesas actuales del evento
- `completedRounds`: rondas ya completadas
- `currentRound`: ronda actual
- `onConfirm(updatedTables)`: callback con las mesas actualizadas
- `onClose()`: cerrar sin asignar

Muestra para cada ronda no completada un selector de mesa con vista previa de quienes estan en cada mesa.

