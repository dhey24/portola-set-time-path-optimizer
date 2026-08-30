"use client";

import { useEffect, useRef, useState } from "react";
import { STAGES, SetSlot, minutesToLabel } from "@/lib/lineup";
import { STAGE_STYLE, STAGE_SHORT } from "@/lib/stageStyle";

const PX_PER_MIN = 1.5;
const AXIS_WIDTH = 30;
const HEADER_HEIGHT = 34;
const HEADER_GAP = 6;
const TOP_PAD = 10;
const DENSITY_KEY = "pma-grid-density";
const STAGE_COUNT = STAGES.length;

function shortHour(min: number): string {
  return minutesToLabel(min).replace(":00", "").replace(" ", "");
}

/** Horizontal stage-switching is done by TAPPING arrows, deliberately never
 * by touch-drag. A touch-scrollable region nested inside a vertically
 * scrolling page fights the browser's gesture recognizer on any even
 * slightly-diagonal thumb swipe — no combination of touch-action/scroll-snap
 * tuning reliably resolves that on mobile Safari. Removing the competing
 * touch surface entirely is the actual fix: vertical scroll is never
 * contested because there's nothing here for it to be contested *by*. */
export function LineupGrid({
  sets,
  picks,
  selectedId,
  onSelect,
  stickyTop,
}: {
  sets: SetSlot[];
  picks: Record<string, number>;
  selectedId: string | null;
  onSelect: (id: string) => void;
  /** Height (px) of whatever's already pinned above this grid — the stage
   * header row sticks just below it, not at viewport 0. */
  stickyTop: number;
}) {
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

  // Derived, not stored: if density shrinks the visible window back into
  // range, there's nothing to "correct" — just never render an out-of-range
  // value. Avoids a setState-in-effect just to keep two pieces of state in sync.
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

  const byStage = new Map(STAGES.map((s) => [s.id, sets.filter((x) => x.stage === s.id)]));
  const visibleStages = STAGES.slice(pageStart, pageStart + density);
  const canGoPrev = pageStart > 0;
  const canGoNext = pageStart + density < STAGE_COUNT;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted">
        Tap a set to weight it. Side-by-side blocks clash.
      </p>

      {/* Everything that needs to stay reachable while scrolling down the
          schedule — paging arrows, density control, and the stage-name row —
          lives in ONE sticky block so it all stays pinned together right
          below whatever's already stuck above it (the biscuits-spent bar). */}
      <div
        className="sticky z-20 overflow-hidden rounded-t-xl bg-background"
        style={{ top: stickyTop }}
      >
        <div className="flex items-center justify-end gap-1.5 px-1.5 py-1.5">
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
        {/* Buffer strip — keeps a clean gap between the colorful stage pills
            and whatever set is currently scrolled up underneath them, instead
            of blocks looking glued to the header. */}
        <div className="bg-background" style={{ height: HEADER_GAP }} />
      </div>

      <div ref={containerRef} className="flex rounded-b-xl bg-card/40 overflow-hidden">
        {/* Time gutter */}
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
              const value = picks[set.id] ?? 0;
              const top = TOP_PAD + (set.startMin - dayStart) * PX_PER_MIN;
              const height = Math.max((set.endMin - set.startMin) * PX_PER_MIN - 2, 26);
              const selected = selectedId === set.id;
              return (
                <button
                  key={set.id}
                  type="button"
                  onClick={() => onSelect(set.id)}
                  className={`absolute left-0.5 right-0.5 rounded-md px-1.5 py-1 text-left overflow-hidden transition ${
                    STAGE_STYLE[set.stage]
                  } ${value > 0 ? "ring-2 ring-white" : ""} ${
                    selected ? "outline outline-2 outline-offset-1 outline-accent select-pulse" : ""
                  }`}
                  style={{ top, height }}
                >
                  <span className="block text-[9px] leading-[11px] font-semibold line-clamp-3">
                    {set.artist}
                  </span>
                  {value > 0 && (
                    <span className="absolute top-0.5 right-0.5 bg-black/70 text-white text-[8px] font-black rounded-full h-4 min-w-4 px-0.5 flex items-center justify-center">
                      {value}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
