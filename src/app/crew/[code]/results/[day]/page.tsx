import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { getSessionMember } from "@/lib/session";
import { DAY_LABEL, Day, minutesToLabel } from "@/lib/lineup";
import { buildPaths, scoreSets } from "@/lib/optimizer";
import { PathCard } from "@/components/PathCard";
import { DayNav } from "@/components/DayNav";
import { STAGE_LABEL, STAGE_STYLE } from "@/lib/stageStyle";

export default async function ResultsPage({
  params,
}: {
  params: Promise<{ code: string; day: string }>;
}) {
  const { code, day: dayParam } = await params;
  if (dayParam !== "saturday" && dayParam !== "sunday") notFound();
  const day = dayParam as Day;

  const store = getStore();
  const crew = await store.getCrewByCode(code);
  if (!crew) notFound();

  const member = await getSessionMember(crew.code);
  if (!member) redirect(`/crew/${crew.code}`);

  const attendingThisDay = member.attending[day];
  const myLocked = attendingThisDay ? await store.isLocked(member.id, day) : true;
  if (attendingThisDay && !myLocked) {
    return (
      <main className="flex flex-1 flex-col gap-4 pt-2">
        <DayNav crewCode={crew.code} crewName={crew.name} day={day} base="results" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">🙈</p>
          <h1 className="poster-heading text-2xl">Lock in first, no peeking</h1>
          <p className="text-muted text-sm max-w-xs">
            Paths for {DAY_LABEL[day]} unlock once you&rsquo;ve spent your own biscuits.
            It keeps the vote honest.
          </p>
          <Link
            href={`/crew/${crew.code}/allocate/${day}`}
            className="rounded-xl bg-accent text-background font-bold px-5 py-3"
          >
            Go spend biscuits
          </Link>
        </div>
      </main>
    );
  }

  const [allocations, board] = await Promise.all([
    store.getCrewAllocationsForDay(crew.id, day),
    store.getStatusBoard(crew.id),
  ]);
  const attendees = board.filter((b) => b.attending[day]);
  const lockedCount = attendees.filter((b) => b.locked[day]).length;
  const pace = attendees.length > 0 && attendees.every((b) => b.ticketType === "VIP")
    ? "VIP"
    : "GA";
  const { paths, wildcards } = buildPaths(day, allocations, pace);
  const rawScores = [...scoreSets(day, allocations)].sort((a, b) => b.hype - a.hype);

  return (
    <main className="flex flex-1 flex-col gap-5 pt-2">
      <DayNav crewCode={crew.code} crewName={crew.name} day={day} base="results" />
      <header>
        <h1 className="poster-heading text-2xl">{DAY_LABEL[day]} paths</h1>
        <p className="text-sm text-muted">
          Based on {lockedCount} locked-in crew member{lockedCount === 1 ? "" : "s"} of{" "}
          {attendees.length} attending ·{" "}
          {pace === "VIP" ? "VIP pace" : "GA pace"} walk times
          {pace === "GA" && attendees.some((b) => b.ticketType === "VIP")
            ? " (mixed tickets — using the slower pace so nobody's left behind)"
            : ""}
          . Recomputes live as more people lock in — check back later for a sharper picture.
        </p>
        {!attendingThisDay && (
          <p className="text-xs text-accent-2 mt-1">
            You&rsquo;re not marked as attending {DAY_LABEL[day]} — showing the group&rsquo;s plan anyway.
          </p>
        )}
        <p className="text-xs text-accent mt-2 bg-card/60 rounded-xl px-3 py-2">
          🔥🏃🤝 3 path styles below, each optimizing for something different —
          expand any of them to compare. Tap a title to collapse it.
        </p>
      </header>

      <section className="flex flex-col gap-3">
        {paths.map((path) => (
          <PathCard
            key={path.key}
            path={path}
            expanded
            crewName={crew.name}
            dayLabel={DAY_LABEL[day]}
          />
        ))}
      </section>

      {wildcards.length > 0 && (
        <section className="bg-card/60 rounded-2xl p-4 space-y-2">
          <h2 className="poster-heading text-sm text-muted">Wildcard hangouts</h2>
          <p className="text-xs text-muted">
            No hard schedule — swing by whenever there&rsquo;s a gap.
          </p>
          {wildcards.map((w) => (
            <div key={w.set.id} className="flex items-center justify-between text-sm">
              <span>
                {w.set.artist}
                {w.set.artist !== STAGE_LABEL[w.set.stage] && (
                  <span className="text-muted text-xs"> ({STAGE_LABEL[w.set.stage]})</span>
                )}
              </span>
              <span className="text-xs text-muted">{w.backers} into it</span>
            </div>
          ))}
        </section>
      )}

      <details className="bg-card/60 rounded-2xl p-4">
        <summary className="poster-heading text-sm text-muted cursor-pointer">
          Raw crew scores (anonymized)
        </summary>
        <div className="flex items-start justify-between gap-2 mt-2 mb-3">
          <p className="text-xs text-muted">
            Every set on {DAY_LABEL[day]}, sorted by hype score. No names — just
            how many locked-in crew members backed it and how many biscuits it pulled.
          </p>
          <Link
            href={`/crew/${crew.code}/results/${day}/scores`}
            className="text-xs text-accent underline shrink-0"
          >
            View as schedule →
          </Link>
        </div>
        <div className="space-y-1">
          {rawScores.map((s) => (
            <div
              key={s.set.id}
              className="flex items-center justify-between gap-2 text-xs py-1.5 border-b border-white/5 last:border-0"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={`shrink-0 text-[9px] font-bold uppercase rounded-full px-1.5 py-0.5 ${STAGE_STYLE[s.set.stage]}`}
                >
                  {STAGE_LABEL[s.set.stage]}
                </span>
                <span className="truncate">{s.set.artist}</span>
                <span className="text-muted shrink-0 hidden sm:inline">
                  {minutesToLabel(s.set.startMin)}
                </span>
              </div>
              <span className="text-muted tabular-nums shrink-0">
                {s.backers} {s.backers === 1 ? "person" : "people"} · {s.totalBiscuits}bp ·{" "}
                {Math.round(s.hype)}hp
              </span>
            </div>
          ))}
        </div>
      </details>

      <p className="text-xs text-muted text-center pt-2">
        This is a starting point, not a contract. Wander off-script, deviate freely, regroup at Despacio.
      </p>
    </main>
  );
}
