

# Mejora de privacidad en el panel del participante

## Problema actual

Cuando un participante accede a su panel (`/access`), el sistema:
1. **`get-table-assignments`** devuelve los nombres completos de los companeros de mesa (ej. "Maria Garcia Lopez")
2. **`get-event-participants`** con `type='select'` devuelve **TODOS** los participantes del evento, no solo los companeros de mesa -- esto es un problema de privacidad importante

## Solucion propuesta

### 1. Edge Function `get-table-assignments` -- Anonimizar nombres de companeros

Modificar la respuesta para que los tablemates solo incluyan **nombre + primera letra del apellido** (ej. "Maria G.") en lugar del nombre completo.

```text
Antes:  { id: "...", name: "Maria Garcia Lopez" }
Despues: { id: "...", name: "Maria G." }
```

Se aplicara la logica de anonimizacion directamente en el servidor, antes de enviar los datos al cliente.

### 2. Eliminar la llamada a `get-event-participants` tipo `select` desde el panel

Actualmente, `ParticipantAccess.tsx` hace dos llamadas al confirmar identidad:
- `get-table-assignments` (mesas)
- `get-event-participants` tipo `select` (TODOS los participantes)

La segunda llamada es innecesaria y un riesgo de privacidad. Toda la informacion necesaria para las selecciones (companeros de mesa, ronda, mesa) ya viene de `get-table-assignments`.

**Cambios:**
- Ampliar `get-table-assignments` para incluir tambien las selecciones previas del participante (`participant_selections`) y la preferencia del participante autenticado, de modo que el panel tenga toda la informacion para mostrar las selecciones agrupadas por ronda.
- Eliminar la llamada a `get-event-participants` tipo `select` desde `ParticipantAccess.tsx`.
- Construir las opciones de seleccion unicamente con los datos de tablemates (ya anonimizados).

### 3. Confirmar opciones de check-in

Actualmente existen dos vias de check-in:
- **Administrador**: desde el dashboard del evento (individual o masivo)
- **Participante**: desde `/event/{id}/checkin` con su codigo de verificacion

Ambas vias funcionan correctamente y no requieren cambios.

---

## Detalle tecnico

### Archivos a modificar

| Archivo | Cambio |
|---|---|
| `supabase/functions/get-table-assignments/index.ts` | Anonimizar nombres de tablemates (nombre + inicial apellido). Anadir consulta de `participant_selections` y preferencias para devolver datos de seleccion junto con las mesas. |
| `src/pages/ParticipantAccess.tsx` | Eliminar la llamada a `get-event-participants` tipo `select`. Usar unicamente los datos de `get-table-assignments` para construir tanto la vista de mesas como la de selecciones. |

### Estructura de respuesta actualizada de `get-table-assignments`

```text
{
  participantName: "Maria G.",
  participantPreference: "amistad",
  assignments: [
    {
      round: 1,
      table: 3,
      tablemates: [
        { id: "uuid", name: "Juan P.", preference: "amistad_y_sentimental" }
      ]
    }
  ],
  existingSelections: [
    { selected_id: "uuid", selection_type: "friendship" }
  ],
  currentRound: 2,
  totalRounds: 4
}
```

De esta forma, ningun dato mas alla del nombre anonimizado y la preferencia de los companeros de mesa sale del servidor, y no se expone informacion de participantes que no estuvieron en la misma mesa.

