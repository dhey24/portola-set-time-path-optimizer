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

/** A set the crew was into that didn't make the cut — and which chosen
 * stop(s) it lost to. */
export interface CloseCall {
  score: SetScore;
  conflictsWith: SetSlot[];
}

// [primary, secondary, sameStageStreak] compared lexicographically. The
// third slot never outranks real score — it only breaks EXACT ties between
// two otherwise-equal paths, preferring the one that hops stages less.
type Weight = [number, number, number];

function cmp(a: Weight, b: Weight): number {
  if (a[0] !== b[0]) return a[0] - b[0];
  if (a[1] !== b[1]) return a[1] - b[1];
  return a[2] - b[2];
}
function add(a: Weight, b: Weight): Weight {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}

/**
 * Weighted job scheduling with stage-dependent travel time between consecutive picks.
 * O(n^2) DP over sets sorted by start time — plenty fast for a ~30-set day.
 */
function bestPath(
  sets: SetSlot[],
  scoreOf: Map<string, SetScore>,
  weightOf: (s: SetScore) => [number, number],
  ticketType: TicketType
): { stops: PathStop[]; total: Weight } {
  const nodes = [...sets].sort((a, b) => a.startMin - b.startMin);
  const n = nodes.length;
  const dp: Weight[] = new Array(n).fill(null).map(() => [0, 0, 0] as Weight);
  const parent: number[] = new Array(n).fill(-1);

  for (let i = 0; i < n; i++) {
    const [primary, secondary] = weightOf(scoreOf.get(nodes[i].id)!);
    const w: Weight = [primary, secondary, 0];
    dp[i] = w;
    parent[i] = -1;
    for (let j = 0; j < i; j++) {
      const travel = walkMinutes(nodes[j].stage, nodes[i].stage, ticketType);
      if (nodes[j].endMin + travel <= nodes[i].startMin) {
        const sameStage = nodes[j].stage === nodes[i].stage ? 1 : 0;
        const candidate = add(dp[j], [primary, secondary, sameStage]);
        if (cmp(candidate, dp[i]) > 0) {
          dp[i] = candidate;
          parent[i] = j;
        }
      }
    }
  }

  let bestIdx = -1;
  let best: Weight = [0, 0, 0];
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

  return { stops, total: bestIdx === -1 ? [0, 0, 0] : dp[bestIdx] };
}

/**
 * Sets the crew backed that didn't make a given path — annotated with which
 * chosen stop(s) actually blocked them (schedule/travel conflict), not just
 * "scored lower." Ranked by hype, capped to the handful worth showing.
 */
function findCloseCalls(
  stops: PathStop[],
  scores: SetScore[],
  ticketType: TicketType
): CloseCall[] {
  const stopIds = new Set(stops.map((s) => s.set.id));
  const candidates = scores.filter(
    (s) => s.backers > 0 && !s.set.flexible && !stopIds.has(s.set.id)
  );

  const closeCalls: CloseCall[] = [];
  for (const candidate of candidates) {
    const set = candidate.set;
    let prev: PathStop | null = null;
    let next: PathStop | null = null;
    for (const stop of stops) {
      if (stop.set.startMin <= set.startMin) prev = stop;
      if (stop.set.startMin >= set.startMin && !next) next = stop;
    }

    const conflictsWith: SetSlot[] = [];
    if (prev && (prev.set.endMin + walkMinutes(prev.set.stage, set.stage, ticketType) > set.startMin)) {
      conflictsWith.push(prev.set);
    }
    if (next && next !== prev && (set.endMin + walkMinutes(set.stage, next.set.stage, ticketType) > next.set.startMin)) {
      conflictsWith.push(next.set);
    }

    if (conflictsWith.length > 0) {
      closeCalls.push({ score: candidate, conflictsWith });
    }
  }

  return closeCalls.sort((a, b) => b.score.hype - a.score.hype).slice(0, 3);
}

export function buildPaths(
  day: Day,
  allocations: DayAllocations,
  ticketType: TicketType
): {
  paths: PathResult[];
  wildcards: SetScore[];
  closeCalls: CloseCall[];
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

  const closeCalls = findCloseCalls(hype.stops, scores, ticketType);

  return { paths, wildcards, closeCalls };
}
