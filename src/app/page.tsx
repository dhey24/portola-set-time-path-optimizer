import { createCrewAction, joinCrewAction } from "@/lib/actions";
import { PrefsFields } from "@/components/PrefsFields";
import { Sparkle } from "@/components/Sparkle";

export default function Home() {
  return (
    <main className="flex flex-1 flex-col gap-8 pt-6">
      <header className="relative text-center space-y-3 px-2">
        <Sparkle className="absolute -top-1 left-2 h-4 w-4 text-accent-2" />
        <Sparkle
          className="absolute top-6 right-4 h-3 w-3 text-accent"
          style={{ animationDelay: "0.8s" }}
        />
        <Sparkle
          className="absolute bottom-0 left-8 h-3 w-3 text-accent"
          style={{ animationDelay: "1.4s" }}
        />
        <p className="stage-oval inline-block text-accent font-semibold tracking-wide text-xs px-4 py-1.5">
          🪩 PORTOLA 2026 · PIER 80 · SEP 26–27
        </p>
        <h1 className="poster-heading text-4xl sm:text-5xl">Disco Biscuits</h1>
        <p className="text-muted text-sm max-w-sm mx-auto">
          Blindly spend 100 biscuits on the sets you&rsquo;re most feral about. We&rsquo;ll
          turn your crew&rsquo;s chaos into a few optimal paths between stages. No
          brutal efficiency, just vibes with a schedule.
        </p>
      </header>

      <section className="bg-card rounded-2xl p-5 space-y-3 shadow-lg shadow-black/20">
        <h2 className="poster-heading text-xl text-accent">Start a crew</h2>
        <p className="text-sm text-muted">
          Get a shareable code for your friends. Nobody sees anyone else&rsquo;s
          picks until they&rsquo;ve locked in their own.
        </p>
        <form action={createCrewAction} className="space-y-3">
          <input
            name="crewName"
            required
            placeholder="Crew name (e.g. Feral Ferrets)"
            className="w-full rounded-xl bg-background/60 border border-white/10 px-4 py-3 text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <input
            name="displayName"
            required
            placeholder="Your name"
            className="w-full rounded-xl bg-background/60 border border-white/10 px-4 py-3 text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent"
          />
          <PrefsFields />
          <button
            type="submit"
            className="w-full rounded-xl bg-accent text-background font-bold py-3 text-base hover:brightness-95 active:scale-[0.99] transition"
          >
            Create crew
          </button>
        </form>
      </section>

      <section className="bg-card rounded-2xl p-5 space-y-3 shadow-lg shadow-black/20">
        <h2 className="poster-heading text-xl text-accent-2">Join a crew</h2>
        <p className="text-sm text-muted">Got a code from a friend? Drop in here.</p>
        <form action={joinCrewAction} className="space-y-3">
          <input
            name="code"
            required
            maxLength={6}
            placeholder="Crew code (e.g. F3RAL2)"
            className="w-full rounded-xl bg-background/60 border border-white/10 px-4 py-3 text-base uppercase tracking-widest placeholder:normal-case placeholder:tracking-normal placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-2"
          />
          <input
            name="displayName"
            required
            placeholder="Your name"
            className="w-full rounded-xl bg-background/60 border border-white/10 px-4 py-3 text-base placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-2"
          />
          <PrefsFields />
          <button
            type="submit"
            className="w-full rounded-xl bg-accent-2 text-background font-bold py-3 text-base hover:brightness-95 active:scale-[0.99] transition"
          >
            Join crew
          </button>
        </form>
      </section>
    </main>
  );
}
