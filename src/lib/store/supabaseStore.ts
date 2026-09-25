import { createClient } from "@supabase/supabase-js";
import { Day } from "../lineup";
import { Crew, CrewMember, MemberDayStatus, MemberPrefs, Store, TicketType } from "./types";

function client() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set");
  }
  // Service-role key, server-side only — never expose this to the client.
  return createClient(url, key, { auth: { persistSession: false } });
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no 0/O/1/I
function generateCode(): string {
  let code = "";
  for (let i = 0; i < 6; i++) {
    code += CODE_ALPHABET[Math.floor(Math.random() * CODE_ALPHABET.length)];
  }
  return code;
}

function rowToCrew(row: {
  id: string;
  code: string;
  name: string;
  created_at: string;
}): Crew {
  return { id: row.id, code: row.code, name: row.name, createdAt: row.created_at };
}

function rowToMember(row: {
  id: string;
  crew_id: string;
  display_name: string;
  session_token: string;
  created_at: string;
  attending_saturday: boolean;
  attending_sunday: boolean;
  ticket_type: TicketType;
}): CrewMember {
  return {
    id: row.id,
    crewId: row.crew_id,
    displayName: row.display_name,
    sessionToken: row.session_token,
    createdAt: row.created_at,
    attending: { saturday: row.attending_saturday, sunday: row.attending_sunday },
    ticketType: row.ticket_type,
  };
}

export const supabaseStore: Store = {
  async createCrew(name) {
    const db = client();
    for (let attempt = 0; attempt < 5; attempt++) {
      const code = generateCode();
      const { data, error } = await db
        .from("crews")
        .insert({ name, code })
        .select()
        .single();
      if (!error) return rowToCrew(data);
      if (!`${error.message}`.includes("duplicate")) throw new Error(error.message);
    }
    throw new Error("Could not generate a unique crew code, try again");
  },

  async getCrewByCode(code) {
    const db = client();
    const { data, error } = await db
      .from("crews")
      .select()
      .ilike("code", code)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToCrew(data) : null;
  },

  async joinCrew(crewId, displayName, prefs) {
    const db = client();
    const trimmed = displayName.trim();
    const { data: existing, error: findErr } = await db
      .from("crew_members")
      .select()
      .eq("crew_id", crewId)
      .ilike("display_name", trimmed)
      .maybeSingle();
    if (findErr) throw new Error(findErr.message);
    if (existing) return rowToMember(existing);

    const { data, error } = await db
      .from("crew_members")
      .insert({
        crew_id: crewId,
        display_name: trimmed,
        attending_saturday: prefs.attending.saturday,
        attending_sunday: prefs.attending.sunday,
        ticket_type: prefs.ticketType,
      })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return rowToMember(data);
  },

  async updateMemberPrefs(memberId, prefs: Partial<MemberPrefs>) {
    const db = client();
    const update: Record<string, unknown> = {};
    if (prefs.attending?.saturday !== undefined) {
      update.attending_saturday = prefs.attending.saturday;
    }
    if (prefs.attending?.sunday !== undefined) {
      update.attending_sunday = prefs.attending.sunday;
    }
    if (prefs.ticketType) update.ticket_type = prefs.ticketType;
    if (Object.keys(update).length === 0) return;
    const { error } = await db.from("crew_members").update(update).eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async getMemberById(memberId) {
    const db = client();
    const { data, error } = await db
      .from("crew_members")
      .select()
      .eq("id", memberId)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? rowToMember(data) : null;
  },

  async verifyMember(memberId, token) {
    const member = await supabaseStore.getMemberById(memberId);
    if (!member || member.sessionToken !== token) return null;
    return member;
  },

  async listMembers(crewId) {
    const db = client();
    const { data, error } = await db.from("crew_members").select().eq("crew_id", crewId);
    if (error) throw new Error(error.message);
    return (data ?? []).map(rowToMember);
  },

  async removeMember(memberId) {
    const db = client();
    // Allocations cascade-delete via the FK in supabase/schema.sql.
    const { error } = await db.from("crew_members").delete().eq("id", memberId);
    if (error) throw new Error(error.message);
  },

  async getAllocations(memberId, day) {
    const db = client();
    const { data, error } = await db
      .from("allocations")
      .select("picks")
      .eq("member_id", memberId)
      .eq("day", day)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return (data?.picks as Record<string, number>) ?? {};
  },

  async saveAllocations(memberId, day, picks) {
    // No budget check here — drafts can freely exceed 100 while someone's
    // weighing relative interest; only locking in enforces the cap (actions.ts).
    const cleaned = Object.fromEntries(Object.entries(picks).filter(([, v]) => v > 0));
    const db = client();
    const { error } = await db
      .from("allocations")
      .upsert(
        { member_id: memberId, day, picks: cleaned, updated_at: new Date().toISOString() },
        { onConflict: "member_id,day" }
      );
    if (error) throw new Error(error.message);
  },

  async lockDay(memberId, day) {
    const db = client();
    const { error } = await db
      .from("allocations")
      .upsert(
        { member_id: memberId, day, locked: true },
        { onConflict: "member_id,day", ignoreDuplicates: false }
      );
    if (error) throw new Error(error.message);
  },

  async unlockDay(memberId, day) {
    const db = client();
    const { error } = await db
      .from("allocations")
      .update({ locked: false })
      .eq("member_id", memberId)
      .eq("day", day);
    if (error) throw new Error(error.message);
  },

  async isLocked(memberId, day) {
    const db = client();
    const { data, error } = await db
      .from("allocations")
      .select("locked")
      .eq("member_id", memberId)
      .eq("day", day)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data?.locked ?? false;
  },

  async getCrewAllocationsForDay(crewId, day) {
    const db = client();
    const { data: members, error: memErr } = await db
      .from("crew_members")
      .select("id, display_name")
      .eq("crew_id", crewId);
    if (memErr) throw new Error(memErr.message);
    const ids = (members ?? []).map((m) => m.id);
    if (ids.length === 0) return {};

    const { data: allocs, error } = await db
      .from("allocations")
      .select("member_id, picks, locked")
      .eq("day", day)
      .eq("locked", true)
      .in("member_id", ids);
    if (error) throw new Error(error.message);

    const nameById = new Map((members ?? []).map((m) => [m.id, m.display_name]));
    const result: Record<string, Record<string, number>> = {};
    for (const row of allocs ?? []) {
      const picks = row.picks as Record<string, number>;
      if (picks && Object.keys(picks).length > 0) {
        result[nameById.get(row.member_id)!] = picks;
      }
    }
    return result;
  },

  async getStatusBoard(crewId) {
    const db = client();
    const { data: members, error: memErr } = await db
      .from("crew_members")
      .select("id, display_name, attending_saturday, attending_sunday, ticket_type")
      .eq("crew_id", crewId);
    if (memErr) throw new Error(memErr.message);

    const { data: allocs, error } = await db
      .from("allocations")
      .select("member_id, day, picks, locked")
      .in("member_id", (members ?? []).map((m) => m.id));
    if (error) throw new Error(error.message);

    const board: MemberDayStatus[] = (members ?? []).map((m) => {
      const days: Day[] = ["saturday", "sunday"];
      const spent = {} as Record<Day, number>;
      const locked = {} as Record<Day, boolean>;
      for (const day of days) {
        const row = (allocs ?? []).find((a) => a.member_id === m.id && a.day === day);
        const picks = (row?.picks as Record<string, number>) ?? {};
        spent[day] = Object.values(picks).reduce((a, b) => a + b, 0);
        locked[day] = row?.locked ?? false;
      }
      return {
        memberId: m.id,
        displayName: m.display_name,
        ticketType: m.ticket_type,
        attending: { saturday: m.attending_saturday, sunday: m.attending_sunday },
        spent,
        locked,
      };
    });
    return board;
  },
};
