import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { getSessionMember } from "@/lib/session";
import { DAY_LABEL, Day } from "@/lib/lineup";
import { scoreSets } from "@/lib/optimizer";
import { DayNav } from "@/components/DayNav";
import { ScoreGrid } from "@/components/ScoreGrid";

export default async function ScoresPage({
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
    redirect(`/crew/${crew.code}/results/${day}`);
  }

  const allocations = await store.getCrewAllocationsForDay(crew.id, day);
  const scores = scoreSets(day, allocations);

  return (
    <main className="flex flex-1 flex-col gap-4 pt-2">
      <DayNav
        crewCode={crew.code}
        crewName={crew.name}
        day={day}
        base="results"
        suffix="scores"
        backLabel={`${DAY_LABEL[day]} paths`}
        backHref={`/crew/${crew.code}/results/${day}`}
      />
      <header>
        <h1 className="poster-heading text-2xl">Raw scores</h1>
        <p className="text-sm text-muted">
          Same schedule, colored by crew interest instead of your picks. No
          names — anonymized headcount and points per set.
        </p>
      </header>

      <ScoreGrid scores={scores} />
    </main>
  );
}
