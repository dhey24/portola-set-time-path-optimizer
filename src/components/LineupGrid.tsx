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

function shortHour(min: number): string {
  return minutesToLabel(min).replace(":00", "").replace(" ", "");
}

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
  const scrollRef = useRef<HTMLDivElement>(null);
  const headerTrackRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(340);

  useEffect(() => {
    localStorage.setItem(DENSITY_KEY, String(density));
  }, [density]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      const width = entries[0]?.contentRect.width;
      if (width) setContainerWidth(width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // A container with overflow-x:auto has its overflow-y used-value forced to
  // 'auto' too (CSS Overflow spec) — which makes IT the sticky containing
  // block for anything nested inside, breaking page-relative `position:
  // sticky` for a vertically-pinned header row. So the header row lives
  // OUTSIDE the horizontal scroller, in its own sticky-to-page wrapper, and
  // its horizontal position is mirrored via a transform synced to the
  // scroller's scrollLeft (the standard "frozen header" pattern).
  useEffect(() => {
    const scrollEl = scrollRef.current;
    const track = headerTrackRef.current;
    if (!scrollEl || !track) return;
    const sync = () => {
      track.style.transform = `translateX(-${scrollEl.scrollLeft}px)`;
    };
    sync();
    scrollEl.addEventListener("scroll", sync, { passive: true });
    return () => scrollEl.removeEventListener("scroll", sync);
  }, [density]);

  // The scroller isn't itself a snap point from the header's perspective,
  // and mandatory scroll-snap can auto-settle on the first stage column on
  // mount, shifting scrollLeft by exactly the gutter's width and hiding the
  // first few characters of every Pier block underneath it. Force it to 0.
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollLeft = 0;
  }, [density]);

  const columnWidth = Math.max(72, (containerWidth - AXIS_WIDTH) / density);

  const dayStart = Math.min(...sets.map((s) => s.startMin));
  const dayEnd = Math.max(...sets.map((s) => s.endMin));
  const bodyHeight = (dayEnd - dayStart) * PX_PER_MIN + TOP_PAD;

  const hourMarks: number[] = [];
  for (let m = Math.ceil(dayStart / 60) * 60; m <= dayEnd; m += 60) hourMarks.push(m);

  const byStage = new Map(STAGES.map((s) => [s.id, sets.filter((x) => x.stage === s.id)]));

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted">
          Tap a set to weight it. Side-by-side blocks clash.
        </p>
        <div className="flex items-center gap-1 shrink-0 rounded-full bg-white/5 p-1">
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
      </div>

      {/* Sticky, page-relative header row — NOT inside the horizontal
          scroller (see effect above for why). Its own horizontal scroll is
          just a mirrored transform, never user-driven. */}
      <div
        className="sticky z-20 overflow-hidden rounded-t-xl"
        style={{ top: stickyTop }}
      >
        <div ref={headerTrackRef} className="flex" style={{ willChange: "transform" }}>
          <div className="shrink-0 bg-card" style={{ width: AXIS_WIDTH, height: HEADER_HEIGHT }} />
          {STAGES.map((s) => (
            <div
              key={s.id}
              className={`shrink-0 flex items-center justify-center text-[10px] font-bold uppercase tracking-tight ${STAGE_STYLE[s.id]}`}
              style={{ width: columnWidth, height: HEADER_HEIGHT }}
            >
              {STAGE_SHORT[s.id]}
            </div>
          ))}
        </div>
        {/* Buffer strip, deliberately outside the transformed track so it
            never scrolls horizontally — keeps a clean gap between the
            colorful stage pills and whatever set is currently scrolled up
            underneath them, instead of blocks looking glued to the header. */}
        <div className="bg-background" style={{ height: HEADER_GAP }} />
      </div>

      <div
        ref={scrollRef}
        className="overflow-x-auto rounded-b-xl bg-card/40"
        style={{
          // "proximity" (not "mandatory") is deliberate: mandatory snap makes
          // the browser commit hard to finishing a horizontal snap on any
          // even-slightly-diagonal touch, which is what was making vertical
          // page scroll feel fought/stuck when a gesture started on the grid.
          scrollSnapType: "x proximity",
          WebkitOverflowScrolling: "touch",
          // This element only claims horizontal panning for itself — vertical
          // gestures starting here are left for the page to scroll.
          touchAction: "pan-x",
        }}
      >
        <div className="flex">
          {/* Time gutter — sticks to the left as stage columns snap-scroll past it. */}
          <div
            className="sticky left-0 z-10 shrink-0 bg-card relative"
            style={{ width: AXIS_WIDTH, height: bodyHeight, scrollSnapAlign: "start" }}
          >
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

          {STAGES.map((s) => (
            <div
              key={s.id}
              className="shrink-0 relative border-l border-white/5"
              style={{ width: columnWidth, height: bodyHeight, scrollSnapAlign: "start" }}
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
    </div>
  );
}
