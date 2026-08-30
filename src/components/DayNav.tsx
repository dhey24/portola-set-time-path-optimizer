import Link from "next/link";
import { Day } from "@/lib/lineup";

export function DayNav({
  crewCode,
  crewName,
  day,
  base,
  suffix,
  backLabel,
  backHref,
}: {
  crewCode: string;
  crewName: string;
  day: Day;
  base: "allocate" | "results";
  /** Appended after the day segment, e.g. "scores" for the results/[day]/scores page. */
  suffix?: string;
  /** Overrides the back-link text (defaults to the crew name). */
  backLabel?: string;
  /** Overrides where the back-link points (defaults to the crew dashboard). */
  backHref?: string;
}) {
  const path = (d: Day) => `/crew/${crewCode}/${base}/${d}${suffix ? `/${suffix}` : ""}`;
  return (
    <div className="flex items-center justify-between gap-2 pb-1">
      <Link
        href={backHref ?? `/crew/${crewCode}`}
        className="text-sm text-muted underline shrink-0"
      >
        ← {backLabel ?? crewName}
      </Link>
      <div className="flex gap-1 rounded-full bg-white/5 p-1 shrink-0">
        <Link
          href={path("saturday")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            day === "saturday" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          Sat
        </Link>
        <Link
          href={path("sunday")}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition ${
            day === "sunday" ? "bg-accent text-background" : "text-muted"
          }`}
        >
          Sun
        </Link>
      </div>
    </div>
  );
}
