/**
 * Game Mode (Modo Lúdico) — shared types & helpers.
 *
 * A "dynamic" is a group of tables that share the same game (e.g. Trivial on
 * tables 1-4). The platform must guarantee that no participant ever sits at
 * two tables that belong to the same dynamic, across the preliminary round
 * and all official rounds.
 */

export interface GameDynamic {
  id: string;
  name: string;
  /** 1-indexed table numbers that host this dynamic */
  table_numbers: number[];
}

export interface GameModeConfig {
  enabled: boolean;
  dynamics: GameDynamic[];
  /**
   * Persisted log of which dynamics each participant has already played.
   * Shared between the preliminary round (live) and the official rounds (batch).
   */
  played?: Record<string, string[]>;
}

export const EMPTY_GAME_MODE: GameModeConfig = {
  enabled: false,
  dynamics: [],
  played: {},
};

/** Safely normalize whatever is in the DB into a usable config. */
export function normalizeGameMode(raw: unknown): GameModeConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as any;
  if (!r.enabled) return null;
  return {
    enabled: true,
    dynamics: Array.isArray(r.dynamics)
      ? r.dynamics
          .filter((d: any) => d && typeof d.id === "string" && Array.isArray(d.table_numbers))
          .map((d: any) => ({
            id: String(d.id),
            name: String(d.name || ""),
            table_numbers: d.table_numbers.map((n: any) => Number(n)).filter((n: number) => Number.isFinite(n) && n > 0),
          }))
      : [],
    played: r.played && typeof r.played === "object" ? r.played : {},
  };
}

/** Returns the dynamic id assigned to the given (1-indexed) table number, or null. */
export function getDynamicIdForTable(
  config: GameModeConfig | null,
  tableNumber: number
): string | null {
  if (!config?.enabled) return null;
  for (const d of config.dynamics) {
    if (d.table_numbers.includes(tableNumber)) return d.id;
  }
  return null;
}

/** Returns the dynamic object for a table number. */
export function getDynamicForTable(
  config: GameModeConfig | null,
  tableNumber: number
): GameDynamic | null {
  if (!config?.enabled) return null;
  return config.dynamics.find((d) => d.table_numbers.includes(tableNumber)) || null;
}

/** Reads the played map into a Map<participantId, Set<dynamicId>>. */
export function readPlayedMap(config: GameModeConfig | null): Map<string, Set<string>> {
  const map = new Map<string, Set<string>>();
  if (!config?.played) return map;
  for (const [pid, ids] of Object.entries(config.played)) {
    if (Array.isArray(ids)) map.set(pid, new Set(ids));
  }
  return map;
}

/** Serializes a Map<participantId, Set<dynamicId>> back to JSON-safe shape. */
export function writePlayedMap(map: Map<string, Set<string>>): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const [pid, set] of map.entries()) {
    if (set.size > 0) out[pid] = Array.from(set);
  }
  return out;
}

/**
 * Rebuilds the `played` map from the SOURCE OF TRUTH (preliminary tables +
 * official rounds tables) instead of trusting the persisted `played` field.
 *
 * Why this matters: every time the organizer regenerates rounds (or edits
 * tables), the previously persisted `played` map can drift and accumulate
 * dynamics that the participant didn't actually play. Reconstructing it from
 * the actual seating each time guarantees correctness.
 *
 * `prelimTables` is `preliminary_round.tables` (array of arrays of {id,...}).
 * `roundTables` is `events.tables` ([{round, tables: [[{id,...}]]}]).
 */
export function rebuildPlayedFromTables(
  config: GameModeConfig | null,
  prelimTables: Array<Array<{ id: string }>> | null | undefined,
  roundTables: Array<{ round?: number; tables?: Array<Array<{ id: string }>> }> | null | undefined,
  options: { includeRounds?: number[] } = {}
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  if (!config?.enabled) return out;

  const addSeat = (tableNumber: number, participantId: string) => {
    const dynId = getDynamicIdForTable(config, tableNumber);
    if (!dynId) return;
    const list = out[participantId] || (out[participantId] = []);
    if (!list.includes(dynId)) list.push(dynId);
  };

  // Preliminary round
  if (Array.isArray(prelimTables)) {
    prelimTables.forEach((seats, idx) => {
      if (!Array.isArray(seats)) return;
      const tableNumber = idx + 1;
      seats.forEach((p) => p?.id && addSeat(tableNumber, p.id));
    });
  }

  // Official rounds — optionally filter to a subset of round numbers
  if (Array.isArray(roundTables)) {
    for (const round of roundTables) {
      if (!round?.tables || !Array.isArray(round.tables)) continue;
      if (options.includeRounds && round.round && !options.includeRounds.includes(round.round)) continue;
      round.tables.forEach((seats, idx) => {
        if (!Array.isArray(seats)) return;
        const tableNumber = idx + 1;
        seats.forEach((p) => p?.id && addSeat(tableNumber, p.id));
      });
    }
  }

  return out;
}

/** Validation: returns errors and warnings for the given config. */
export function validateGameMode(
  config: GameModeConfig,
  totalTables: number,
  totalRounds: number
): { errors: string[]; warnings: string[] } {
  const errors: string[] = [];
  const warnings: string[] = [];
  if (!config.enabled) return { errors, warnings };

  const seen = new Map<number, string>();
  for (const dyn of config.dynamics) {
    if (!dyn.name.trim()) {
      errors.push(`Una dinámica no tiene nombre.`);
    }
    if (dyn.table_numbers.length === 0) {
      warnings.push(`La dinámica "${dyn.name || "sin nombre"}" no tiene mesas asignadas.`);
    }
    for (const n of dyn.table_numbers) {
      if (n < 1 || n > Math.max(totalTables, 1)) {
        warnings.push(`La dinámica "${dyn.name}" usa la mesa ${n}, fuera del rango estimado (1-${totalTables}).`);
      }
      if (seen.has(n)) {
        errors.push(`La mesa ${n} está asignada a dos dinámicas ("${seen.get(n)}" y "${dyn.name}").`);
      } else {
        seen.set(n, dyn.name);
      }
    }
    // Capacity warning: if a dynamic spans more tables than the rounds available,
    // some participants will inevitably need to repeat (unless the dynamic isn't full).
    if (dyn.table_numbers.length > totalRounds) {
      warnings.push(
        `La dinámica "${dyn.name}" abarca ${dyn.table_numbers.length} mesas pero solo hay ${totalRounds} rondas. Algunos participantes podrían no llenarla sin repetir.`
      );
    }
  }
  return { errors, warnings };
}
