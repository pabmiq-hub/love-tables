// Custom table layout helpers (Enterprise feature).
// When enabled, replaces the uniform table_size with explicit per-table capacities.

export interface CustomTableLayout {
  enabled: boolean;
  tables: { capacity: number }[];
}

export const isCustomTablesEnabled = (
  cfg: CustomTableLayout | null | undefined
): cfg is CustomTableLayout => {
  return !!cfg && cfg.enabled === true && Array.isArray(cfg.tables) && cfg.tables.length > 0;
};

/**
 * Compute a distribution that respects the configured per-table capacities,
 * proportionally scaling down when there are fewer participants than total
 * capacity, and dropping empty tables.
 */
export const computeCustomDistribution = (
  numParticipants: number,
  capacities: number[]
): { numTables: number; sizes: number[] } => {
  const caps = capacities.map(c => Math.max(0, Math.floor(Number(c) || 0))).filter(c => c > 0);
  if (caps.length === 0 || numParticipants <= 0) {
    return { numTables: 0, sizes: [] };
  }

  const totalCap = caps.reduce((a, b) => a + b, 0);

  // If there's room for everyone, fill greedily up to each table's capacity.
  if (numParticipants >= totalCap) {
    const sizes = [...caps];
    // Cap to numParticipants if (somehow) configured higher
    return { numTables: sizes.length, sizes };
  }

  // Proportional allocation, respecting capacity ceilings.
  const raw = caps.map(c => (numParticipants * c) / totalCap);
  const sizes = raw.map(r => Math.floor(r));
  let assigned = sizes.reduce((a, b) => a + b, 0);
  let remainder = numParticipants - assigned;

  // Distribute leftover seats to tables with the largest fractional remainder
  // (and remaining capacity), to keep distribution balanced and respect caps.
  const order = caps
    .map((c, i) => ({ i, frac: raw[i] - Math.floor(raw[i]), cap: c }))
    .sort((a, b) => b.frac - a.frac || b.cap - a.cap);

  let cursor = 0;
  while (remainder > 0 && cursor < order.length * 2) {
    const slot = order[cursor % order.length];
    if (sizes[slot.i] < slot.cap) {
      sizes[slot.i]++;
      remainder--;
    }
    cursor++;
  }

  // Drop empty tables (e.g. proportional rounding to 0 with very few participants).
  const filtered: number[] = [];
  for (const s of sizes) if (s > 0) filtered.push(s);
  return { numTables: filtered.length, sizes: filtered };
};
