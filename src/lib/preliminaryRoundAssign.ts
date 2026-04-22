/**
 * Helper to assign participants to preliminary round (Round 0) tables.
 * Mirrors the logic in supabase/functions/checkin-participant/index.ts
 * so direct DB check-ins (test mode, manual toggle, bulk Excel, etc.)
 * also populate preliminary tables consistently.
 *
 * Honours Modo Lúdico (game_mode): a participant will not be placed in a
 * preliminary table that belongs to a dynamic they have already played.
 */
import { supabase } from "@/integrations/supabase/client";
import {
  GameModeConfig,
  getDynamicIdForTable,
  normalizeGameMode,
  rebuildPlayedFromTables,
} from "@/lib/gameMode";

export interface PreliminaryParticipant {
  id: string;
  name: string;
}

export interface PreliminaryRoundData {
  enabled?: boolean;
  tables?: PreliminaryParticipant[][];
  dismissed_tables?: number[];
  started_at?: string | null;
  [key: string]: any;
}

/**
 * Assigns one or many participants to preliminary tables in memory,
 * respecting table_size, dismissed_tables and game_mode dynamics.
 * Returns { prelim, gameMode } — both may be persisted by the caller.
 */
export function fillPreliminaryTables(
  prelim: PreliminaryRoundData,
  newParticipants: PreliminaryParticipant[],
  tableSize: number,
  gameMode: GameModeConfig | null = null
): PreliminaryRoundData {
  const tables: PreliminaryParticipant[][] = Array.isArray(prelim.tables)
    ? prelim.tables.map((t) => [...t])
    : [];
  const dismissed: number[] = Array.isArray(prelim.dismissed_tables)
    ? prelim.dismissed_tables
    : [];

  // Track played dynamics live so we can persist them on the event
  const played: Record<string, string[]> =
    gameMode?.played && typeof gameMode.played === "object" ? { ...gameMode.played } : {};

  const hasPlayed = (pid: string, dynId: string) =>
    Array.isArray(played[pid]) && played[pid].includes(dynId);

  for (const p of newParticipants) {
    // Skip if already in any table
    const alreadyAssigned = tables.some((t) => t.some((x) => x.id === p.id));
    if (alreadyAssigned) continue;

    // Find last non-dismissed table with free seat that the participant
    // can join without repeating a dynamic.
    let placed = false;
    for (let i = tables.length - 1; i >= 0; i--) {
      if (dismissed.includes(i)) continue;
      if (tables[i].length >= tableSize) continue;
      const tableNumber = i + 1;
      const dynId = getDynamicIdForTable(gameMode, tableNumber);
      if (dynId && hasPlayed(p.id, dynId)) continue;
      tables[i].push({ id: p.id, name: p.name });
      if (dynId) {
        played[p.id] = [...(played[p.id] || []), dynId];
      }
      placed = true;
      break;
    }
    if (!placed) {
      // Create a new trailing table; new tables never have a dynamic by default
      // (dynamics are admin-defined per table number).
      tables.push([{ id: p.id, name: p.name }]);
      const newTableNumber = tables.length;
      const dynId = getDynamicIdForTable(gameMode, newTableNumber);
      if (dynId) {
        played[p.id] = [...(played[p.id] || []), dynId];
      }
    }
  }

  return {
    ...prelim,
    tables,
    started_at: prelim.started_at || new Date().toISOString(),
    // Stash the updated played map so the caller can persist it onto game_mode
    __updated_played: played,
  } as PreliminaryRoundData;
}

/**
 * Loads the event's preliminary_round + table_size + module + game_mode,
 * fills in the given participants and persists. Skips silently if preliminary
 * round is disabled or event is not Social.
 */
export async function assignParticipantsToPreliminaryTables(
  eventId: string,
  newParticipants: PreliminaryParticipant[]
): Promise<void> {
  if (!newParticipants.length) return;

  const { data: event, error } = await supabase
    .from("events")
    .select("preliminary_round, table_size, module, game_mode")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) return;

  const prelim = (event.preliminary_round as PreliminaryRoundData | null) ?? null;
  const gameMode = normalizeGameMode((event as any).game_mode);
  const isSocial = !event.module || event.module === "social";

  if (!isSocial || !prelim?.enabled) return;

  const tableSize = event.table_size || 4;

  // Modo Lúdico: rebuild `played` from current preliminary tables (source of truth)
  // before adding new participants — avoids drift from stale persisted data.
  const gameModeForFill = gameMode
    ? {
        ...gameMode,
        played: rebuildPlayedFromTables(gameMode, prelim?.tables, null),
      }
    : null;

  const updated = fillPreliminaryTables(prelim, newParticipants, tableSize, gameModeForFill);

  const { __updated_played, ...prelimToSave } = updated as any;

  const updates: any = { preliminary_round: prelimToSave };
  if (gameModeForFill && __updated_played) {
    updates.game_mode = { ...gameModeForFill, played: __updated_played };
  }

  await supabase.from("events").update(updates).eq("id", eventId);
}
