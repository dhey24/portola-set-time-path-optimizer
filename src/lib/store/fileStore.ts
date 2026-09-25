import { randomUUID } from "crypto";
import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { Day } from "../lineup";
import { Crew, CrewMember, MemberDayStatus, MemberPrefs, Store } from "./types";

// Local-only JSON-file persistence so `npm run dev` works with zero external
// setup. NEVER used in production — Vercel's filesystem is ephemeral/read-only,
// so deployment must set SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY instead.
if (process.env.NODE_ENV === "production" && !process.env.ALLOW_FILE_STORE_IN_PROD) {
  throw new Error(
    "fileStore is for local dev only. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY for production."
  );
}

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "db.json");

interface Allocation {
  memberId: string;
  day: Day;
  picks: Record<string, number>;
  locked: boolean;
}

interface DB {
  crews: Crew[];
  members: CrewMember[];
  allocations: Allocation[];
}

function emptyDb(): DB {
  return { crews: [], members: [], allocations: [] };
}

let writeQueue: Promise<unknown> = Promise.resolve();

async function load(): Promise<DB> {
  try {
    const raw = await readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as DB;
  } catch {
    return emptyDb();
  }
}

async function save(db: DB): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(DATA_FILE, JSON.stringify(db, null, 2), "utf-8");
}

/** Serializes read-modify-write cycles so concurrent requests in dev don't clobber each other. */
function mutate<T>(fn: (db: DB) => Promise<T> | T): Promise<T> {
  const run = writeQueue.then(async () => {
    const db = await load();
    const result = await fn(db);
    await save(db);
    return result;
  });
  writeQueue = run.catch(() => {});
  return run;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

export const fileStore: Store = {
  async createCrew(name) {
    return mutate((db) => {
      let code = generateCode();
      while (db.crews.some((c) => c.code === code)) code = generateCode();
      const crew: Crew = {
        id: randomUUID(),
        code,
        name,
        createdAt: new Date().toISOString(),
      };
      db.crews.push(crew);
      return crew;
    });
  },

  async getCrewByCode(code) {
    const db = await load();
    return db.crews.find((c) => c.code.toUpperCase() === code.toUpperCase()) ?? null;
  },

  async joinCrew(crewId, displayName, prefs) {
    return mutate((db) => {
      const existing = db.members.find(
        (m) =>
          m.crewId === crewId &&
          m.displayName.toLowerCase() === displayName.trim().toLowerCase()
      );
      if (existing) return existing;
      const member: CrewMember = {
        id: randomUUID(),
        crewId,
        displayName: displayName.trim(),
        sessionToken: randomUUID(),
        createdAt: new Date().toISOString(),
        attending: { ...prefs.attending },
        ticketType: prefs.ticketType,
      };
      db.members.push(member);
      return member;
    });
  },

  async updateMemberPrefs(memberId, prefs: Partial<MemberPrefs>) {
    await mutate((db) => {
      const member = db.members.find((m) => m.id === memberId);
      if (!member) return;
      if (prefs.attending) member.attending = { ...member.attending, ...prefs.attending };
      if (prefs.ticketType) member.ticketType = prefs.ticketType;
    });
  },

  async getMemberById(memberId) {
    const db = await load();
    return db.members.find((m) => m.id === memberId) ?? null;
  },

  async verifyMember(memberId, token) {
    const db = await load();
    const member = db.members.find((m) => m.id === memberId);
    if (!member || member.sessionToken !== token) return null;
    return member;
  },

  async listMembers(crewId) {
    const db = await load();
    return db.members.filter((m) => m.crewId === crewId);
  },

  async removeMember(memberId) {
    await mutate((db) => {
      db.members = db.members.filter((m) => m.id !== memberId);
      db.allocations = db.allocations.filter((a) => a.memberId !== memberId);
    });
  },

  async getAllocations(memberId, day) {
    const db = await load();
    const alloc = db.allocations.find((a) => a.memberId === memberId && a.day === day);
    return alloc?.picks ?? {};
  },

  async saveAllocations(memberId, day, picks) {
    // No budget check here — drafts can freely exceed 100 while someone's
    // weighing relative interest; only locking in enforces the cap (actions.ts).
    await mutate((db) => {
      const existing = db.allocations.find((a) => a.memberId === memberId && a.day === day);
      const cleaned = Object.fromEntries(
        Object.entries(picks).filter(([, v]) => v > 0)
      );
      if (existing) {
        existing.picks = cleaned;
      } else {
        db.allocations.push({ memberId, day, picks: cleaned, locked: false });
      }
    });
  },

  async lockDay(memberId, day) {
    await mutate((db) => {
      let alloc = db.allocations.find((a) => a.memberId === memberId && a.day === day);
      if (!alloc) {
        alloc = { memberId, day, picks: {}, locked: false };
        db.allocations.push(alloc);
      }
      alloc.locked = true;
    });
  },

  async unlockDay(memberId, day) {
    await mutate((db) => {
      const alloc = db.allocations.find((a) => a.memberId === memberId && a.day === day);
      if (alloc) alloc.locked = false;
    });
  },

  async isLocked(memberId, day) {
    const db = await load();
    return (
      db.allocations.find((a) => a.memberId === memberId && a.day === day)?.locked ?? false
    );
  },

  async getCrewAllocationsForDay(crewId, day) {
    const db = await load();
    const members = db.members.filter((m) => m.crewId === crewId);
    const result: Record<string, Record<string, number>> = {};
    for (const member of members) {
      const alloc = db.allocations.find((a) => a.memberId === member.id && a.day === day);
      if (alloc?.locked && Object.keys(alloc.picks).length > 0) {
        result[member.displayName] = alloc.picks;
      }
    }
    return result;
  },

  async getStatusBoard(crewId) {
    const db = await load();
    const members = db.members.filter((m) => m.crewId === crewId);
    const board: MemberDayStatus[] = members.map((m) => {
      const days: Day[] = ["saturday", "sunday"];
      const spent = {} as Record<Day, number>;
      const locked = {} as Record<Day, boolean>;
      for (const day of days) {
        const alloc = db.allocations.find((a) => a.memberId === m.id && a.day === day);
        spent[day] = alloc ? Object.values(alloc.picks).reduce((a, b) => a + b, 0) : 0;
        locked[day] = alloc?.locked ?? false;
      }
      return {
        memberId: m.id,
        displayName: m.displayName,
        ticketType: m.ticketType,
        attending: m.attending,
        spent,
        locked,
      };
    });
    return board;
  },
};
