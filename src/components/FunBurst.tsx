"use client";

import { useEffect, useState } from "react";
import { BurstVariant } from "@/lib/fun";

const VARIANT_EMOJI: Record<BurstVariant, string[]> = {
  disco: ["🪩"],
  dancers: ["💃", "🕺"],
  lightning: ["⚡"],
  stars: ["✨", "🌟", "⭐"],
  smiley: ["😊", "😎", "🤪", "🥳"],
  raccoon: ["🦝"],
};

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/** Full-viewport celebration: a burst or fall of themed particles plus a
 * banner message. Purely decorative — auto-dismisses via onDone. */
export function FunBurst({
  variant,
  message,
  onDone,
}: {
  variant: BurstVariant;
  message: string;
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [onDone]);

  // Lazy initializer: runs once per mount. The parent keys this component by
  // celebration id, so a fresh mount (and fresh randomness) happens per
  // celebration — this is the one place Math.random() is safe to call.
  const [particles] = useState(() => {
    const emojiPool = VARIANT_EMOJI[variant];
    const isFall = variant === "disco" || variant === "dancers";
    const isScurry = variant === "raccoon";
    const isLightning = variant === "lightning";
    const count = isScurry ? 7 : isFall ? 14 : isLightning ? 28 : 20;

    return Array.from({ length: count }, (_, i) => {
      const emoji = emojiPool[i % emojiPool.length];
      if (isScurry) {
        return {
          id: i,
          emoji,
          style: {
            left: 0,
            top: `${rand(45, 85)}%`,
            fontSize: rand(24, 38),
            ["--dur" as string]: `${rand(1300, 2000)}ms`,
            ["--delay" as string]: `${rand(0, 900)}ms`,
          } as React.CSSProperties,
          className: "raccoon-scurry",
        };
      }
      if (isFall) {
        return {
          id: i,
          emoji,
          style: {
            left: `${rand(2, 96)}%`,
            top: "-8%",
            fontSize: rand(20, 34),
            ["--drift" as string]: `${rand(-60, 60)}px`,
            ["--rot" as string]: `${rand(180, 540)}deg`,
            ["--dur" as string]: `${rand(1400, 2200)}ms`,
            ["--delay" as string]: `${rand(0, 500)}ms`,
          } as React.CSSProperties,
          className: "disco-fall",
        };
      }
      const angle = rand(0, 360);
      // Lightning explodes further/bigger than the other radial variants.
      const distance = isLightning ? rand(180, 460) : rand(100, 320);
      const dx = Math.cos((angle * Math.PI) / 180) * distance;
      const dy = Math.sin((angle * Math.PI) / 180) * distance - rand(0, 60);
      return {
        id: i,
        emoji,
        style: {
          left: `${rand(20, 80)}%`,
          top: `${rand(25, 45)}%`,
          fontSize: isLightning ? rand(22, 40) : rand(16, 30),
          ["--dx" as string]: `${dx}px`,
          ["--dy" as string]: `${dy}px`,
          ["--rot" as string]: `${rand(-180, 180)}deg`,
          ["--dur" as string]: `${rand(550, 950)}ms`,
          ["--delay" as string]: `${rand(0, 180)}ms`,
        } as React.CSSProperties,
        className: "burst-particle",
      };
    });
  });

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden">
      {particles.map((p) => (
        <span key={p.id} className={`absolute ${p.className}`} style={p.style}>
          {p.emoji}
        </span>
      ))}
      <div className="absolute inset-x-0 top-24 flex justify-center px-6">
        <div className="banner-pop rounded-2xl bg-black/80 backdrop-blur px-5 py-3 text-center shadow-2xl border border-white/10 max-w-xs">
          <p className="poster-heading text-xl text-accent">{message}</p>
        </div>
      </div>
    </div>
  );
}
