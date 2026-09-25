// Portola 2026 — Pier 80, San Francisco. Sep 26–27. Doors at 1PM both days.
// Transcribed from the official set-time posters (public/lineup/*.jpg).

export type Day = "saturday" | "sunday";
export type Stage = "pier" | "crane" | "warehouse" | "shiptent" | "despacio";

export interface SetSlot {
  id: string;
  day: Day;
  stage: Stage;
  artist: string;
  label?: string; // extra context, e.g. "DJ Set"
  start: string; // "H:MM PM"
  end: string;
  startMin: number; // minutes since midnight
  endMin: number;
  /** Despacio-style continuous installations: not a hard-scheduled slot, drop in/out anytime. */
  flexible?: boolean;
}

export const STAGES: { id: Stage; name: string }[] = [
  { id: "pier", name: "Pier Stage" },
  { id: "crane", name: "Crane Stage" },
  { id: "warehouse", name: "Warehouse" },
  { id: "shiptent", name: "Ship Tent" },
  { id: "despacio", name: "Despacio" },
];

export const STAGE_NAME: Record<Stage, string> = Object.fromEntries(
  STAGES.map((s) => [s.id, s.name])
) as Record<Stage, string>;

// All set times at Portola run 1:30 PM – 11:00 PM, i.e. always "PM" on a 12-hour clock.
function pm(time: string): number {
  const [h, m] = time.split(":").map(Number);
  const hour24 = (h % 12) + 12;
  return hour24 * 60 + m;
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function slot(
  day: Day,
  stage: Stage,
  artist: string,
  start: string,
  end: string,
  opts: { label?: string; flexible?: boolean } = {}
): SetSlot {
  return {
    id: `${day}-${stage}-${slug(artist)}`,
    day,
    stage,
    artist,
    label: opts.label,
    start: `${start} PM`,
    end: `${end} PM`,
    startMin: pm(start),
    endMin: pm(end),
    flexible: opts.flexible,
  };
}

const saturday: SetSlot[] = [
  // Pier Stage
  slot("saturday", "pier", "Airwolf Paradise", "1:30", "2:30"),
  slot("saturday", "pier", "Gelli Haha", "2:40", "3:30"),
  slot("saturday", "pier", "Oskar med K", "3:40", "4:30"),
  slot("saturday", "pier", "FCUKERS", "4:40", "5:30"),
  slot("saturday", "pier", "Tove Lo", "5:40", "6:30"),
  slot("saturday", "pier", "Robyn", "7:10", "8:10"),
  slot("saturday", "pier", "Dog Blood (Skrillex + Boys Noize)", "9:00", "10:15"),
  // Crane Stage — Skepta dropped off the bill; Erika/Tricky/Nimino/DJ Shadow
  // shifted later to fill the gap (updated poster, 2026-09-25).
  slot("saturday", "crane", "Erika b2b SFCowboy", "1:30", "3:10"),
  slot("saturday", "crane", "Tricky", "3:30", "4:30"),
  slot("saturday", "crane", "Nimino", "4:50", "5:50"),
  slot("saturday", "crane", "DJ Shadow", "6:10", "7:10", {
    label: "Celebrates 30 Years of Endtroducing.....",
  }),
  slot("saturday", "crane", "Fatboy Slim", "7:55", "9:25"),
  slot("saturday", "crane", "Soulwax", "9:55", "10:55"),
  // Warehouse
  slot("saturday", "warehouse", "Sam Alfred", "1:30", "2:45"),
  slot("saturday", "warehouse", "Ranger Trucco b2b Alisha", "2:45", "3:45"),
  slot("saturday", "warehouse", "Chloé Caillet", "3:45", "4:45"),
  slot("saturday", "warehouse", "Groove Armada", "4:45", "6:00"),
  slot("saturday", "warehouse", "Max Styler", "6:00", "7:15"),
  slot("saturday", "warehouse", "Kettama", "7:15", "8:30"),
  slot("saturday", "warehouse", "Beltran b2b Ben Sterling", "8:30", "9:45"),
  slot("saturday", "warehouse", "Prospa", "9:45", "11:00"),
  // Ship Tent
  slot("saturday", "shiptent", "Felly Fell", "1:40", "2:40"),
  slot("saturday", "shiptent", "MGNA CRRRTA", "2:50", "3:30"),
  slot("saturday", "shiptent", "Six Sex", "3:40", "4:20"),
  slot("saturday", "shiptent", "Mike D 5D", "4:40", "5:30"),
  slot("saturday", "shiptent", "Jyoty", "5:40", "6:40"),
  slot("saturday", "shiptent", "Bassvictim", "6:50", "7:40"),
  slot("saturday", "shiptent", "Jigitz", "7:50", "8:40"),
  slot("saturday", "shiptent", "Nate Sib", "8:55", "9:35"),
  slot("saturday", "shiptent", "Melanie C", "9:50", "10:30", { label: "DJ Set" }),
  // Despacio (continuous sound system, drop in/out anytime)
  slot("saturday", "despacio", "Despacio", "2:45", "9:45", { flexible: true }),
];

const sunday: SetSlot[] = [
  // Pier Stage
  slot("sunday", "pier", "Clearcast", "1:30", "2:20"),
  slot("sunday", "pier", "Mind Enterprises", "2:30", "3:20"),
  slot("sunday", "pier", "Channel Tres", "3:30", "4:20"),
  slot("sunday", "pier", "SG Lewis", "4:30", "5:25", { label: "Live" }),
  slot("sunday", "pier", "Mochakk", "5:35", "6:35"),
  slot("sunday", "pier", "Zara Larsson", "7:05", "8:05"),
  slot("sunday", "pier", "Swedish House Mafia", "8:45", "10:00"),
  // Crane Stage
  slot("sunday", "crane", "Torren Foot", "1:30", "2:30"),
  slot("sunday", "crane", "Azzecca", "2:30", "3:30"),
  slot("sunday", "crane", "Adéla", "3:50", "4:30"),
  slot("sunday", "crane", "Zulan", "4:45", "5:35"),
  slot("sunday", "crane", "underscores", "5:50", "6:40"),
  slot("sunday", "crane", "Ninajirachi", "7:00", "7:50"),
  slot("sunday", "crane", "Horsegiirl", "8:10", "9:00"),
  slot("sunday", "crane", "Parcels", "9:30", "10:45"),
  // Warehouse
  slot("sunday", "warehouse", "Dean Turnley", "1:30", "2:30"),
  slot("sunday", "warehouse", "Silva Bumpa", "2:30", "3:30"),
  slot("sunday", "warehouse", "Brunello", "3:30", "4:30"),
  slot("sunday", "warehouse", "VTSS", "4:30", "5:30"),
  slot("sunday", "warehouse", "Marlon Hoffstadt", "5:30", "6:45"),
  slot("sunday", "warehouse", "Tiësto", "6:45", "8:15"),
  slot("sunday", "warehouse", "Overmono", "8:20", "9:20"),
  slot("sunday", "warehouse", "Four Tet", "9:30", "11:00"),
  // Ship Tent
  slot("sunday", "shiptent", "Kaytree", "1:40", "2:55"),
  slot("sunday", "shiptent", "Riria", "2:55", "4:10"),
  slot("sunday", "shiptent", "Ear", "4:20", "5:00"),
  slot("sunday", "shiptent", "Ben UFO", "5:10", "6:30"),
  slot("sunday", "shiptent", "Daphni", "6:30", "7:50"),
  slot("sunday", "shiptent", "Kelela", "8:05", "8:50"),
  slot("sunday", "shiptent", "JT", "9:00", "9:30"),
  slot("sunday", "shiptent", "Baby J", "9:40", "10:30"),
  // Despacio
  slot("sunday", "despacio", "Despacio", "3:30", "10:30", { flexible: true }),
];

export const LINEUP: Record<Day, SetSlot[]> = { saturday, sunday };

/** Sets whose time moved on a poster correction after people had already
 * started allocating — surfaced as a heads-up so they can double check
 * whether their plan still makes sense. Keyed by the set's own id (stable
 * across the correction, since it's derived from the artist name), so this
 * naturally stops applying to anyone who resaves that day. Add an entry
 * here any time a future correction reschedules a set someone may have
 * already picked; there's deliberately no entry for Skepta's removal — that
 * was cleaned up directly in everyone's stored picks instead. */
export interface LineupTimeChange {
  id: string;
  day: Day;
  artist: string;
  was: string;
  now: string;
}

export const RECENT_LINEUP_CHANGES: LineupTimeChange[] = [
  { id: "saturday-crane-erika-b2b-sfcowboy", day: "saturday", artist: "Erika b2b SFCowboy", was: "1:30–3:00 PM", now: "1:30–3:10 PM" },
  { id: "saturday-crane-tricky", day: "saturday", artist: "Tricky", was: "3:20–4:10 PM", now: "3:30–4:30 PM" },
  { id: "saturday-crane-nimino", day: "saturday", artist: "Nimino", was: "4:25–5:15 PM", now: "4:50–5:50 PM" },
  { id: "saturday-crane-dj-shadow", day: "saturday", artist: "DJ Shadow", was: "5:30–6:30 PM", now: "6:10–7:10 PM" },
];

export const DAY_LABEL: Record<Day, string> = {
  saturday: "Saturday · Sep 26",
  sunday: "Sunday · Sep 27",
};

export function getSet(day: Day, id: string): SetSlot | undefined {
  return LINEUP[day].find((s) => s.id === id);
}

export function scheduledSets(day: Day): SetSlot[] {
  return LINEUP[day].filter((s) => !s.flexible);
}

export function flexibleSets(day: Day): SetSlot[] {
  return LINEUP[day].filter((s) => s.flexible);
}

export function minutesToLabel(min: number): string {
  const h24 = Math.floor(min / 60) % 24;
  const m = min % 60;
  const h12 = ((h24 + 11) % 12) + 1;
  const ampm = h24 >= 12 ? "PM" : "AM";
  return `${h12}:${m.toString().padStart(2, "0")} ${ampm}`;
}
