"use client";

// Deterministic pseudo-random hash — pure function of its seed, so it's safe
// to call during render (unlike Math.random(), which React's purity rule bans).
function seededRand(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** Tiny local flourish for the bottom-sheet stepper — cheap dopamine on
 * every tap without being obnoxious. `trigger` both varies the particle
 * spread (deterministically) and, via the inner key, replays the CSS burst. */
export function MiniPoof({ trigger }: { trigger: number }) {
  if (trigger === 0) return null;

  const particles = Array.from({ length: 6 }, (_, i) => {
    const seed = trigger * 97 + i * 31;
    const angle = (360 / 6) * i + seededRand(seed) * 40;
    const dist = 26 + seededRand(seed + 1) * 20;
    const dx = Math.cos((angle * Math.PI) / 180) * dist;
    const dy = Math.sin((angle * Math.PI) / 180) * dist;
    const rot = seededRand(seed + 2) * 120 - 60;
    const size = 16 + seededRand(seed + 3) * 8;
    return { id: i, dx, dy, rot, size };
  });

  return (
    <span key={trigger} className="absolute inset-0 pointer-events-none z-10">
      {particles.map((p) => (
        <span
          key={p.id}
          className="burst-particle absolute left-1/2 top-1/2"
          style={
            {
              "--dx": `${p.dx}px`,
              "--dy": `${p.dy}px`,
              "--rot": `${p.rot}deg`,
              "--dur": "560ms",
              fontSize: p.size,
            } as React.CSSProperties
          }
        >
          ✨
        </span>
      ))}
    </span>
  );
}
