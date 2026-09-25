import { CrewMember } from "./store/types";

/** The crew's founder is whoever joined first — there's no separate role to
 * assign, so this is inferred rather than stored. Used to gate the "remove
 * a duplicate member" control to one person per crew. */
export function founderMemberId(members: CrewMember[]): string | null {
  if (members.length === 0) return null;
  return members.reduce((oldest, m) =>
    new Date(m.createdAt) < new Date(oldest.createdAt) ? m : oldest
  ).id;
}
