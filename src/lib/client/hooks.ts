"use client";
import { useEffect, useState } from "react";

/** Current time in ms, ticking. Returns null on the server / first paint to avoid hydration mismatches. */
export function useNow(intervalMs = 500): number | null {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const t = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(t);
  }, [intervalMs]);
  return now;
}

export function errMsg(e: unknown): string {
  if (e instanceof Error) return e.message;
  return typeof e === "string" ? e : "Something went wrong.";
}
