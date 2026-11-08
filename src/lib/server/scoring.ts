import type { ReasonStat, Trigger } from "../types";

/** What happened in one past attempt, reconstructed from memory tags. Pure data, no text. */
export interface AttemptFacts {
  number: number;
  trigger: Trigger;
  shown: string[];                 // reason ids shown
  result?: "held" | "exited";
  felt?: "regret" | "fine";
}

export const NEW_REASON_SCORE = 0.5;
export const TOP_N = 3;

/**
 * score = (h + 0.5g + 1) / (s + 2) + 0.25c
 *  s shown, h shown in an attempt that was held, g shown in an attempt that was exited then regretted,
 *  c = 1 if the reason held in a past attempt with the same trigger label.
 * A never-shown reason scores 0.5 flat.
 * `reasonIds` is in creation order. Only attempts with number < beforeNumber (if given) count.
 */
export function computeStats(reasonIds: string[], attempts: AttemptFacts[], trigger: Trigger, beforeNumber?: number): ReasonStat[] {
  const past = attempts.filter((a) => beforeNumber === undefined || a.number < beforeNumber);
  return reasonIds.map((id) => {
    let shown = 0, held = 0, regretted = 0, similarHold = false;
    for (const a of past) {
      if (!a.shown.includes(id)) continue;
      shown++;
      if (a.result === "held") { held++; if (a.trigger === trigger) similarHold = true; }
      if (a.result === "exited" && a.felt === "regret") regretted++;
    }
    const score = shown === 0
      ? NEW_REASON_SCORE
      : (held + 0.5 * regretted + 1) / (shown + 2) + 0.25 * (similarHold ? 1 : 0);
    return { reasonId: id, shown, held, regretted, similarHold, score };
  });
}

/** Top N by score desc; ties broken by creation order (input order). */
export function rankReasons(stats: ReasonStat[], n = TOP_N): ReasonStat[] {
  return stats
    .map((s, i) => ({ s, i }))
    .sort((a, b) => b.s.score - a.s.score || a.i - b.i)
    .slice(0, n)
    .map((x) => x.s);
}

/** Fixed, non-scolding sentence. Counts only. */
export function templateFor(stat: ReasonStat): string {
  if (stat.shown === 0) return "You haven't seen this one yet.";
  const times = (n: number) => `${n} ${n === 1 ? "time" : "times"}`;
  const parts = [`Shown ${times(stat.shown)}.`, `You kept your promise ${times(stat.held)}.`];
  if (stat.regretted > 0) parts.push(`You wished you had stayed ${times(stat.regretted)}.`);
  return parts.join(" ");
}

/** Accept an LLM order only if it is exactly a permutation of the candidates. */
export function applyOrder(candidates: ReasonStat[], order: string[] | null): { stats: ReasonStat[]; source: "llm" | "code" } {
  if (!order || order.length !== candidates.length) return { stats: candidates, source: "code" };
  const byId = new Map(candidates.map((c) => [c.reasonId, c]));
  const out: ReasonStat[] = [];
  for (const id of order) {
    const c = byId.get(id);
    if (!c || out.includes(c)) return { stats: candidates, source: "code" };
    out.push(c);
  }
  const same = out.every((c, i) => c === candidates[i]);
  return { stats: out, source: same ? "code" : "llm" };
}
