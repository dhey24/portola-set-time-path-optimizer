import { Stage } from "./lineup";
import { TicketType } from "./store/types";

function pairKey(a: Stage, b: Stage): string {
  return [a, b].sort().join("|");
}

// Rough walking times between Pier 80 stages, in minutes, at VIP pace (shorter
// lines, faster cut-throughs) — tune once you've actually scoped the venue
// map. Despacio sits off in its own sound-system zone so it's a bit further
// from everything. GA takes noticeably longer: bigger crowds, longer lines
// back in, no shortcuts.
// Built from pairKey() itself (rather than hand-sorted string literals) so a
// stage pair can never silently miss the map and fall through to the default.
const VIP_PAIRS: [Stage, Stage, number][] = [
  ["pier", "crane", 10],
  ["crane", "warehouse", 10],
  ["warehouse", "shiptent", 10],
  ["pier", "warehouse", 12],
  ["crane", "shiptent", 12],
  ["pier", "shiptent", 15],
  ["pier", "despacio", 15],
  ["crane", "despacio", 13],
  ["warehouse", "despacio", 12],
  ["shiptent", "despacio", 14],
];

const VIP_MINUTES: Record<string, number> = Object.fromEntries(
  VIP_PAIRS.map(([a, b, minutes]) => [pairKey(a, b), minutes])
);

const GA_MULTIPLIER = 1.5;

export function walkMinutes(a: Stage, b: Stage, ticketType: TicketType): number {
  if (a === b) return 0;
  const vipMinutes = VIP_MINUTES[pairKey(a, b)] ?? 12;
  return ticketType === "VIP" ? vipMinutes : Math.round(vipMinutes * GA_MULTIPLIER);
}
