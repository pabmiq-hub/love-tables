

## Ronda Preliminar — Plan de implementación

### Concepto

La **ronda preliminar** es una ronda "0" opcional que el organizador activa antes de iniciar oficialmente el evento. A medida que los participantes hacen check-in, el organizador puede ir creando mesas ad hoc (sin preferencias, puro relleno) para que nadie espere sentado. Cuando el organizador pulsa "Iniciar evento", el algoritmo principal genera las rondas oficiales (1, 2, 3...) con todas las preferencias, ignorando la ronda preliminar en la lógica de no-repetición (o incluyéndola opcionalmente).

Los participantes de la ronda preliminar pueden seleccionar a sus compañeros de mesa igual que en cualquier ronda oficial.

### Modelo de datos

**No se necesitan nuevas tablas.** Se reutiliza la estructura existente:

- **Campo nuevo en `events`**: `preliminary_round jsonb DEFAULT null`
  - Formato: `{ "enabled": true, "tables": [[{id, name}, ...], [...]], "started_at": "..." }`
  - Cuando es `null`, la funcionalidad está desactivada.

Esto separa la ronda preliminar del array principal `tables` (que contiene las rondas oficiales), evitando conflictos con el algoritmo de generación.

### Flujo del organizador (UX)

1. **En la pestaña Ajustes** (`EventSettingsEditor`): nuevo toggle "Ronda preliminar" (solo visible en módulo social, gated por feature `preliminary_round` → plan empresa). Descripción: *"Crea mesas de relleno mientras los participantes llegan, sin tener en cuenta preferencias."*

2. **En la pestaña Participantes** (estado `pending`): cuando la ronda preliminar está habilitada, aparece un botón **"Asignar mesa preliminar"** que agrupa automáticamente a los participantes con check-in que aún no tienen mesa preliminar en grupos del tamaño configurado (`table_size`). El organizador también puede añadir manualmente participantes a mesas preliminares existentes.

3. **En la pestaña Mesas**: se muestra una sección "Ronda Preliminar (Ronda 0)" encima de las rondas oficiales, con las mesas generadas. El organizador puede editarlas.

4. **"Iniciar evento"** sigue funcionando exactamente igual: genera rondas 1..N con el algoritmo de preferencias usando **todos** los participantes con check-in. La ronda preliminar queda como ronda 0 separada.

### Flujo del participante

- **Panel del participante** (`ParticipantAccess`): muestra la ronda preliminar como "Ronda 0" o "Ronda de bienvenida" junto con las demás rondas. Los compañeros de mesa aparecen y son seleccionables (amistad/ligue).
- **Vista de mesas** (`ParticipantTables`): incluye la ronda 0 si existe.

### Cambios técnicos por archivo

| Archivo | Cambio |
|---|---|
| **Migración SQL** | Añadir columna `preliminary_round jsonb DEFAULT null` a `events` |
| **EventSettingsEditor.tsx** | Toggle "Ronda preliminar" con `FeatureGate` para plan empresa |
| **EventDetail.tsx** | (1) Botón "Asignar mesa preliminar" que agrupa checked-in sin mesa en grupos aleatorios y guarda en `preliminary_round.tables`. (2) Mostrar ronda 0 en pestaña Mesas. (3) Al iniciar evento, la ronda preliminar no se toca. |
| **ParticipantAccess.tsx** | Leer `preliminary_round` del evento y mostrar ronda 0 con sus compañeros seleccionables |
| **ParticipantTables.tsx** | Incluir ronda 0 en las asignaciones de mesa |
| **ParticipantSelect.tsx** | Incluir compañeros de ronda 0 en la lista de selecciones |
| **MatchesDashboard.tsx** | Considerar selecciones de ronda 0 en los matches |
| **features (seed)** | Insertar feature `preliminary_round` vinculada al plan empresa |

### Ventajas de este enfoque

- **No rompe nada**: la ronda preliminar vive en un campo separado (`preliminary_round`), el array `tables` y el algoritmo principal no se modifican.
- **Intuitivo**: el organizador ve claramente "Ronda 0 (preliminar)" vs "Rondas oficiales 1-N".
- **Compatible con selecciones**: los participantes pueden seleccionar a compañeros de la ronda preliminar como en cualquier otra ronda.
- **Feature-gated**: solo disponible para plan empresa vía `FeatureGate`.

