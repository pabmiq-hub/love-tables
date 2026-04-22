/**
 * Inclusions: pairs of participants that MUST sit together at every round.
 *
 * Conceptually the opposite of Exclusions. We model them as undirected edges
 * and use a Union-Find to compute the connected components ("mandatory groups")
 * that the seating algorithm must keep on the same table.
 */
import { supabase } from "@/integrations/supabase/client";

export interface InclusionRow {
  id: string;
  event_id: string;
  participant_1_id: string;
  participant_2_id: string;
  reason: string | null;
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
