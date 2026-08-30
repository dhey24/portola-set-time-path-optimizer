import { PathResult } from "@/lib/optimizer";
import { minutesToLabel } from "@/lib/lineup";
import { STAGE_STYLE, STAGE_LABEL } from "@/lib/stageStyle";
import { SavePathImage } from "@/components/SavePathImage";

const EMOJI: Record<PathResult["key"], string> = {
  hype: "🔥",
  completionist: "🏃",
  consensus: "🤝",
};

export function PathCard({
  path,
  expanded,
  crewName,
  dayLabel,
}: {
  path: PathResult;
  expanded?: boolean;
  crewName: string;
  dayLabel: string;
}) {
  return (
    <details open={expanded} className="bg-card rounded-2xl p-4 space-y-3 group">
      <summary className="flex items-center justify-between cursor-pointer list-none">
        <div>
          <p className="poster-heading text-lg">
            {EMOJI[path.key]} {path.title}
          </p>
          <p className="text-xs text-muted">{path.vibe}</p>
        </div>
        <span className="text-xs text-muted shrink-0 pl-2 group-open:rotate-180 transition">
          ▾
        </span>
      </summary>

      {path.stops.length === 0 ? (
        <p className="text-sm text-muted">Not enough locked-in picks yet to build a path.</p>
      ) : (
        <ol className="space-y-2 pt-1">
          {path.stops.map((stop, i) => (
            <li key={stop.set.id} className="flex gap-3">
              <div className="flex flex-col items-center pt-1">
                <span className="h-2.5 w-2.5 rounded-full bg-accent" />
                {i < path.stops.length - 1 && (
                  <span className="w-px flex-1 bg-white/15 my-1" />
                )}
              </div>
              <div className="flex-1 pb-2">
                {stop.walkFromPrevMin > 0 && (
                  <p className="text-[11px] text-muted mb-1">
                    🚶 ~{stop.walkFromPrevMin} min walk
                  </p>
                )}
                <div className="flex items-center gap-2 flex-wrap">
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide rounded-full px-2 py-0.5 ${
                      STAGE_STYLE[stop.set.stage]
                    }`}
                  >
                    {STAGE_LABEL[stop.set.stage]}
                  </span>
                  <span className="text-[11px] text-muted">
                    {minutesToLabel(stop.set.startMin)}–{minutesToLabel(stop.set.endMin)}
                  </span>
                </div>
                <p className="font-semibold leading-tight">{stop.set.artist}</p>
                <p className="text-[11px] text-muted">
                  {stop.score.backers} of the crew are into it
                  {stop.score.backers > 0 ? ` · ${stop.score.totalBiscuits} biscuits` : ""}
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}

      {path.stops.length > 0 && (
        <div className="pt-1">
          <SavePathImage crewName={crewName} dayLabel={dayLabel} path={path} />
        </div>
      )}
    </details>
  );
}
