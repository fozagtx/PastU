import { z } from "zod";
import type { InsightsDTO } from "../types";
import { chatJson, type LlmOpts } from "./llm";

/**
 * Insights chat: Nebius answers using ONLY the user's stored words.
 * The model never writes user-visible text directly. It only returns IDs of
 * stored items that are relevant to the question. The server assembles the
 * answer from verbatim quotes plus fixed templates. On any failure (no key,
 * bad JSON, unknown IDs) we fall back to keyword ranking in code.
 */

export interface ChatItem {
  id: string;
  text: string;
  meta: string; // e.g. "Attempt 2 · stress · March 4, 2026" or "Saving reason"
}

export function chatItems(d: InsightsDTO): ChatItem[] {
  const items: ChatItem[] = [];
  d.goal.forEach((g, i) => {
    items.push({ id: `goal${i + 1}`, text: g.text, meta: `Saving reason · ${g.date}` });
  });
  for (const a of d.attempts) {
    const base = `Attempt ${a.number}`;
    items.push({ id: `a${a.number}-urge`, text: a.urge, meta: `${base} · ${a.trigger} · ${a.at}` });
    if (a.withdrawReason) items.push({ id: `a${a.number}-withdraw`, text: a.withdrawReason, meta: `${base} · withdraw reason` });
    if (a.plan) items.push({ id: `a${a.number}-plan`, text: a.plan, meta: `${base} · where it was going` });
    if (a.wentTo) items.push({ id: `a${a.number}-went`, text: a.wentTo, meta: `${base} · where it went (chain)` });
  }
  return items;
}

const selectSchema = z.object({ relevant: z.array(z.string()).min(1).max(10) });

function keywordPick(query: string, items: ChatItem[]): string[] {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const scored = items
    .map((it) => {
      const hay = it.text.toLowerCase();
      const hayWords = hay.split(/[^a-z0-9]+/);
      let s = 0;
      for (const w of words) {
        // Direct substring, or share a 3-letter prefix ("loss"/"lost", "withdraw"/"withdrew").
        if (hay.includes(w) || hayWords.some((hw) => hw.length > 2 && hw.slice(0, 3) === w.slice(0, 3))) s++;
      }
      return { id: it.id, s };
    })
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s);
  if (scored.length) return scored.slice(0, 5).map((x) => x.id);
  // No keyword overlap: return the first saving reasons + most recent urges.
  return items.slice(0, 5).map((i) => i.id);
}

/** Pick relevant stored items. Returns ids + whether the model was used. */
export async function selectRelevant(query: string, items: ChatItem[], opts: LlmOpts = {}): Promise<{ ids: string[]; source: "llm" | "code" }> {
  if (!items.length) return { ids: [], source: "code" };
  const byId = new Map(items.map((i) => [i.id, i]));
  const raw = await chatJson(
    'Choose the stored quotes that best answer the question. Reply only with JSON {"relevant":["id",...]} containing only ids from the given list, most relevant first, at most 5.',
    JSON.stringify({ question: query, items: items.map((i) => ({ id: i.id, text: i.text, meta: i.meta })) }),
    opts,
  );
  const parsed = selectSchema.safeParse(raw);
  if (parsed.success) {
    const ids = [...new Set(parsed.data.relevant)].filter((id) => byId.has(id)).slice(0, 5);
    if (ids.length) return { ids, source: "llm" };
  }
  return { ids: keywordPick(query, items), source: "code" };
}

export function formatAnswer(question: string, items: ChatItem[], ids: string[], source: "llm" | "code"): string {
  if (!items.length) return "I don't have any of your words stored yet. Add a saving reason first, and the answer will quote you here.";
  if (!ids.length) return "I couldn't find anything of yours that fits that question yet. Try asking about what made you want to leave, or where money went.";
  const byId = new Map(items.map((i) => [i.id, i]));
  const picked = ids.map((id) => byId.get(id)).filter(Boolean) as ChatItem[];
  const lines = picked.map((it) => `- “${it.text}” (${it.meta})`);
  const intro = `Based only on your own words, here is what fits your question:` ;
  const outro = source === "llm"
    ? `\n\nOrdered by a model, from your own history. Only your words are shown.`
    : `\n\nOrdered by simple rules, from your own history. Only your words are shown.`;
  return [intro, "", ...lines, outro].join("\n");
}

/** Full answer for one question, grounded only in stored words. */
export async function answerQuestion(d: InsightsDTO, question: string, opts: LlmOpts = {}): Promise<{ answer: string; source: "llm" | "code" }> {
  const items = chatItems(d);
  const { ids, source } = await selectRelevant(question, items, opts);
  return { answer: formatAnswer(question, items, ids, source), source };
}
