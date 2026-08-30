"use client";

import { useTransition } from "react";
import { updateMemberPrefsAction } from "@/lib/actions";
import { Day } from "@/lib/lineup";
import { TicketType } from "@/lib/store/types";

export function MyPlanEditor({
  crewCode,
  attending,
  ticketType,
}: {
  crewCode: string;
  attending: Record<Day, boolean>;
  ticketType: TicketType;
}) {
  const [pending, startTransition] = useTransition();

  function toggleDay(day: Day) {
    startTransition(() =>
      updateMemberPrefsAction(crewCode, {
        attending: { ...attending, [day]: !attending[day] },
      })
    );
  }

  function toggleTicket() {
    startTransition(() =>
      updateMemberPrefsAction(crewCode, {
        ticketType: ticketType === "VIP" ? "GA" : "VIP",
      })
    );
  }

  return (
    <div className="flex flex-wrap items-center justify-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => toggleDay("saturday")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          attending.saturday ? "bg-accent text-background" : "bg-white/10 text-muted"
        }`}
      >
        {attending.saturday ? "✓ " : ""}Sat
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={() => toggleDay("sunday")}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          attending.sunday ? "bg-accent text-background" : "bg-white/10 text-muted"
        }`}
      >
        {attending.sunday ? "✓ " : ""}Sun
      </button>
      <button
        type="button"
        disabled={pending}
        onClick={toggleTicket}
        className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
          ticketType === "VIP" ? "bg-accent-2 text-background" : "bg-white/10 text-muted"
        }`}
      >
        {ticketType === "VIP" ? "✨ VIP" : "GA"}
      </button>
    </div>
  );
}
