/**
 * Helper to assign participants to preliminary round (Round 0) tables.
 * Mirrors the logic in supabase/functions/checkin-participant/index.ts
 * so direct DB check-ins (test mode, manual toggle, bulk Excel, etc.)
 * also populate preliminary tables consistently.
 */
import { supabase } from "@/integrations/supabase/client";

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
 * respecting table_size and dismissed_tables. Returns the new structure
 * (does NOT persist).
 */
export function fillPreliminaryTables(
  prelim: PreliminaryRoundData,
  newParticipants: PreliminaryParticipant[],
  tableSize: number
): PreliminaryRoundData {
  const tables: PreliminaryParticipant[][] = Array.isArray(prelim.tables)
    ? prelim.tables.map((t) => [...t])
    : [];
  const dismissed: number[] = Array.isArray(prelim.dismissed_tables)
    ? prelim.dismissed_tables
    : [];

  for (const p of newParticipants) {
    // Skip if already in any table
    const alreadyAssigned = tables.some((t) => t.some((x) => x.id === p.id));
    if (alreadyAssigned) continue;

    // Find last non-dismissed table with free seat
    let placed = false;
    for (let i = tables.length - 1; i >= 0; i--) {
      if (dismissed.includes(i)) continue;
      if (tables[i].length < tableSize) {
        tables[i].push({ id: p.id, name: p.name });
        placed = true;
        break;
      }
    }
    if (!placed) {
      tables.push([{ id: p.id, name: p.name }]);
    }
  }

  return {
    ...prelim,
    tables,
    started_at: prelim.started_at || new Date().toISOString(),
  };
}

/**
 * Loads the event's preliminary_round + table_size + module, fills in the
 * given participants and persists. Skips silently if preliminary round is
 * disabled or event is not Social.
 */
export async function assignParticipantsToPreliminaryTables(
  eventId: string,
  newParticipants: PreliminaryParticipant[]
): Promise<void> {
  if (!newParticipants.length) return;

  const { data: event, error } = await supabase
    .from("events")
    .select("preliminary_round, table_size, module")
    .eq("id", eventId)
    .maybeSingle();

  if (error || !event) return;

  const prelim = (event.preliminary_round as PreliminaryRoundData | null) ?? null;
  const isSocial = !event.module || event.module === "social";

  if (!isSocial || !prelim?.enabled) return;

  const tableSize = event.table_size || 4;
  const updated = fillPreliminaryTables(prelim, newParticipants, tableSize);

  await supabase
    .from("events")
    .update({ preliminary_round: updated as any })
    .eq("id", eventId);
}
