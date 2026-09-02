"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Day, SetSlot, minutesToLabel } from "@/lib/lineup";
import { BISCUIT_BUDGET } from "@/lib/store/types";
import {
  saveAllocationsAction,
  lockInAction,
  unlockDayAction,
  copyAllocationsAction,
} from "@/lib/actions";
import { STAGE_STYLE, STAGE_LABEL } from "@/lib/stageStyle";
import { LineupGrid } from "@/components/LineupGrid";
import { rebalanceTo100 } from "@/lib/biscuits";
import { FunBurst } from "@/components/FunBurst";
import { MiniPoof } from "@/components/MiniPoof";
import {
  AUTO_BALANCED_LOCK_LINES,
  BurstVariant,
  LOCK_IN_LINES,
  PERFECT_100_LINES,
  RACCOON_LINES,
  REBALANCE_LINES,
  TAP_SURPRISE_LINES,
  randomFrom,
  randomVariant,
  rollTapSurprise,
} from "@/lib/fun";

type Celebration = { id: number; variant: BurstVariant; message: string };

export function BiscuitAllocator({
  crewCode,
  day,
  sets,
  initialPicks,
  initiallyLocked,
  copyableCrews,
}: {
  crewCode: string;
  day: Day;
  sets: SetSlot[];
  initialPicks: Record<string, number>;
  initiallyLocked: boolean;
  copyableCrews: { code: string; name: string; count: number }[];
}) {
  const router = useRouter();
  const [picks, setPicks] = useState<Record<string, number>>(initialPicks);
  const [locked, setLocked] = useState(initiallyLocked);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saveTimer, setSaveTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [view, setView] = useState<"grid" | "list">("grid");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [poofKey, setPoofKey] = useState(0);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const celebrationIdRef = useRef(0);
  const suppressPerfectRef = useRef(false);
  const prevSpentRef = useRef(0);
  const sheetInputRef = useRef<HTMLInputElement>(null);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(64);

  const spent = useMemo(
    () => Object.values(picks).reduce((a, b) => a + b, 0),
    [picks]
  );
  const over = spent > BISCUIT_BUDGET;

  function fireCelebration(lines: string[]) {
    celebrationIdRef.current += 1;
    const variant = randomVariant();
    // Raccoons are a surprise "special edition" — they bring their own line
    // pool instead of whatever the triggering moment would normally show.
    const message = variant === "raccoon" ? randomFrom(RACCOON_LINES) : randomFrom(lines);
    setCelebration({ id: celebrationIdRef.current, variant, message });
  }

  // Organic "landed on exactly 100" moment — suppressed when Rebalance caused
  // it, since that already fires its own celebration.
  useEffect(() => {
    if (spent === 100 && prevSpentRef.current !== 100) {
      if (suppressPerfectRef.current) {
        suppressPerfectRef.current = false;
      } else if (!locked) {
        fireCelebration(PERFECT_100_LINES);
      }
    }
    prevSpentRef.current = spent;
  }, [spent, locked]);

  // Measure the sticky "biscuits spent" bar's height (it changes when the
  // over-budget/error messages show up) so the grid's own sticky stage
  // headers can sit exactly below it instead of guessing a fixed offset.
  useEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    const observer = new ResizeObserver(() => {
      // contentRect excludes padding/border — offsetHeight gives the full
      // rendered (border-box) height, which is what a CSS `top` offset needs.
      setTopBarHeight(el.offsetHeight);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Autofocus + select the sheet's number input the instant a block is
  // tapped, so typing works immediately without a second tap.
  useEffect(() => {
    if (selectedId && sheetInputRef.current) {
      sheetInputRef.current.focus();
      sheetInputRef.current.select();
    }
  }, [selectedId]);

  function scheduleSave(next: Record<string, number>) {
    if (saveTimer) clearTimeout(saveTimer);
    const timer = setTimeout(() => {
      startTransition(async () => {
        try {
          await saveAllocationsAction(crewCode, day, next);
          setError(null);
        } catch (e) {
          setError(e instanceof Error ? e.message : "Couldn't save");
        }
      });
    }, 400);
    setSaveTimer(timer);
  }

  function adjust(setId: string, delta: number) {
    if (locked) return;
    setPicks((prev) => {
      const current = prev[setId] ?? 0;
      const v = Math.max(0, Math.min(100, current + delta));
      const next = { ...prev };
      if (v === 0) delete next[setId];
      else next[setId] = v;
      scheduleSave(next);
      return next;
    });
    setPoofKey((k) => k + 1);
    // Small, random chance of a full-screen moment on an ordinary tap — keeps
    // the app feeling alive throughout, not just at the three big milestones.
    if (rollTapSurprise()) fireCelebration(TAP_SURPRISE_LINES);
  }

  function setExact(setId: string, value: number) {
    if (locked) return;
    setPicks((prev) => {
      const v = Math.max(0, Math.min(100, Math.floor(value) || 0));
      const next = { ...prev };
      if (v === 0) delete next[setId];
      else next[setId] = v;
      scheduleSave(next);
      return next;
    });
    // This is the typing path (autofocus + type a number directly) — it's
    // the most common way biscuits actually get spent, so it needs the same
    // random-surprise roll as the +/- buttons in adjust(), not just those.
    if (rollTapSurprise()) fireCelebration(TAP_SURPRISE_LINES);
  }

  /** type="number" inputs can race React's re-render when typed quickly
   * (native DOM value outruns the controlled value, producing artifacts
   * like "099"). Plain text + digit-stripping avoids that class of bug. */
  function handleDigitInput(setId: string, raw: string) {
    const digits = raw.replace(/\D/g, "").slice(0, 3);
    setExact(setId, digits === "" ? 0 : parseInt(digits, 10));
  }

  function selectSet(id: string) {
    const next = selectedId === id ? null : id;
    setSelectedId(next);
    if (next) setPoofKey((k) => k + 1);
  }

  function rebalance() {
    if (locked) return;
    suppressPerfectRef.current = true;
    setPicks((prev) => {
      const next = rebalanceTo100(prev);
      scheduleSave(next);
      return next;
    });
    fireCelebration(REBALANCE_LINES);
  }

  function copyFrom(sourceCode: string) {
    if (locked) return;
    if (spent > 0 && !window.confirm("This replaces your current draft for this day. Continue?")) {
      return;
    }
    startTransition(async () => {
      try {
        const copied = await copyAllocationsAction(crewCode, day, sourceCode);
        setPicks(copied);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't copy");
      }
    });
  }

  function lockIn() {
    // Quadratic scoring means unspent biscuits are pure lost voting power —
    // a nudge here (not a block) catches the "forgot to finish" case without
    // punishing someone who genuinely only cares about a couple of sets.
    if (spent > 0 && spent < BISCUIT_BUDGET * 0.7) {
      const ok = window.confirm(
        `You've only spent ${spent}/${BISCUIT_BUDGET} biscuits. Unspent biscuits don't help your picks win close calls — lock in anyway?`
      );
      if (!ok) return;
    }
    // Nobody has to remember to tap Rebalance first — locking in over budget
    // just balances it for you automatically.
    const wasOver = spent > BISCUIT_BUDGET;
    const finalPicks = wasOver ? rebalanceTo100(picks) : picks;
    startTransition(async () => {
      try {
        await lockInAction(crewCode, day, finalPicks);
        if (wasOver) {
          suppressPerfectRef.current = true;
          setPicks(finalPicks);
        }
        setLocked(true);
        fireCelebration(wasOver ? AUTO_BALANCED_LOCK_LINES : LOCK_IN_LINES);
        setTimeout(() => {
          router.push(`/crew/${crewCode}/results/${day}`);
        }, 1700);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Couldn't lock in");
      }
    });
  }

  const selectedSet = selectedId ? sets.find((s) => s.id === selectedId) ?? null : null;

  return (
    <div className="flex flex-col gap-4">
      {celebration && (
        <FunBurst
          key={celebration.id}
          variant={celebration.variant}
          message={celebration.message}
          onDone={() => setCelebration(null)}
        />
      )}

      <div
        ref={topBarRef}
        className="sticky top-0 z-30 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-white/10 sm:-mx-6 sm:px-6"
      >
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted">Disco biscuits spent</p>
            <p
              className={`text-3xl font-black tabular-nums ${
                over ? "text-accent-2" : spent === BISCUIT_BUDGET ? "text-emerald-300" : "text-accent"
              }`}
            >
              {spent}
              <span className="text-base text-muted"> / {BISCUIT_BUDGET}</span>
            </p>
          </div>
          <div className="flex items-center gap-2">
            {!locked && spent > 0 && spent !== BISCUIT_BUDGET && (
              <button
                type="button"
                disabled={pending}
                onClick={rebalance}
                className={`rounded-xl font-bold px-3 py-2.5 text-sm ${
                  over ? "bg-accent-2 text-background" : "bg-white/10"
                }`}
              >
                Rebalance
              </button>
            )}
            {locked ? (
              <button
                type="button"
                onClick={() =>
                  startTransition(async () => {
                    await unlockDayAction(crewCode, day);
                    setLocked(false);
                  })
                }
                className="rounded-xl bg-white/10 font-bold px-4 py-2.5 text-sm"
              >
                Unlock & edit
              </button>
            ) : (
              <button
                type="button"
                disabled={pending}
                onClick={lockIn}
                className="rounded-xl bg-accent text-background font-bold px-4 py-2.5 text-sm disabled:opacity-40"
              >
                Lock in →
              </button>
            )}
          </div>
        </div>
        {over && (
          <p className="text-xs text-muted mt-1">
            {spent - BISCUIT_BUDGET} over — no stress, we&rsquo;ll auto-balance this to
            100 when you lock in. Tap Rebalance if you&rsquo;d rather see it now.
          </p>
        )}
        {error && <p className="text-xs text-red-300 mt-1">{error}</p>}
        {locked && (
          <p className="text-xs text-emerald-300 mt-1">
            Locked in. Unlock to keep adjusting before the crew reveal.
          </p>
        )}
      </div>

      {!locked && copyableCrews.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 -mt-1">
          <span className="text-xs text-muted">Also in:</span>
          {copyableCrews.map((c) => (
            <button
              key={c.code}
              type="button"
              disabled={pending}
              onClick={() => copyFrom(c.code)}
              className="text-xs rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition"
            >
              Copy {c.count} pick{c.count === 1 ? "" : "s"} from {c.name}
            </button>
          ))}
        </div>
      )}

      <div className="flex gap-1 self-center rounded-full bg-white/5 p-1">
        <button
          type="button"
          onClick={() => setView("grid")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            view === "grid" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          Timeline
        </button>
        <button
          type="button"
          onClick={() => setView("list")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            view === "list" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          List
        </button>
      </div>

      {view === "grid" ? (
        <LineupGrid
          sets={sets}
          picks={picks}
          selectedId={selectedId}
          onSelect={selectSet}
          stickyTop={topBarHeight}
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {sets.map((set) => {
            const value = picks[set.id] ?? 0;
            return (
              <li
                key={set.id}
                className={`rounded-xl p-3 bg-card flex items-center gap-3 ${
                  locked ? "opacity-80" : ""
                } ${value > 0 ? "ring-1 ring-accent/50" : ""}`}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                        STAGE_STYLE[set.stage]
                      }`}
                    >
                      {STAGE_LABEL[set.stage]}
                    </span>
                    <span className="text-[11px] text-muted">
                      {minutesToLabel(set.startMin)}–{minutesToLabel(set.endMin)}
                      {set.flexible ? " · drop in anytime" : ""}
                    </span>
                  </div>
                  <p className="font-semibold leading-tight truncate">{set.artist}</p>
                  {set.label && <p className="text-xs text-muted truncate">{set.label}</p>}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <button
                    type="button"
                    disabled={locked || value === 0}
                    onClick={() => adjust(set.id, -5)}
                    className="h-8 w-8 rounded-full bg-white/10 font-bold disabled:opacity-30"
                  >
                    −
                  </button>
                  <input
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    disabled={locked}
                    value={value}
                    onChange={(e) => handleDigitInput(set.id, e.target.value)}
                    className="w-12 text-center bg-transparent font-bold tabular-nums focus:outline-none"
                  />
                  <button
                    type="button"
                    disabled={locked || value >= 100}
                    onClick={() => adjust(set.id, 5)}
                    className="h-8 w-8 rounded-full bg-accent text-background font-bold disabled:opacity-30 disabled:bg-white/10 disabled:text-muted"
                  >
                    +
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {view === "grid" && selectedSet && (
        <div className="sticky bottom-0 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-t border-white/10 sm:-mx-6 sm:px-6">
          <div className="rounded-xl bg-card p-3 flex items-center gap-3">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span
                  className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                    STAGE_STYLE[selectedSet.stage]
                  }`}
                >
                  {STAGE_LABEL[selectedSet.stage]}
                </span>
                <span className="text-[11px] text-muted">
                  {minutesToLabel(selectedSet.startMin)}–{minutesToLabel(selectedSet.endMin)}
                  {selectedSet.flexible ? " · drop in anytime" : ""}
                </span>
              </div>
              <p className="font-semibold leading-tight truncate">{selectedSet.artist}</p>
              {selectedSet.label && (
                <p className="text-xs text-muted truncate">{selectedSet.label}</p>
              )}
            </div>
            <div className="relative flex items-center gap-1.5 shrink-0">
              <MiniPoof trigger={poofKey} />
              <button
                type="button"
                disabled={locked || (picks[selectedSet.id] ?? 0) === 0}
                onClick={() => adjust(selectedSet.id, -5)}
                className="h-9 w-9 rounded-full bg-white/10 font-bold disabled:opacity-30"
              >
                −
              </button>
              <input
                ref={sheetInputRef}
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                disabled={locked}
                value={picks[selectedSet.id] ?? 0}
                onChange={(e) => handleDigitInput(selectedSet.id, e.target.value)}
                className="w-14 text-center bg-transparent font-bold text-lg tabular-nums focus:outline-none"
              />
              <button
                type="button"
                disabled={locked || (picks[selectedSet.id] ?? 0) >= 100}
                onClick={() => adjust(selectedSet.id, 5)}
                className="h-9 w-9 rounded-full bg-accent text-background font-bold disabled:opacity-30 disabled:bg-white/10 disabled:text-muted"
              >
                +
              </button>
            </div>
            <button
              type="button"
              onClick={() => setSelectedId(null)}
              className="text-xs text-muted underline shrink-0"
            >
              Done
            </button>
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={() => router.push(`/crew/${crewCode}`)}
        className="text-sm text-muted underline text-center py-2"
      >
        ← back to crew
      </button>
    </div>
  );
}
