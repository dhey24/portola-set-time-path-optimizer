"use client";

import { useState } from "react";

export function CopyButton({ value, label }: { value: string; label: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1500);
        } catch {
          // clipboard API unavailable — no-op, the code is already visible on screen
        }
      }}
      className="text-xs font-semibold rounded-full bg-white/10 px-3 py-1 hover:bg-white/20 transition"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
