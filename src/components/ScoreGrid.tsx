"use client";

import { useEffect, useRef, useState } from "react";
import { STAGES, SetSlot, minutesToLabel } from "@/lib/lineup";
import { SetScore } from "@/lib/optimizer";
import { STAGE_STYLE, STAGE_SHORT } from "@/lib/stageStyle";

const PX_PER_MIN = 1.5;
const AXIS_WIDTH = 30;
const HEADER_HEIGHT = 34;
const HEADER_GAP = 6;
const TOP_PAD = 10;
const DENSITY_KEY = "pma-score-grid-density";
const STAGE_COUNT = STAGES.length;

function shortHour(min: number): string {
  return minutesToLabel(min).replace(":00", "").replace(" ", "");
}

/** Read-only twin of LineupGrid — same spatial layout, but colored by crew
 * interest instead of your own picks. Zero-backer sets are desaturated so
 * the sets people actually want pop out. Stage-switching is tap-arrows, not
 * touch-scroll — see LineupGrid for why. */
export function ScoreGrid({ scores }: { scores: SetScore[] }) {
  const sets = scores.map((s) => s.set);
  const scoreOf = new Map(scores.map((s) => [s.set.id, s]));

  const [density, setDensity] = useState(() => {
    if (typeof window === "undefined") return 3;
    const saved = Number(localStorage.getItem(DENSITY_KEY));
    return saved >= 1 && saved <= 5 ? saved : 3;
  });
  const [rawPageStart, setRawPageStart] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(340);

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, String(density));
  }, [density]);

  // Derived, not stored — see LineupGrid for why this isn't a setState-in-effect.
  const pageStart = Math.max(0, Math.min(rawPageStart, STAGE_COUNT - density));

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const columnWidth = Math.max(72, (containerWidth - AXIS_WIDTH) / density);

  const dayStart = Math.min(...sets.map((s) => s.startMin));
  const dayEnd = Math.max(...sets.map((s) => s.endMin));
  const bodyHeight = (dayEnd - dayStart) * PX_PER_MIN + TOP_PAD;

  const hourMarks: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m <= dayEnd; m += 60) hourMarks.push(m);

  const byStage = new Map<SetSlot["stage"], SetSlot[]>(
    STAGES.map((s) => [s.id, sets.filter((x) => x.stage === s.id)])
  );
  const visibleStages = STAGES.slice(pageStart, pageStart + density);
  const canGoPrev = pageStart > 0;
  const canGoNext = pageStart + density < STAGE_COUNT;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted">Colored by crew interest. Faded = nobody backed it.</p>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setRawPageStart(Math.max(0, pageStart - 1))}
            disabled={!canGoPrev}
            aria-label="Show the previous stage"
            className="h-6 w-6 rounded-full bg-white/10 text-xs font-bold disabled:opacity-20"
          >
            ‹
          </button>
          <div className="flex items-center gap-1 rounded-full bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setDensity((d) => Math.max(1, d - 1))}
              disabled={density <= 1}
              aria-label="Fewer columns, bigger text"
              className="h-6 w-6 rounded-full bg-white/10 text-xs font-bold disabled:opacity-30"
            >
              −
            </button>
            <span className="text-[10px] text-muted w-10 text-center">{density} cols</span>
            <button
              type="button"
              onClick={() => setDensity((d) => Math.min(5, d + 1))}
              disabled={density >= 5}
              aria-label="More columns visible at once"
              className="h-6 w-6 rounded-full bg-white/10 text-xs font-bold disabled:opacity-30"
            >
              +
            </button>
          </div>
          <button
            type="button"
            onClick={() => setRawPageStart(Math.min(STAGE_COUNT - density, pageStart + 1))}
            disabled={!canGoNext}
            aria-label="Show the next stage"
            className="h-6 w-6 rounded-full bg-white/10 text-xs font-bold disabled:opacity-20"
          >
            ›
          </button>
        </div>
      </div>

      <div className="sticky z-20 overflow-hidden rounded-t-xl" style={{ top: 0 }}>
        <div className="flex">
          <div className="shrink-0 bg-card" style={{ width: AXIS_WIDTH, height: HEADER_HEIGHT }} />
          {visibleStages.map((s) => (
            <div
              key={s.id}
              className={`shrink-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-tight ${STAGE_STYLE[s.id]}`}
              style={{ width: columnWidth, height: HEADER_HEIGHT }}
            >
              {STAGE_SHORT[s.id]}
            </div>
          ))}
        </div>
        <div className="bg-background" style={{ height: HEADER_GAP }} />
      </div>

      <div ref={containerRef} className="flex rounded-b-xl bg-card/40 overflow-hidden">
        <div className="shrink-0 bg-card relative" style={{ width: AXIS_WIDTH, height: bodyHeight }}>
          {hourMarks.map((m) => (
            <div
              key={m}
              className="absolute left-0 right-0 text-[8px] text-muted -translate-y-1/2 pr-1 text-right leading-none"
              style={{ top: TOP_PAD + (m - dayStart) * PX_PER_MIN }}
            >
              {shortHour(m)}
            </div>
          ))}
        </div>

        {visibleStages.map((s) => (
          <div
            key={s.id}
            className="shrink-0 relative border-l border-white/5"
            style={{ width: columnWidth, height: bodyHeight }}
          >
            {hourMarks.map((m) => (
              <div
                key={`${s.id}-${m}`}
                className="absolute left-0 right-0 border-t border-white/5"
                style={{ top: TOP_PAD + (m - dayStart) * PX_PER_MIN }}
              />
            ))}
            {(byStage.get(s.id) ?? []).map((set) => {
              const score = scoreOf.get(set.id)!;
              const hasVotes = score.backers > 0;
              const top = TOP_PAD + (set.startMin - dayStart) * PX_PER_MIN;
              const height = Math.max((set.endMin - set.startMin) * PX_PER_MIN - 2, 26);
              return (
                <div
                  key={set.id}
                  className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 overflow-hidden ${STAGE_STYLE[set.stage]}`}
                  style={{
                    top,
                    height,
                    opacity: hasVotes ? 1 : 0.35,
                    filter: hasVotes ? "none" : "grayscale(0.6)",
                  }}
                >
                  <span className="block text-[9px] leading-[11px] font-semibold line-clamp-2">
                    {set.artist}
                  </span>
                  {hasVotes && (
                    <span className="block text-[8px] leading-[10px] font-bold opacity-80 mt-0.5">
                      {score.backers} · {Math.round(score.hype)}pts
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
