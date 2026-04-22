/**
 * Inclusions: groups of participants that MUST sit together at every round.
 *
 * Storage model:
 *   - Each "group" is identified by a shared `group_id` (uuid).
 *   - For a group of N participants we persist N*(N-1)/2 pairwise rows that
 *     all share the same `group_id`. This keeps the existing pair-based
 *     seating algorithm working unchanged while still letting the UI
 *     reconstruct the original group.
 *
 * Conceptually the opposite of Exclusions. We treat the pairs as
 * undirected edges and use Union-Find to compute the connected components
 * ("mandatory groups") that the seating algorithm must keep on the same
 * table.
 */
import { supabase } from "@/integrations/supabase/client";

export interface InclusionRow {
  id: string;
  event_id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
  group_id: string | null;
}

/** Loads all inclusions for an event. */
export async function loadInclusions(eventId: string): Promise<InclusionRow[]> {
  const { data, error } = await supabase
    .from("participant_inclusions" as any)
    .select("*")
    .eq("event_id", eventId);
  if (error) {
    console.error("[inclusions] load error", error);
    return [];
  }
  return (data || []) as unknown as InclusionRow[];
}

/**
 * Computes the connected components (mandatory groups) of participants
 * that must sit together. Returns an array of groups, each containing
 * the participant ids that belong to it. Singletons are NOT returned.
 */
export function computeInclusionGroups(
  inclusions: { participant_1_id: string; participant_2_id: string }[]
): string[][] {
  const parent = new Map<string, string>();

  const find = (x: string): string => {
    if (!parent.has(x)) {
      parent.set(x, x);
      return x;
    }
    const p = parent.get(x)!;
    if (p === x) return x;
    const root = find(p);
    parent.set(x, root);
    return root;
  };

  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(ra, rb);
  };

  for (const inc of inclusions) {
    if (inc.participant_1_id && inc.participant_2_id) {
      union(inc.participant_1_id, inc.participant_2_id);
    }
  }

  const groups = new Map<string, string[]>();
  for (const id of parent.keys()) {
    const root = find(id);
    if (!groups.has(root)) groups.set(root, []);
    groups.get(root)!.push(id);
  }

  return Array.from(groups.values()).filter((g) => g.length >= 2);
}

/**
 * Returns a Map<participantId, groupIndex> for fast lookup.
 * Participants without a mandatory group are not in the map.
 */
export function buildInclusionGroupIndex(groups: string[][]): Map<string, number> {
  const map = new Map<string, number>();
  groups.forEach((group, idx) => {
    group.forEach((pid) => map.set(pid, idx));
  });
  return map;
}

/**
 * Groups raw pair rows by their `group_id`, returning one entry per
 * mandatory/forbidden group with the unique participant ids and the row
 * ids that compose it (needed to delete the whole group at once).
 *
 * Rows without a group_id are treated as standalone pairs (legacy data).
 */
export interface GroupedPairs {
  groupId: string;
  participantIds: string[];
  rowIds: string[];
  reason: string | null;
}

export function groupPairsByGroupId(
  rows: {
    id: string;
    participant_1_id: string;
    participant_2_id: string;
    group_id: string | null;
    reason: string | null;
  }[]
): GroupedPairs[] {
  const map = new Map<string, GroupedPairs>();
  for (const row of rows) {
    // Legacy rows without group_id behave as their own pair.
    const gid = row.group_id || `legacy-${row.id}`;
    if (!map.has(gid)) {
      map.set(gid, {
        groupId: gid,
        participantIds: [],
        rowIds: [],
        reason: row.reason,
      });
    }
    const g = map.get(gid)!;
    g.rowIds.push(row.id);
    if (!g.participantIds.includes(row.participant_1_id)) {
      g.participantIds.push(row.participant_1_id);
    }
    if (!g.participantIds.includes(row.participant_2_id)) {
      g.participantIds.push(row.participant_2_id);
    }
  }
  return Array.from(map.values());
}

/**
 * Builds the pairwise rows needed to persist a group of N participants.
 * Generates N*(N-1)/2 unordered pairs, all sharing the same group_id.
 */
export function buildPairRowsForGroup(
  eventId: string,
  participantIds: string[],
  groupId: string,
  reason?: string | null
): {
  event_id: string;
  participant_1_id: string;
  participant_2_id: string;
  group_id: string;
  reason: string | null;
}[] {
  const rows: {
    event_id: string;
    participant_1_id: string;
    participant_2_id: string;
    group_id: string;
    reason: string | null;
  }[] = [];
  for (let i = 0; i < participantIds.length; i++) {
    for (let j = i + 1; j < participantIds.length; j++) {
      rows.push({
        event_id: eventId,
        participant_1_id: participantIds[i],
        participant_2_id: participantIds[j],
        group_id: groupId,
        reason: reason ?? null,
      });
    }
  }
  return rows;
}
