

# Plan: Permitir asignar a mesas un participante existente no asignado

## Problema detectado

El participante "Testeando" fue anadido al evento activo pero no se confirmo la asignacion a mesas (se cerro el modal sin pulsar "Confirmar asignacion"). El participante existe en la base de datos con check-in pero no aparece en el JSON de mesas. Actualmente no hay forma de volver a abrir el modal de asignacion para un participante ya existente.

## Solucion

Anadir un boton "Asignar a mesas" en el modal de detalle del participante (ParticipantDetailModal) cuando se detecte que el participante no esta en ninguna mesa y el evento esta activo. Ademas, permitir desde la lista de participantes reasignar a mesas.

### Cambios necesarios

**1. `src/components/event/ParticipantDetailModal.tsx`**

- Anadir prop `eventStatus` y `onAssignToTables` (callback opcional)
- En la pestana "Mesas", cuando `participantTables.length === 0` y `eventStatus === "active"`, mostrar un boton "Asignar a mesas" junto al mensaje "No hay mesas asignadas"
- Al pulsar el boton, se llama `onAssignToTables(participant)` que reabrira el `TableAssignmentModal`

**2. `src/pages/EventDetail.tsx`**

- Pasar las nuevas props al `ParticipantDetailModal`: `eventStatus` y `onAssignToTables`
- En el callback `onAssignToTables`, cerrar el modal de detalle, establecer `pendingNewParticipant` con los datos del participante y abrir `showTableAssignmentModal`

### Resumen de archivos a modificar

| Archivo | Cambio |
|---|---|
| `src/components/event/ParticipantDetailModal.tsx` | Anadir boton "Asignar a mesas" cuando no tiene mesas y evento activo |
| `src/pages/EventDetail.tsx` | Pasar props nuevas y manejar callback para reabrir el modal de asignacion |

