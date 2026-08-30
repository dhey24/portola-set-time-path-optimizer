export type BurstVariant = "disco" | "dancers" | "lightning" | "stars" | "smiley" | "raccoon";

// Raccoon is rare on purpose — it's a surprise, not a regular. Weighted pool:
// each of the 5 normal variants appears once, raccoon appears once alongside
// them but only after multiple weighted "rolls" — see randomVariant().
const COMMON_VARIANTS: BurstVariant[] = ["disco", "dancers", "lightning", "stars", "smiley"];
const RACCOON_ODDS = 1 / 8;

export function randomVariant(): BurstVariant {
  if (Math.random() < RACCOON_ODDS) return "raccoon";
  return COMMON_VARIANTS[Math.floor(Math.random() * COMMON_VARIANTS.length)];
}

export function randomFrom(pool: string[]): string {
  return pool[Math.floor(Math.random() * pool.length)];
}

const TAP_SURPRISE_ODDS = 1 / 3;

/** Small, random chance of a full-screen moment on an ordinary tap — keeps
 * the app feeling alive throughout, not just at the three big milestones. */
export function rollTapSurprise(): boolean {
  return Math.random() < TAP_SURPRISE_ODDS;
}

export const LOCK_IN_LINES = [
  "🪩 LOCKED IN — vibes secured.",
  "⚡ SEALED. No takebacks (unless you unlock).",
  "✨ 100% locked in, 0% regret.",
  "😵‍💫 Committed. See you in the pit.",
  "🕶️ Locked. The crew will know your truth.",
  "🌀 Vote cast into the void. Respect.",
];

// Used instead of LOCK_IN_LINES when locking in also had to auto-rebalance
// an over-budget draft — makes it obvious that part was handled, not skipped.
export const AUTO_BALANCED_LOCK_LINES = [
  "🌀 Balanced your picks and locked it in — you're welcome.",
  "⚖️ Did the math so you didn't have to. Locked in.",
  "🪩 Auto-balanced, then locked. Smooth.",
  "✨ Numbers handled. You're locked in.",
];

export const PERFECT_100_LINES = [
  "💯 PERFECTLY UNHINGED.",
  "🎯 Not a single crumb wasted.",
  "🪩 Exactly 100. The disco gods approve.",
  "⚡ Somehow, exactly right.",
];

export const REBALANCE_LINES = [
  "🌀 REBALANCED. Fair's fair.",
  "⚖️ Math'd it out — still wild.",
  "🪩 Redistributed. Everyone's still hyped.",
  "✨ Proportions restored. Chaos, organized.",
];

// Fired at random on ordinary taps — no milestone required. Keeps the app
// feeling alive throughout, not just at the three "big" moments.
export const TAP_SURPRISE_LINES = [
  "⚡ Just a random spark of joy.",
  "🪩 The universe noticed that tap.",
  "✨ Bonus vibes, no reason needed.",
  "😎 Confidence: unlocked.",
  "🔥 That was a good tap.",
];

// Surprise raccoons override whatever line pool the moment would normally
// use — a rare, distinct "special edition" celebration rather than just a
// reskinned emoji.
export const RACCOON_LINES = [
  "🦝 A raccoon raided your biscuit stash.",
  "🦝 Trash panda seal of approval.",
  "🦝 It came, it saw, it ate your biscuits.",
  "🦝 Somebody call animal control — vibes confirmed.",
  "🦝 Absolutely no chill. Respect.",
  "🦝 Masked bandit approves this allocation.",
];
