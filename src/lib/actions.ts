"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { Day } from "./lineup";
import { getStore, BISCUIT_BUDGET } from "./store";
import { MemberPrefs, TicketType } from "./store/types";
import { getSessionMember, listOtherCrewSessions, setSessionCookie } from "./session";

function parsePrefs(formData: FormData): MemberPrefs {
  const ticketType = formData.get("ticketType") === "VIP" ? "VIP" : "GA";
  return {
    attending: {
      saturday: formData.has("attendingSaturday"),
      sunday: formData.has("attendingSunday"),
    },
    ticketType: ticketType as TicketType,
  };
}

export async function createCrewAction(formData: FormData) {
  const crewName = String(formData.get("crewName") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!crewName || !displayName) {
    throw new Error("Crew name and your name are both required");
  }
  const prefs = parsePrefs(formData);
  if (!prefs.attending.saturday && !prefs.attending.sunday) {
    throw new Error("Pick at least one day you're attending");
  }

  const store = getStore();
  const crew = await store.createCrew(crewName);
  const member = await store.joinCrew(crew.id, displayName, prefs);
  await setSessionCookie(crew.code, member);
  redirect(`/crew/${crew.code}`);
}

export async function joinCrewAction(formData: FormData) {
  const code = String(formData.get("code") ?? "").trim();
  const displayName = String(formData.get("displayName") ?? "").trim();
  if (!code || !displayName) {
    throw new Error("Crew code and your name are both required");
  }
  const prefs = parsePrefs(formData);
  if (!prefs.attending.saturday && !prefs.attending.sunday) {
    throw new Error("Pick at least one day you're attending");
  }

  const store = getStore();
  const crew = await store.getCrewByCode(code);
  if (!crew) {
    throw new Error(`No crew found with code "${code.toUpperCase()}"`);
  }
  const member = await store.joinCrew(crew.id, displayName, prefs);
  await setSessionCookie(crew.code, member);
  redirect(`/crew/${crew.code}`);
}

async function requireMember(crewCode: string) {
  const store = getStore();
  const crew = await store.getCrewByCode(crewCode);
  if (!crew) throw new Error("Crew not found");
  const member = await getSessionMember(crewCode);
  if (!member || member.crewId !== crew.id) {
    throw new Error("Not signed in to this crew");
  }
  return { store, crew, member };
}

export async function updateMemberPrefsAction(
  crewCode: string,
  prefs: Partial<MemberPrefs>
) {
  const { store, member } = await requireMember(crewCode);
  await store.updateMemberPrefs(member.id, prefs);
  revalidatePath(`/crew/${crewCode}`);
  revalidatePath(`/crew/${crewCode}/allocate/saturday`);
  revalidatePath(`/crew/${crewCode}/allocate/sunday`);
  revalidatePath(`/crew/${crewCode}/results/saturday`);
  revalidatePath(`/crew/${crewCode}/results/sunday`);
}

/** Autosaves a draft. Deliberately unconstrained by the budget — someone
 * weighing relative interest may temporarily go over 100 before rebalancing
 * or trimming; only lockInAction enforces the cap. */
export async function saveAllocationsAction(
  crewCode: string,
  day: Day,
  picks: Record<string, number>
) {
  const { store, member } = await requireMember(crewCode);
  await store.saveAllocations(member.id, day, picks);
  revalidatePath(`/crew/${crewCode}`);
  revalidatePath(`/crew/${crewCode}/allocate/${day}`);
  revalidatePath(`/crew/${crewCode}/results/${day}`);
}

/** Saves + locks. Deliberately does NOT redirect — the client plays a
 * celebration beat first, then navigates itself once it's done. */
export async function lockInAction(
  crewCode: string,
  day: Day,
  picks: Record<string, number>
) {
  const { store, member } = await requireMember(crewCode);
  const total = Object.values(picks).reduce((a, b) => a + b, 0);
  if (total > BISCUIT_BUDGET) {
    throw new Error(`You spent ${total} biscuits — only ${BISCUIT_BUDGET} allowed per day`);
  }
  await store.saveAllocations(member.id, day, picks);
  await store.lockDay(member.id, day);
  revalidatePath(`/crew/${crewCode}`);
  revalidatePath(`/crew/${crewCode}/results/${day}`);
}

export async function unlockDayAction(crewCode: string, day: Day) {
  const { store, member } = await requireMember(crewCode);
  await store.unlockDay(member.id, day);
  revalidatePath(`/crew/${crewCode}`);
  revalidatePath(`/crew/${crewCode}/allocate/${day}`);
}

/** Copies the caller's own picks for `day` from another crew they hold a
 * session for into the target crew. Verified server-side via that crew's
 * own session cookie — never trusts a client-supplied member id. */
export async function copyAllocationsAction(
  crewCode: string,
  day: Day,
  sourceCrewCode: string
): Promise<Record<string, number>> {
  const { store, member } = await requireMember(crewCode);

  const others = await listOtherCrewSessions(crewCode);
  const source = others.find(
    (o) => o.crewCode.toUpperCase() === sourceCrewCode.toUpperCase()
  );
  if (!source) throw new Error("Not signed in to that crew");

  const picks = await store.getAllocations(source.memberId, day);
  await store.saveAllocations(member.id, day, picks);
  revalidatePath(`/crew/${crewCode}`);
  revalidatePath(`/crew/${crewCode}/allocate/${day}`);
  return picks;
}
