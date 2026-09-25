"use client";

import { useState, useSyncExternalStore } from "react";
import { Day } from "@/lib/lineup";

function noopSubscribe() {
  return () => {};
}

export function LineupChangeNotice({
  crewCode,
  day,
  changes,
}: {
  crewCode: string;
  day: Day;
  changes: { id: string; artist: string; was: string; now: string }[];
}) {
  // Dismissal is keyed by the exact set of changed ids, so a *future* poster
  // correction (different ids) surfaces again even if an earlier one was dismissed.
  const dismissKey = `dismissedLineupChange:${crewCode}:${day}:${changes
    .map((c) => c.id)
    .sort()
    .join(",")}`;

  // localStorage isn't available during SSR and doesn't notify same-tab
  // writers, so this only needs to read once per mount — useSyncExternalStore
  // gives a hydration-safe read (hidden on the server, real value on the
  // client) without the cascading-render issue a useEffect+setState would have.
  const storedDismissed = useSyncExternalStore(
    noopSubscribe,
    () => {
      try {
        return localStorage.getItem(dismissKey) === "1";
      } catch {
        return false;
      }
    },
    () => true
  );
  const [justDismissed, setJustDismissed] = useState(false);

  if (storedDismissed || justDismissed || changes.length === 0) return null;

  return (
    <div className="rounded-xl border border-accent/40 bg-accent/10 p-3 space-y-2 text-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-accent">
          ⏰ {changes.length === 1 ? "A set you picked moved" : `${changes.length} sets you picked moved`}
        </p>
        <button
          type="button"
          onClick={() => {
            try {
              localStorage.setItem(dismissKey, "1");
            } catch {}
            setJustDismissed(true);
          }}
          className="text-muted hover:text-foreground shrink-0"
          aria-label="Dismiss"
        >
          ✕
        </button>
      </div>
      <ul className="text-muted space-y-0.5">
        {changes.map((c) => (
          <li key={c.id}>
            <span className="text-foreground">{c.artist}</span>: {c.was} → {c.now}
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted">
        Worth a quick look — your plan might make more (or less) sense now.
      </p>
    </div>
  );
}
