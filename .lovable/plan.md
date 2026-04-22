

# Plan: Modo Lúdico (mesas con dinámicas de juego) — Plan Empresa

## Concepto
Permitir al organizador marcar **un grupo de mesas** (por número) como "mesas de dinámica/juego". Si dos o más mesas comparten **la misma dinámica**, el algoritmo garantiza que **ningún participante repita en ninguna mesa de ese mismo grupo** a lo largo de las rondas (ni en la ronda preliminar). Si hay varias dinámicas distintas, cada una es un grupo independiente.

Ejemplo:
- Dinámica "Trivial" → mesas 1, 2, 3, 4
- Dinámica "Pictionary" → mesas 5, 6
- Mesas 7+ → normales

Un participante que pase por mesa 2 en R1, no podrá ir a las mesas 1, 2, 3 ni 4 en R2/R3/preliminar. Sí podrá ir a la mesa 5 (dinámica distinta).

## A) Activación de la feature (Plan Empresa)

**Nueva feature en BBDD** (vía migración):
- Insertar en `features`: `code = 'game_mode'`, `name = 'Modo lúdico'`, `module = 'social'`, `category = 'gameplay'`.
- Insertar en `plan_features` para el plan **Enterprise** (`is_limited = false`).

El Super Admin podrá activarla/desactivarla por organizador desde `OrganizerFeaturesModal` (sin cambios extra: ya soporta cualquier feature_code).

## B) Configuración en el evento

Nueva sección **"Modo lúdico"** dentro de:
- **Wizard de creación** (`CreateEvent.tsx`) — solo si módulo Social y `hasFeature('game_mode')`.
- **Editor de ajustes del evento** (`EventSettingsEditor.tsx`) — mismo bloque.

Estructura de configuración (almacenada en un nuevo campo JSONB `events.game_mode`):
```jsonc
{
  "enabled": true,
  "dynamics": [
    { "id": "dyn1", "name": "Trivial",    "table_numbers": [1, 2, 3, 4] },
    { "id": "dyn2", "name": "Pictionary", "table_numbers": [5, 6] }
  ]
}
```

UI (componente nuevo `GameModeEditor.tsx`):
1. Toggle "Activar modo lúdico".
2. Botón "+ Añadir dinámica".
3. Por cada dinámica: input nombre + selector múltiple de números de mesa (1..N siendo N el total de mesas estimado según `participants_count / table_size`).
4. Validaciones en tiempo real:
   - Una mesa no puede pertenecer a dos dinámicas.
   - Avisar si el grupo tiene más mesas que rondas posibles → "Con X rondas no podrás llenar todas las mesas sin repetir".

## C) Cambios en el algoritmo (`generateSmartTables` en `EventDetail.tsx`)

Añadir parámetro `gameModeConfig` y nueva estructura de tracking:

```ts
// Mapa: participantId → Set<dynamicId> de dinámicas ya jugadas
const playedDynamics = new Map<string, Set<string>>();
```

En cada asignación de participante a una mesa:
1. Buscar a qué `dynamicId` pertenece la mesa (si pertenece).
2. Si el participante ya jugó esa dinámica → **prohibido** (constraint dura, no negociable).
3. Tras asignar, registrar `playedDynamics.get(pId).add(dynamicId)`.

Reglas adicionales:
- Las mesas con dinámica conservan su `table_size` configurado.
- Si por escasez de participantes no puede completarse el grupo sin violar la regla, marcar la mesa como "Pendiente" y registrar warning visible al admin.

## D) Ronda preliminar (cumplir la misma regla)

`fillPreliminaryTables` (`src/lib/preliminaryRoundAssign.ts`) y la edge function `checkin-participant`:
- Recibir también `game_mode` del evento.
- Antes de colocar al participante en la "última mesa con sitio", saltar las mesas que pertenezcan a una dinámica que el participante **ya tendría programada en otras rondas**.
- Como la asignación oficial puede aún no estar generada, registrar la dinámica jugada en preliminar también dentro de `playedDynamics` que el algoritmo principal leerá luego.

Persistir el log:
```jsonc
events.game_mode.played = {
  "<participantId>": ["dyn1", "dyn2"]
}
```
Esto permite que tanto preliminar (live) como rondas oficiales (batch) compartan estado.

## E) Visualización (panel admin y participante)

**Admin (`EventDetail.tsx` - vista de Mesas):**
- Badge dorado en cabecera de cada mesa con dinámica: `🎲 Trivial`.
- Leyenda lateral con todas las dinámicas y sus mesas.

**Participante (`ParticipantAccess.tsx`):**
- En la tarjeta de cada ronda mostrar el badge `🎲 Trivial` cuando aplique.

## F) Cambios técnicos resumidos

| Archivo | Cambio |
|---|---|
| `supabase/migrations/...` | Añadir feature `game_mode` + `plan_features` (Enterprise) + columna `events.game_mode jsonb` |
| `src/components/event/GameModeEditor.tsx` (nuevo) | UI de configuración de dinámicas |
| `src/pages/CreateEvent.tsx` | Integrar editor en paso "Configuración" (solo Social + feature activa) |
| `src/components/event/EventSettingsEditor.tsx` | Misma integración para editar tras crear |
| `src/pages/EventDetail.tsx` | `generateSmartTables` recibe `gameModeConfig`, aplica restricción, marca mesas con dinámica |
| `src/lib/preliminaryRoundAssign.ts` | Saltar mesas de dinámica ya jugada por el participante |
| `supabase/functions/checkin-participant/index.ts` | Misma lógica replicada server-side |
| `src/pages/ParticipantAccess.tsx` | Badge de dinámica por mesa |
| `src/integrations/supabase/types.ts` | Auto-regenerado tras migración |

## Notas
- Solo módulo Social y plan Empresa (gateado por `hasFeature('game_mode')`).
- Compatible con `group_rounds` (rondas grupales) y `preliminary_round`.
- El log `played` se inicializa vacío en cada generación full y se acumula en preliminar.
- Si el admin reasigna mesas manualmente desde `TableEditorModal`, recalcular `played` desde los `tables` actuales para mantener consistencia.
- Sin impacto en eventos sin la feature activada (campo `game_mode` queda `null`).

