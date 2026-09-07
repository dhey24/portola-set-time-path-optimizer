"use client";

import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingLabel,
  className,
}: {
  children: React.ReactNode;
  pendingLabel: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={`${className} disabled:opacity-60 disabled:cursor-not-allowed`}
    >
      {pending ? (
        <span className="inline-flex items-center justify-center gap-2">
          <span className="disco-spin" aria-hidden>
            🪩
          </span>
          {pendingLabel}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
