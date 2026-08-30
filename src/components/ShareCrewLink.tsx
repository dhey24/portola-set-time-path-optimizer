"use client";

import { useState } from "react";

/** Prefers the native share sheet (great on phones — drops the link straight
 * into iMessage/WhatsApp/etc.), falling back to a plain clipboard copy on
 * desktop or wherever Web Share isn't available. */
export function ShareCrewLink({ crewName, joinUrl }: { crewName: string; joinUrl: string }) {
  const [copied, setCopied] = useState(false);

  async function handleClick() {
    const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
    if (nav.share) {
      try {
        await nav.share({
          title: `Join ${crewName} on Disco Biscuits`,
          text: `Join my crew "${crewName}" for Portola set picks:`,
          url: joinUrl,
        });
        return;
      } catch {
        // Share sheet dismissed/unsupported — fall through to copy.
      }
    }
    try {
      await navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard API unavailable — the link is already visible on screen.
    }
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className="text-xs font-semibold rounded-full bg-accent text-background px-3 py-1.5 hover:brightness-95 transition"
    >
      {copied ? "Link copied!" : "🔗 Share invite link"}
    </button>
  );
}
