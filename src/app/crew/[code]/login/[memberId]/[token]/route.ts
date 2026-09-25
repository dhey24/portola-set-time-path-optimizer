import { NextRequest, NextResponse } from "next/server";
import { getStore } from "@/lib/store";
import { setSessionCookie } from "@/lib/session";

/** Founder-generated personal recovery link — sets the visitor's session
 * cookie straight to this member, the same way a normal join does, without
 * needing the exact original display name or browser DevTools. The link
 * itself is the credential (same trust level as the session cookie it
 * sets), so it's only ever surfaced to the crew's founder to hand to the
 * right person directly — see the founder-only "Copy login link" button on
 * the crew page. */
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ code: string; memberId: string; token: string }> }
) {
  const { code, memberId, token } = await params;
  const store = getStore();
  const crew = await store.getCrewByCode(code);
  if (!crew) {
    return NextResponse.redirect(new URL("/", _req.url));
  }

  const member = await store.verifyMember(memberId, token);
  if (!member || member.crewId !== crew.id) {
    return NextResponse.redirect(new URL(`/crew/${crew.code}`, _req.url));
  }

  await setSessionCookie(crew.code, member);
  return NextResponse.redirect(new URL(`/crew/${crew.code}`, _req.url));
}
