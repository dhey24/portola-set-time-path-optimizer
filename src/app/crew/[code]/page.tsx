import Link from "next/link";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { getStore, BISCUIT_BUDGET } from "@/lib/store";
import { getSessionMember } from "@/lib/session";
import { joinCrewAction } from "@/lib/actions";
import { DAY_LABEL, Day, RECENT_LINEUP_CHANGES } from "@/lib/lineup";
import { CopyButton } from "@/components/CopyButton";
import { ShareCrewLink } from "@/components/ShareCrewLink";
import { MyPlanEditor } from "@/components/MyPlanEditor";
import { PrefsFields } from "@/components/PrefsFields";
import { SubmitButton } from "@/components/SubmitButton";
import { RemoveMemberButton } from "@/components/RemoveMemberButton";
import { LineupChangeNotice } from "@/components/LineupChangeNotice";
import { founderMemberId } from "@/lib/crew";

/** Built from the actual incoming request, not an env var — so it's always
 * correct for wherever this happens to be running (localhost, a Vercel
 * preview URL, or a future custom domain) with zero config. */
async function currentOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const DAYS: Day[] = ["saturday", "sunday"];

export default async function CrewPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const store = getStore();
  const crew = await store.getCrewByCode(code);
  if (!crew) notFound();

  const member = await getSessionMember(crew.code);

  if (!member) {
    return (
      <main className="flex flex-1 flex-col gap-6 pt-10">
        <header className="text-center space-y-1">
          <p className="text-accent font-semibold text-sm">CREW {crew.code}</p>
          <h1 className="poster-heading text-3xl">{crew.name}</h1>
          <p className="text-muted text-sm">Enter your name to hop in.</p>
        </header>
        <form action={joinCrewAction} className="space-y-3 bg-card rounded-2xl p-5">
          <input type="hidden" name="code" value={crew.code} />
          <input
            name="displayName"
            required
            placeholder="Your name"
            className="w-full rounded-xl bg-background/60 border border-white/10 px-4 py-3 placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <PrefsFields />
          <SubmitButton
            pendingLabel="Joining…"
            className="w-full rounded-xl bg-accent text-background font-bold py-3"
          >
            Join {crew.name}
          </SubmitButton>
        </form>
      </main>
    );
  }

  const [board, origin, members, satPicks, sunPicks] = await Promise.all([
    store.getStatusBoard(crew.id),
    currentOrigin(),
    store.listMembers(crew.id),
    store.getAllocations(member.id, "saturday"),
    store.getAllocations(member.id, "sunday"),
  ]);
  const mine = board.find((b) => b.memberId === member.id);
  const joinUrl = `${origin}/crew/${crew.code}`;
  const founderId = founderMemberId(members);
  const isFounder = member.id === founderId;
  const picksByDay: Record<Day, Record<string, number>> = {
    saturday: satPicks,
    sunday: sunPicks,
  };
  const membersById = new Map(members.map((m) => [m.id, m]));

  return (
    <main className="flex flex-1 flex-col gap-6 pt-4">
      <header className="text-center space-y-2">
        <p className="text-accent font-semibold text-sm">Welcome back, {member.displayName}</p>
        <h1 className="poster-heading text-3xl">{crew.name}</h1>
        <div className="flex items-center justify-center gap-2">
          <span className="text-muted text-sm">Crew code</span>
          <span className="font-mono tracking-widest bg-white/10 rounded-full px-3 py-1 text-sm">
            {crew.code}
          </span>
          <CopyButton value={crew.code} label="Copy code" />
        </div>
        <div className="flex justify-center">
          <ShareCrewLink crewName={crew.name} joinUrl={joinUrl} />
        </div>
        <div className="flex justify-center pt-1">
          <MyPlanEditor
            crewCode={crew.code}
            attending={member.attending}
            ticketType={member.ticketType}
          />
        </div>
      </header>

      <section className="space-y-4">
        {DAYS.map((day) => {
          const attending = mine?.attending[day] ?? member.attending[day];
          const spent = mine?.spent[day] ?? 0;
          const locked = mine?.locked[day] ?? false;
          const attendingCount = board.filter((b) => b.attending[day]).length;
          const lockedCount = board.filter((b) => b.attending[day] && b.locked[day]).length;

          if (!attending) {
            return (
              <div key={day} className="bg-card/40 rounded-2xl p-5 space-y-1">
                <div className="flex items-center justify-between">
                  <h2 className="poster-heading text-lg text-muted">{DAY_LABEL[day]}</h2>
                  <span className="text-xs text-muted">not attending</span>
                </div>
                <p className="text-sm text-muted">
                  Sitting this day out — flip the {day === "saturday" ? "Sat" : "Sun"} switch
                  above if that changes.
                </p>
              </div>
            );
          }

          const myChanges = RECENT_LINEUP_CHANGES.filter(
            (c) => c.day === day && (picksByDay[day][c.id] ?? 0) > 0
          );

          return (
            <div key={day} className="bg-card rounded-2xl p-5 space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="poster-heading text-lg">{DAY_LABEL[day]}</h2>
                <span className="text-xs text-muted">
                  {lockedCount}/{attendingCount} locked in
                </span>
              </div>
              <p className="text-sm text-muted">
                {locked
                  ? `You locked in — ${spent}/${BISCUIT_BUDGET} biscuits spent.`
                  : `You've spent ${spent}/${BISCUIT_BUDGET} biscuits. Not locked yet.`}
              </p>
              {myChanges.length > 0 && (
                <LineupChangeNotice crewCode={crew.code} day={day} changes={myChanges} />
              )}
              <div className="flex gap-2">
                <Link
                  href={`/crew/${crew.code}/allocate/${day}`}
                  className="flex-1 text-center rounded-xl bg-accent text-background font-bold py-2.5 text-sm"
                >
                  {locked ? "Edit picks" : "Spend biscuits"}
                </Link>
                <Link
                  href={`/crew/${crew.code}/results/${day}`}
                  className="flex-1 text-center rounded-xl bg-white/10 font-bold py-2.5 text-sm"
                >
                  See paths
                </Link>
              </div>
            </div>
          );
        })}
      </section>

      <section className="bg-card/60 rounded-2xl p-5 space-y-2">
        <h2 className="poster-heading text-sm text-muted">Who&rsquo;s in {crew.name}</h2>
        {isFounder && (
          <p className="text-xs text-muted">
            You started this crew — you can copy someone a link back into their own
            profile (handy if they lose their session) or remove a duplicate below.
          </p>
        )}
        <ul className="flex flex-wrap gap-2">
          {board.map((b) => {
            const target = membersById.get(b.memberId);
            const loginUrl = target ? `${origin}/crew/${crew.code}/login/${target.id}/${target.sessionToken}` : null;
            return (
              <li
                key={b.memberId}
                className="text-xs bg-white/10 rounded-full px-3 py-1 flex items-center gap-1"
              >
                {b.memberId === founderId && <span title="Started this crew">👑</span>}
                {b.displayName}
                <span className="text-muted">({b.ticketType})</span>
                {b.attending.saturday && (b.locked.saturday ? "🪩" : "")}
                {b.attending.sunday && (b.locked.sunday ? "🌙" : "")}
                {isFounder && loginUrl && (
                  <CopyButton value={loginUrl} label="🔗" />
                )}
                {isFounder && b.memberId !== member.id && (
                  <RemoveMemberButton
                    crewCode={crew.code}
                    memberId={b.memberId}
                    displayName={b.displayName}
                  />
                )}
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
