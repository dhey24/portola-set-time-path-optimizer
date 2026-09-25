import { cookies } from "next/headers";
import { CrewMember, Store } from "./store/types";
import { getStore } from "./store";

function cookieName(crewCode: string): string {
  return `pma_${crewCode.toUpperCase()}`;
}

export async function setSessionCookie(crewCode: string, member: CrewMember) {
  const jar = await cookies();
  jar.set(cookieName(crewCode), `${member.id}.${member.sessionToken}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 120, // 120 days — this is a multi-week planning tool
  });
}

export async function getSessionMember(crewCode: string): Promise<CrewMember | null> {
  const jar = await cookies();
  const raw = jar.get(cookieName(crewCode))?.value;
  if (!raw) return null;
  const [memberId, token] = raw.split(".");
  if (!memberId || !token) return null;
  return getStore().verifyMember(memberId, token);
}

export interface OtherCrewSession {
  crewCode: string;
  crewName: string;
  displayName: string;
  memberId: string;
}

/** Pure resolver, independent of next/headers, so it's directly unit-testable:
 * given raw cookie pairs, verify each `pma_*` one against the store and
 * return the crews it actually authenticates. */
export async function resolveOtherCrewSessions(
  cookiePairs: { name: string; value: string }[],
  excludeCode: string,
  store: Store
): Promise<OtherCrewSession[]> {
  const results: OtherCrewSession[] = [];
  for (const c of cookiePairs) {
    if (!c.name.startsWith("pma_")) continue;
    const code = c.name.slice(4);
    if (code.toUpperCase() === excludeCode.toUpperCase()) continue;
    const [memberId, token] = c.value.split(".");
    if (!memberId || !token) continue;
    const member = await store.verifyMember(memberId, token);
    if (!member) continue;
    const crew = await store.getCrewByCode(code);
    if (!crew || crew.id !== member.crewId) continue;
    results.push({
      crewCode: crew.code,
      crewName: crew.name,
      displayName: member.displayName,
      memberId: member.id,
    });
  }
  return results;
}

/** Every other crew this browser holds a valid session cookie for — used to
 * offer "copy my picks from another crew" without any real login system. */
export async function listOtherCrewSessions(excludeCode: string): Promise<OtherCrewSession[]> {
  const jar = await cookies();
  return resolveOtherCrewSessions(jar.getAll(), excludeCode, getStore());
}

/** Every crew this browser holds a valid session cookie for — surfaced on the
 * homepage so returning visitors can jump back into a crew without needing
 * the original link, and without re-joining under a new name by mistake. */
export async function listAllCrewSessions(): Promise<OtherCrewSession[]> {
  const jar = await cookies();
  return resolveOtherCrewSessions(jar.getAll(), "", getStore());
}
