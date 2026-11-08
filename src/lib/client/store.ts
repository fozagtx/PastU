// Tiny per-browser convenience list of promise ids so the landing page can say "continue".
const KEY = "pastyou.promises";
export function rememberPromise(id: string) {
  try { const l = listPromises().filter((x) => x !== id); l.unshift(id); localStorage.setItem(KEY, JSON.stringify(l.slice(0, 10))); } catch { /* ignore */ }
}
export function listPromises(): string[] {
  try { const v = JSON.parse(localStorage.getItem(KEY) || "[]"); return Array.isArray(v) ? v : []; } catch { return []; }
}

const AKEY = (id: string) => `pastyou.attempt.${id}`;
export function setActiveAttempt(promiseId: string, attemptId: string | null) {
  try { attemptId ? localStorage.setItem(AKEY(promiseId), attemptId) : localStorage.removeItem(AKEY(promiseId)); } catch { /* ignore */ }
}
export function getActiveAttempt(promiseId: string): string | null {
  try { return localStorage.getItem(AKEY(promiseId)); } catch { return null; }
}

export interface AttemptMeta { urge: string; number: number; result?: "held" | "exited" }
const MKEY = (a: string) => `pastyou.attemptmeta.${a}`;
export function saveAttemptMeta(attemptId: string, m: AttemptMeta) { try { localStorage.setItem(MKEY(attemptId), JSON.stringify(m)); } catch { /* ignore */ } }
export function loadAttemptMeta(attemptId: string): AttemptMeta | null { try { const v = localStorage.getItem(MKEY(attemptId)); return v ? JSON.parse(v) : null; } catch { return null; } }
