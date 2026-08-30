import { Day } from "../lineup";

export type TicketType = "GA" | "VIP";

export interface Crew {
  id: string;
  code: string;
  name: string;
  createdAt: string;
}

export interface MemberPrefs {
  attending: Record<Day, boolean>;
  ticketType: TicketType;
}

export interface CrewMember extends MemberPrefs {
  id: string;
  crewId: string;
  displayName: string;
  sessionToken: string;
  createdAt: string;
}

export interface MemberDayStatus {
  memberId: string;
  displayName: string;
  ticketType: TicketType;
  attending: Record<Day, boolean>;
  spent: Record<Day, number>;
  locked: Record<Day, boolean>;
}

export const BISCUIT_BUDGET = 100;

export const DEFAULT_PREFS: MemberPrefs = {
  attending: { saturday: true, sunday: true },
  ticketType: "GA",
};

export interface Store {
  createCrew(name: string): Promise<Crew>;
  getCrewByCode(code: string): Promise<Crew | null>;

  /** Joins by display name; resumes the same member row if that name already exists
   * in the crew (prefs are only applied when a new row is created). */
  joinCrew(crewId: string, displayName: string, prefs: MemberPrefs): Promise<CrewMember>;
  getMemberById(memberId: string): Promise<CrewMember | null>;
  verifyMember(memberId: string, token: string): Promise<CrewMember | null>;
  listMembers(crewId: string): Promise<CrewMember[]>;
  updateMemberPrefs(memberId: string, prefs: Partial<MemberPrefs>): Promise<void>;

  getAllocations(memberId: string, day: Day): Promise<Record<string, number>>;
  /** Full overwrite of a member's picks for a day. Throws if total exceeds the budget. */
  saveAllocations(
    memberId: string,
    day: Day,
    picks: Record<string, number>
  ): Promise<void>;

  lockDay(memberId: string, day: Day): Promise<void>;
  unlockDay(memberId: string, day: Day): Promise<void>;
  isLocked(memberId: string, day: Day): Promise<boolean>;

  /** Locked allocations for a day, keyed by display name — used for scoring. */
  getCrewAllocationsForDay(
    crewId: string,
    day: Day
  ): Promise<Record<string, Record<string, number>>>;

  getStatusBoard(crewId: string): Promise<MemberDayStatus[]>;
}
