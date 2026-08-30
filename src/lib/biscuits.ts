/** Largest-remainder rounding: scales all positive picks proportionally so
 * they sum to exactly 100, preserving relative weights (50/50/50/50 -> 25 each). */
export function rebalanceTo100(picks: Record<string, number>): Record<string, number> {
  const entries = Object.entries(picks).filter(([, v]) => v > 0);
  const total = entries.reduce((a, [, v]) => a + v, 0);
  if (total === 0) return picks;

  const scale = 100 / total;
  const scaled = entries.map(([id, v]) => {
    const raw = v * scale;
    return { id, frac: raw - Math.floor(raw), floor: Math.floor(raw) };
  });

  const next: Record<string, number> = {};
  for (const e of scaled) next[e.id] = e.floor;

  let remainder = 100 - scaled.reduce((a, e) => a + e.floor, 0);
  const byFracDesc = [...scaled].sort((a, b) => b.frac - a.frac);
  for (let i = 0; remainder > 0 && i < byFracDesc.length; i++, remainder--) {
    next[byFracDesc[i].id] += 1;
  }
  return next;
}
