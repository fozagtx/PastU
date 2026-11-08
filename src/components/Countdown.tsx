"use client";
import { useNow } from "@/lib/client/hooks";
import { fmtDuration } from "@/lib/client/format";

export function Countdown({ targetMs, doneLabel = "Ready" }: { targetMs: number | null; doneLabel?: string }) {
  const now = useNow(250);
  if (targetMs == null || now == null) return <span className="num" aria-live="off">…</span>;
  const left = targetMs - now;
  return <span className="num" role="timer" aria-live="off">{left > 0 ? fmtDuration(left) : doneLabel}</span>;
}
