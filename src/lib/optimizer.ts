import { Day, SetSlot, scheduledSets, flexibleSets } from "./lineup";
import { walkMinutes } from "./travel";
import { TicketType } from "./store/types";

/** allocations[memberName][setId] = biscuits spent (0-100 per member per day) */
export type DayAllocations = Record<string, Record<string, number>>;

export interface SetScore {
  set: SetSlot;
  hype: number; // quadratic-funding-style score: rewards broad small support over one whale
  totalBiscuits: number;
  backers: number; // how many distinct people put anything on this set
  contributions: { name: string; biscuits: number }[];
}

/** Quadratic-funding-style aggregation: (sum of sqrt(contribution))^2.
 * 90 from one person scores far lower than 30+30+30 from three people. */
export function scoreSets(day: Day, allocations: DayAllocations): SetScore[] {
  const all = [...scheduledSets(day), ...flexibleSets(day)];
  return all.map((set) => {
    const contributions = Object.entries(allocations)
      .map(([name, picks]) => ({ name, biscuits: picks[set.id] ?? 0 }))
      .filter((c) => c.biscuits > 0);
    const sumSqrt = contributions.reduce((acc, c) => acc + Math.sqrt(c.biscuits), 0);
    return {
      set,
      hype: Math.round(sumSqrt * sumSqrt * 100) / 100,
      totalBiscuits: contributions.reduce((acc, c) => acc + c.biscuits, 0),
      backers: contributions.length,
      contributions: contributions.sort((a, b) => b.biscuits - a.biscuits),
    };
  });
}

export interface PathStop {
  set: SetSlot;
  arriveMin: number; // when you actually walk up (>= set start if you catch it from the top)
  walkFromPrevMin: number;
  score: SetScore;
}

export interface PathResult {
  key: "hype" | "completionist" | "consensus";
  title: string;
  vibe: string;
  stops: PathStop[];
  totalHype: number;
  setsCount: number;
}

type Weight = [number, number]; // [primary, secondary] compared lexicographically

function cmp(a: Weight, b: Weight): number {
  return a[0] !== b[0] ? a[0] - b[0] : a[1] - b[1];
}
function add(a: Weight, b: Weight): Weight {
  return [a[0] + b[0], a[1] + b[1]];
}

/**
 * Weighted job scheduling with stage-dependent travel time between consecutive picks.
 * O(n^2) DP over sets sorted by start time — plenty fast for a ~30-set day.
 */
function bestPath(
  sets: SetSlot[],
  scoreOf: Map<string, SetScore>,
  weightOf: (s: SetScore) => Weight,
  ticketType: TicketType
): { stops: PathStop[]; total: Weight } {
  const nodes = [...sets].sort((a, b) => a.startMin - b.startMin);
  const n = nodes.length;
  const dp: Weight[] = new Array(n).fill(null).map(() => [0, 0] as Weight);
  const parent: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const w = weightOf(scoreOf.get(nodes[i].id)!);
    dp[i] = w;
    parent[i] = -1;
    for (let j = 0; j < i; j++) {
      const travel = walkMinutes(nodes[j].stage, nodes[i].stage, ticketType);
      if (nodes[j].endMin + travel <= nodes[i].startMin) {
        const candidate = add(dp[j], w);
        if (cmp(candidate, dp[i]) > 0) {
          dp[i] = candidate;
          parent[i] = j;
        }
      }
    }
  }

  let bestIdx = -1;
  let best: Weight = [0, 0];
  for (let i = 0; i < n; i++) {
    if (bestIdx === -1 || cmp(dp[i], best) > 0) {
      best = dp[i];
      bestIdx = i;
    }
  }

  const chain: number[] = [];
  let cur = bestIdx;
  while (cur !== -1) {
    chain.push(cur);
    cur = parent[cur];
  }
  chain.reverse();

  const stops: PathStop[] = chain.map((idx, pos) => {
    const set = nodes[idx];
    const prev = pos > 0 ? nodes[chain[pos - 1]] : null;
    const walkFromPrevMin = prev ? walkMinutes(prev.stage, set.stage, ticketType) : 0;
    return {
      set,
      arriveMin: set.startMin,
      walkFromPrevMin,
      score: scoreOf.get(set.id)!,
    };
  });

  return { stops, total: bestIdx === -1 ? [0, 0] : dp[bestIdx] };
}

export function buildPaths(
  day: Day,
  allocations: DayAllocations,
  ticketType: TicketType
): {
  paths: PathResult[];
  wildcards: SetScore[];
} {
  const scores = scoreSets(day, allocations);
  const scoreOf = new Map(scores.map((s) => [s.set.id, s]));
  const scheduled = scheduledSets(day);

  const hype = bestPath(scheduled, scoreOf, (s) => [s.hype, 0], ticketType);
  const completionist = bestPath(
    scheduled,
    scoreOf,
    (s) => [s.backers > 0 ? 1 : 0, s.hype],
    ticketType
  );
  const consensus = bestPath(scheduled, scoreOf, (s) => [s.backers, s.hype], ticketType);

  const paths: PathResult[] = [
    {
      key: "hype",
      title: "The Hype Path",
      vibe: "Maximum collective excitement. Chases whatever the group is most obsessed with, point for point.",
      stops: hype.stops,
      totalHype: hype.stops.reduce((a, s) => a + s.score.hype, 0),
      setsCount: hype.stops.length,
    },
    {
      key: "completionist",
      title: "The Completionist",
      vibe: "Packs in as many sets with any crew interest as the clock allows — breadth over intensity.",
      stops: completionist.stops,
      totalHype: completionist.stops.reduce((a, s) => a + s.score.hype, 0),
      setsCount: completionist.stops.length,
    },
    {
      key: "consensus",
      title: "The No-One-Left-Behind Path",
      vibe: "One person, one vote. Favors sets where lots of the crew have some interest over one person's obsession.",
      stops: consensus.stops,
      totalHype: consensus.stops.reduce((a, s) => a + s.score.hype, 0),
      setsCount: consensus.stops.length,
    },
  ];

  const wildcards = scores
    .filter((s) => s.set.flexible)
    .sort((a, b) => b.hype - a.hype);

  return { paths, wildcards };
}
