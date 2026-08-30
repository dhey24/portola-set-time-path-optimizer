"use client";

import { useRef, useState } from "react";
import { toPng } from "html-to-image";
import { PathResult } from "@/lib/optimizer";
import { ShareableCard, CARD_WIDTH, CARD_HEIGHT } from "@/components/ShareableCard";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "discobiscuits.app";

type Status = "idle" | "working" | "ready" | "error";

export function SavePathImage({
  crewName,
  dayLabel,
  path,
}: {
  crewName: string;
  dayLabel: string;
  path: PathResult;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const fileName = `portola-${path.key}-${dayLabel.toLowerCase().replace(/[^a-z]+/g, "-")}.png`;

  async function handleClick() {
    if (!cardRef.current) return;
    setStatus("working");
    try {
      if (document.fonts?.ready) await document.fonts.ready;
      const dataUrl = await toPng(cardRef.current, {
        width: CARD_WIDTH,
        height: CARD_HEIGHT,
        pixelRatio: 1,
        cacheBust: true,
        backgroundColor: "#16205c",
      });
      setImageUrl(dataUrl);
      setStatus("ready");

      // Prefer the native share sheet on phones — it offers "Save Image"
      // alongside every messaging/social app in one tap, which is exactly
      // what makes this shareable at a signal-less festival.
      const nav = navigator as Navigator & {
        canShare?: (data?: ShareData) => boolean;
        share?: (data: ShareData) => Promise<void>;
      };
      if (nav.canShare && nav.share) {
        try {
          const blob = await (await fetch(dataUrl)).blob();
          const file = new File([blob], fileName, { type: "image/png" });
          if (nav.canShare({ files: [file] })) {
            await nav.share({
              files: [file],
              title: path.title,
              text: `${crewName}'s ${path.title} — Portola ${dayLabel}`,
            });
            setStatus("idle");
            setImageUrl(null);
            return;
          }
        } catch {
          // Share sheet dismissed/cancelled or unsupported — fall back to
          // the preview modal below so they can still save it manually.
        }
      }
    } catch {
      setStatus("error");
    }
  }

  return (
    <>
      <button
        type="button"
        disabled={status === "working"}
        onClick={handleClick}
        className="text-xs rounded-full bg-white/10 px-3 py-1.5 font-semibold hover:bg-white/20 transition disabled:opacity-50"
      >
        {status === "working" ? "Rendering…" : "📸 Save as image"}
      </button>

      {/* Off-screen render target — html-to-image needs a real laid-out DOM
          node to rasterize, so this exists purely for capture, never shown. */}
      <div style={{ position: "fixed", top: -99999, left: 0, pointerEvents: "none" }}>
        <div ref={cardRef}>
          <ShareableCard crewName={crewName} dayLabel={dayLabel} path={path} appUrl={APP_URL} />
        </div>
      </div>

      {status === "error" && (
        <p className="text-xs text-red-300 mt-1">
          Couldn&rsquo;t render that image — try again.
        </p>
      )}

      {status === "ready" && imageUrl && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur flex flex-col items-center justify-center gap-4 p-6">
          <img
            src={imageUrl}
            alt={`${path.title} — ${dayLabel}`}
            className="max-h-[70vh] w-auto rounded-2xl shadow-2xl border border-white/10"
          />
          <p className="text-sm text-center text-muted max-w-xs">
            Press and hold the image to save it to your phone — handy since
            there&rsquo;s usually no signal at the festival.
          </p>
          <div className="flex gap-2">
            <a
              href={imageUrl}
              download={fileName}
              className="rounded-xl bg-accent text-background font-bold px-4 py-2.5 text-sm"
            >
              Download
            </a>
            <button
              type="button"
              onClick={() => {
                setStatus("idle");
                setImageUrl(null);
              }}
              className="rounded-xl bg-white/10 font-bold px-4 py-2.5 text-sm"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
