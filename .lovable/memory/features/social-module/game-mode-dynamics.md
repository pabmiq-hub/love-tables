---
name: Game Mode (Modo Lúdico) — table dynamics
description: Enterprise-only feature that prevents participants from repeating game-table dynamics across rounds (preliminary + official)
type: feature
---
Modo Lúdico permite agrupar mesas por "dinámica" (juegos como Trivial). Reglas:

- **Gating**: feature `game_mode` solo en plan Enterprise. UI gateada con `hasFeature('game_mode')` y módulo Social.
- **Config**: columna `events.game_mode` JSONB → `{ enabled, dynamics: [{id, name, table_numbers[]}], played: {participantId: [dynId]} }`.
- **Editor**: `src/components/event/GameModeEditor.tsx` (en CreateEvent + EventSettingsEditor).
- **Constraint**: en `generateSmartTables` (EventDetail) y `fillPreliminaryTables` (preliminaryRoundAssign.ts), un participante NO puede sentarse en una mesa cuya dinámica ya jugó. Tracking vía `Map<participantId, Set<dynamicId>>` que se inicializa desde `game_mode.played`.
- **Persistencia**: `playedAfter` (devuelto por el algoritmo) se guarda en `events.game_mode.played` tras `finalizeTableGeneration` y al añadir rondas dinámicas.
- **Edge functions**: `checkin-participant` replica la lógica server-side (auto-asignación preliminar respeta dinámicas + persiste `played`). `get-table-assignments` devuelve `gameMode` (sin `played`) al participante.
- **UI badges**: 🎲 + nombre en cards de mesas (admin: rondas oficiales + preliminar) y en cards de ronda del panel del participante.
- **Helpers**: `src/lib/gameMode.ts` (normalize, getDynamicIdForTable, getDynamicForTable, readPlayedMap, writePlayedMap, validateGameMode).
