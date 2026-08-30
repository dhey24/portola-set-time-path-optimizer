import { notFound, redirect } from "next/navigation";
import { getStore } from "@/lib/store";
import { getSessionMember, listOtherCrewSessions } from "@/lib/session";
import { DAY_LABEL, Day, LINEUP } from "@/lib/lineup";
import { BiscuitAllocator } from "@/components/BiscuitAllocator";
import { MyPlanEditor } from "@/components/MyPlanEditor";
import { DayNav } from "@/components/DayNav";

export default async function AllocatePage({
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

  if (!member.attending[day]) {
    return (
      <main className="flex flex-1 flex-col gap-4 pt-2">
        <DayNav crewCode={crew.code} crewName={crew.name} day={day} base="allocate" />
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
          <p className="text-4xl">🏖️</p>
          <h1 className="poster-heading text-2xl">Not attending {DAY_LABEL[day]}</h1>
          <p className="text-muted text-sm max-w-xs">
            You marked yourself out for this day. Flip it back if plans changed.
          </p>
          <MyPlanEditor
            crewCode={crew.code}
            attending={member.attending}
            ticketType={member.ticketType}
          />
        </div>
      </main>
    );
  }

  const [picks, locked, otherCrews] = await Promise.all([
    store.getAllocations(member.id, day),
    store.isLocked(member.id, day),
    listOtherCrewSessions(crew.code),
  ]);

  const copyableCrews = (
    await Promise.all(
      otherCrews.map(async (o) => {
        const theirPicks = await store.getAllocations(o.memberId, day);
        const count = Object.keys(theirPicks).length;
        return count > 0 ? { code: o.crewCode, name: o.crewName, count } : null;
      })
    )
  ).filter((c): c is { code: string; name: string; count: number } => c !== null);

  const sets = [...LINEUP[day]].sort((a, b) => a.startMin - b.startMin);

  return (
    <main className="flex flex-1 flex-col gap-4">
      <div className="pt-2">
        <DayNav crewCode={crew.code} crewName={crew.name} day={day} base="allocate" />
        <h1 className="poster-heading text-2xl">{DAY_LABEL[day]}</h1>
        <p className="text-sm text-muted">
          100 disco biscuits, spend them however feels right. Nobody in your
          crew can see this until you lock in.
        </p>
        <p className="text-xs text-accent mt-1">
          Don&rsquo;t sweat hitting exactly 100 as you go — spend freely and
          we&rsquo;ll automatically balance everything to 100 the moment you lock in.
        </p>
      </div>
      <BiscuitAllocator
        crewCode={crew.code}
        day={day}
        sets={sets}
        initialPicks={picks}
        initiallyLocked={locked}
        copyableCrews={copyableCrews}
      />
    </main>
  );
}
