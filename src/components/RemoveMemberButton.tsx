"use client";

import { useTransition } from "react";
import { removeMemberAction } from "@/lib/actions";

export function RemoveMemberButton({
  crewCode,
  memberId,
  displayName,
}: {
  crewCode: string;
  memberId: string;
  displayName: string;
}) {
  const [pending, startTransition] = useTransition();

  function onClick() {
    const ok = window.confirm(
      `Remove ${displayName} from this crew? Their picks and locked-in plan will be deleted — this can't be undone.`
    );
    if (!ok) return;
    startTransition(() => removeMemberAction(crewCode, memberId));
  }

  return (
    <button
      type="button"
      disabled={pending}
      onClick={onClick}
      title={`Remove ${displayName}`}
      className="text-muted hover:text-red-400 transition disabled:opacity-50"
    >
      {pending ? "…" : "✕"}
    </button>
  );
}
