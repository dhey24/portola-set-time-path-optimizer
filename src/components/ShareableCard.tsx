import { PathResult } from "@/lib/optimizer";
import { minutesToLabel } from "@/lib/lineup";
import { STAGE_LABEL } from "@/lib/stageStyle";

// Fixed 9:16 canvas (Instagram-story shaped) — sized in real px so
// html-to-image rasterizes a consistent, no-scroll result regardless of the
// device it was generated on.
export const CARD_WIDTH = 1080;
export const CARD_HEIGHT = 1920;

const STAGE_HEX: Record<string, { bg: string; ink: string }> = {
  pier: { bg: "#364ba8", ink: "#ffffff" },
  crane: { bg: "#d9662c", ink: "#241503" },
  warehouse: { bg: "#e8c22e", ink: "#241f04" },
  shiptent: { bg: "#2f6b45", ink: "#ffffff" },
  despacio: { bg: "#8a3fa8", ink: "#ffffff" },
};

const EMOJI: Record<PathResult["key"], string> = {
  hype: "🔥",
  completionist: "🏃",
  consensus: "🤝",
};

type SizeTier = { row: number; font: number; time: number; badge: number; gap: number };

// Fixed chrome above/below the stop list — used to estimate how much height
// is actually free, so a short path's rows stretch to fill the card instead
// of leaving a dead gap (this is an estimate, not exact: the list container
// uses justify-content: flex-start, so any error just leaves trailing
// whitespace before the footer rather than an awkward centered gap).
const AVAILABLE_HEIGHT = 1330;

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function tierFor(count: number): SizeTier {
  const gap = clamp(24 - count, 6, 22);
  // Row height is allowed to grow generously for short paths (filling the
  // card instead of leaving dead space below the list) — text size is capped
  // separately below so it doesn't grow into something absurd.
  const row = clamp((AVAILABLE_HEIGHT - gap * (count - 1)) / count, 60, 380);
  return {
    row,
    gap,
    font: clamp(row * 0.23, 18, 36),
    time: clamp(row * 0.15, 14, 26),
    badge: clamp(row * 0.13, 13, 22),
  };
}

export function ShareableCard({
  crewName,
  dayLabel,
  path,
  appUrl,
}: {
  crewName: string;
  dayLabel: string;
  path: PathResult;
  appUrl: string;
}) {
  // Realistically a day's path tops out well under this (travel time between
  // stages bounds how many stops fit in ~9.5 hours) — this is just a safety
  // net so an extreme case never silently overflows the fixed-height card.
  const MAX_DISPLAYED_STOPS = 19;
  const overflow = path.stops.length > MAX_DISPLAYED_STOPS;
  const stops = overflow ? path.stops.slice(0, MAX_DISPLAYED_STOPS) : path.stops;
  const rowCount = stops.length + (overflow ? 1 : 0);
  const t = tierFor(rowCount);

  return (
    <div
      style={{
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        background: "#16205c",
        backgroundImage:
          "radial-gradient(circle at 20% 8%, rgba(255,255,255,0.08), transparent 40%), radial-gradient(circle at 85% 65%, rgba(255,255,255,0.06), transparent 45%), radial-gradient(rgba(255,255,255,0.16) 1.4px, transparent 1.4px)",
        backgroundSize: "auto, auto, 36px 36px",
        color: "#f4f2ea",
        fontFamily: "ui-sans-serif, system-ui, -apple-system, sans-serif",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        padding: "72px 64px 48px",
        position: "relative",
      }}
    >
      <div style={{ textAlign: "center" }}>
        <p
          style={{
            color: "#ffd23f",
            fontWeight: 700,
            fontSize: 26,
            letterSpacing: 1,
            margin: 0,
          }}
        >
          🪩 PORTOLA 2026 · {dayLabel.toUpperCase()}
        </p>
        <h1
          className="poster-heading"
          style={{ fontSize: 76, margin: "18px 0 6px", lineHeight: 0.95 }}
        >
          {EMOJI[path.key]} {path.title}
        </h1>
        <p style={{ color: "#a6adde", fontSize: 27, margin: 0, fontWeight: 600 }}>
          {crewName}&rsquo;s pick
        </p>
      </div>

      <div
        style={{
          flex: 1,
          marginTop: 44,
          display: "flex",
          flexDirection: "column",
          justifyContent: "flex-start",
          gap: t.gap,
        }}
      >
        {stops.map((stop) => {
          const colors = STAGE_HEX[stop.set.stage];
          return (
            <div
              key={stop.set.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 24,
                height: t.row,
                background: "rgba(255,255,255,0.06)",
                borderRadius: 20,
                padding: "0 28px",
              }}
            >
              <div
                style={{
                  flexShrink: 0,
                  background: colors.bg,
                  color: colors.ink,
                  fontWeight: 800,
                  fontSize: t.badge,
                  textTransform: "uppercase",
                  borderRadius: 999,
                  padding: "6px 16px",
                }}
              >
                {STAGE_LABEL[stop.set.stage]}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <p
                  style={{
                    margin: 0,
                    fontWeight: 800,
                    fontSize: t.font,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {stop.set.artist}
                </p>
              </div>
              <div
                style={{
                  flexShrink: 0,
                  color: "#a6adde",
                  fontSize: t.time,
                  fontWeight: 600,
                  textAlign: "right",
                }}
              >
                {minutesToLabel(stop.set.startMin)}
              </div>
            </div>
          );
        })}
        {overflow && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: t.row,
              background: "rgba(255,255,255,0.06)",
              borderRadius: 20,
              color: "#a6adde",
              fontWeight: 700,
              fontSize: t.font,
            }}
          >
            +{path.stops.length - MAX_DISPLAYED_STOPS} more
          </div>
        )}
      </div>

      <div
        style={{
          textAlign: "center",
          paddingTop: 28,
          borderTop: "1px solid rgba(255,255,255,0.15)",
        }}
      >
        <p style={{ margin: 0, fontSize: 22, color: "#a6adde" }}>
          🪩 tastefully made with disco biscuits · {appUrl}
        </p>
      </div>
    </div>
  );
}
