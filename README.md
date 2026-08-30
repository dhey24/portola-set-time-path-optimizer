# Disco Biscuits 🪩 — Portola 2026 Path Planner

Blind biscuit-voting for your crew's Portola 2026 lineup, turned into a few
"optimal path" options for hopping between stages. Built to be fast, mobile,
and a little unhinged — not a scheduling tyrant.

## How it works

- **Crews.** Anyone can start a crew and get a 6-character code. Friends join
  with the code + their name — no passwords, no email.
- **Attendance & tickets.** Each person marks which day(s) they're actually
  at Portola and whether they're GA or VIP. Days you're not attending are
  skipped entirely — no allocating, no scoring, no path noise. Both are
  editable any time from the crew dashboard.
- **Biscuits.** For each day they're attending, each person gets 100 "disco
  biscuits" to spend across that day's lineup, weighting how hyped they are
  for each set. Picks are private until you lock them in.
- **Scoring.** Set popularity uses a quadratic-funding-style formula —
  `(Σ √contribution)²` — so broad agreement beats one whale: three people
  each spending 30 outscores one person spending 90. See
  `src/lib/optimizer.ts`.
- **Multiple crews, one identity.** Since there's no login, "you" are just
  whichever crews your browser holds a join cookie for. If you're in more
  than one crew for the same festival, the biscuit-allocation page offers a
  one-tap "copy my picks from [other crew]" so you don't have to redo the
  same blind vote twice. Want subgroup-specific plans (e.g. "stick with
  these 3, everyone else can wander")? Just spin up a separate crew with
  those people and copy your picks over — no separate feature needed.
- **Paths.** Once at least one attending crew member has locked in,
  `/crew/[code]/results/[day]` computes three path styles via a
  weighted-scheduling DP that accounts for stage-to-stage walk time. Pace
  for the day is VIP only if every attending member that day is VIP;
  otherwise it uses the slower GA pace so nobody's plan assumes a line they
  don't get to skip.
  - **The Hype Path** — maximize total excitement.
  - **The Completionist** — see the widest spread of sets the crew has any
    interest in.
  - **The No-One-Left-Behind Path** — one person, one vote; favors broad mild
    interest over one person's obsession.
  - Despacio runs continuously, so it's called out separately as a drop-in
    "wildcard" rather than forced into the schedule.

The Portola 2026 lineup (`src/lib/lineup.ts`) and stage walk times
(`src/lib/travel.ts`) are hardcoded — this is a single-festival tool, not a
generic scheduler. Walk times are estimates; tune them once you know the
venue layout.

## Local development

No setup required — with no Supabase env vars set, data is stored locally in
`.data/db.json` (gitignored).

```bash
npm install
npm run dev
```

Open http://localhost:3000.

## Deploying for real (Vercel + Supabase)

The file-based store is local-dev only — it throws if used in a production
build, since Vercel's filesystem is ephemeral. For real deployment (hosting
this for friends/family over a few weeks):

1. Create a free [Supabase](https://supabase.com) project.
2. In its SQL editor, run `supabase/schema.sql`.
3. Grab the project's URL and **service role key** (Project Settings → API).
   The service role key is used server-side only (in Server Actions) — never
   expose it to the client.
4. Deploy this repo to [Vercel](https://vercel.com/new).
5. In the Vercel project's Environment Variables, set:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
6. Redeploy. Crews created locally in `.data/db.json` won't carry over —
   it's a fresh dataset once Supabase is wired up.

No auth provider, email service, or domain is required — crew membership is
just a signed-ish session cookie (`pma_<CREWCODE>`) tied to a member row, set
on join. Sessions last 120 days.

## Project layout

- `src/lib/lineup.ts` — the Sat/Sun schedule (stage, artist, times).
- `src/lib/travel.ts` — inter-stage walking time estimates (GA vs VIP).
- `src/lib/optimizer.ts` — quadratic-funding scoring + the path DP.
- `src/lib/store/` — storage interface (`types.ts`) with two implementations:
  `fileStore.ts` (local JSON) and `supabaseStore.ts` (production).
- `src/lib/actions.ts` — Server Actions for crew/allocation mutations.
- `src/app/` — pages: landing, crew dashboard, biscuit allocator, results.
