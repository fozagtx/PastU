import { randomUUID } from "node:crypto";
import type {
  AttemptResp, InsightAttempt, InsightsDTO, MemoryItemDTO, PastAttempt, PastYouDTO, PastYouQuote, PromiseDTO, Reason, Trigger,
} from "../types";
import { getDb, type AttemptRow, type PromiseRow } from "./db";
import { applyOrder, computeStats, rankReasons, templateFor, type AttemptFacts } from "./scoring";
import { formatTag, parseTag, type ParsedTag, type TagKind } from "./tags";
import { isEmergencyText, labelUrge, reorderTop, type LlmOpts } from "./llm";
import { exitFinding } from "./tatum";
import { walrusBlobUrl, type MemoryStore, type StoredMemory } from "./memory";
import { HttpError } from "./http";

const TRIGGER_SET = new Set<string>(["loss", "payday", "stress", "boredom", "social", "emergency", "other"]);
const asTrigger = (s: string | undefined): Trigger => (s && TRIGGER_SET.has(s) ? (s as Trigger) : "other");

// ---------- DTO mapping ----------
export async function toPromiseDTO(p: PromiseRow): Promise<PromiseDTO> {
  const n = (await getDb().get<{ c: number }>("SELECT COUNT(*)::int c FROM attempts WHERE promise_id = ?", [p.id]))!.c;
  return { id: p.id, owner: p.owner, currentVaultId: p.current_vault_id, namespace: p.namespace, coinType: p.coin_type, status: p.status, attempts: n };
}

// ---------- Memory model ----------
interface Tagged { tag: ParsedTag; mem: StoredMemory }
export interface AttemptMem {
  number: number; trigger: Trigger; urge: string; at: string; blobId?: string;
  shown?: { reasons: string[]; src: "llm" | "code" };
  result?: "held" | "exited"; felt?: "regret" | "fine"; finding?: string;
  withdrawReason?: string; plan?: string;
}
export interface PromiseMem { tagged: Tagged[]; reasons: Reason[]; attempts: Map<number, AttemptMem> }

export async function loadPromiseMem(store: MemoryStore, ns: string): Promise<PromiseMem> {
  const all = await store.readAll(ns);
  const tagged: Tagged[] = [];
  for (const mem of all) { const tag = parseTag(mem.text); if (tag) tagged.push({ tag, mem }); }
  const reasons: Reason[] = [];
  const attempts = new Map<number, AttemptMem>();
  const get = (n: number) => attempts.get(n);
  for (const { tag, mem } of tagged) {
    const a = tag.attrs;
    const n = Number(a.attempt);
    switch (tag.kind) {
      case "reason":
        if (a.id && !reasons.some((r) => r.id === a.id))
          reasons.push({ id: a.id, text: tag.text, createdAt: mem.createdAt, blobId: mem.blobId, kind: a.kind === "checkin" ? "checkin" : "promise" });
        break;
      case "urge":
        if (Number.isInteger(n) && !attempts.has(n))
          attempts.set(n, { number: n, trigger: asTrigger(a.trigger), urge: tag.text, at: mem.createdAt, blobId: mem.blobId });
        break;
      case "shown": {
        const at = get(n);
        if (at && !at.shown) at.shown = { reasons: (a.reasons ?? "").split(",").filter(Boolean), src: a.src === "llm" ? "llm" : "code" };
        break;
      }
      case "decision": {
        const at = get(n);
        if (at && !at.result && (a.result === "held" || a.result === "exited")) at.result = a.result;
        break;
      }
      case "outcome": {
        const at = get(n);
        if (at && !at.felt && (a.felt === "regret" || a.felt === "fine")) { at.felt = a.felt; at.finding = tag.text; }
        break;
      }
      case "withdraw": {
        const at = get(n);
        if (at && !at.withdrawReason && tag.text) at.withdrawReason = tag.text;
        break;
      }
      case "plan": {
        const at = get(n);
        if (at && !at.plan && tag.text) at.plan = tag.text;
        break;
      }
    }
  }
  return { tagged, reasons, attempts };
}

function factsOf(mem: PromiseMem, dbAttempts: AttemptRow[]): AttemptFacts[] {
  const dbState = new Map(dbAttempts.map((a) => [a.number, a.state]));
  return [...mem.attempts.values()].sort((x, y) => x.number - y.number).map((a) => {
    const st = dbState.get(a.number);
    // DB state covers the window where an async `remember` of the decision has not been indexed yet.
    const result = a.result ?? (st === "held" || st === "exited" ? st : undefined);
    return { number: a.number, trigger: a.trigger, shown: a.shown?.reasons ?? [], result, felt: a.felt };
  });
}

export const dbAttempts = (promiseId: string) =>
  getDb().all<AttemptRow>("SELECT * FROM attempts WHERE promise_id = ? ORDER BY number", [promiseId]);

// ---------- Promises / reasons ----------
export async function createPromise(store: MemoryStore, owner: string, body: { vaultId: string; coinType: string; reason: string }) {
  const id = `p${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const ns = `promise-${id}`;
  await getDb().run("INSERT INTO promises(id, owner, current_vault_id, namespace, coin_type, status, created_at) VALUES (?,?,?,?,?,'active',?)",
    [id, owner, body.vaultId, ns, body.coinType, Date.now()]);
  const reason = await addReason(store, ns, body.reason, "promise");
  const row = (await getDb().get<PromiseRow>("SELECT * FROM promises WHERE id = ?", [id]))!;
  return { promise: await toPromiseDTO(row), reason };
}

export async function addReason(store: MemoryStore, ns: string, text: string, kind: "promise" | "checkin"): Promise<Reason> {
  const mem = await loadPromiseMem(store, ns);
  const next = mem.reasons.reduce((m, r) => Math.max(m, Number(r.id.slice(1)) || 0), 0) + 1;
  const id = `r${next}`;
  const attrs: Record<string, string> = { id };
  if (kind === "checkin") attrs.kind = "checkin";
  const w = await store.write(ns, formatTag("reason", attrs, text), { wait: true });
  return { id, text, createdAt: new Date().toISOString(), blobId: w.blobId, kind };
}

export async function listReasons(store: MemoryStore, ns: string): Promise<Reason[]> {
  return (await loadPromiseMem(store, ns)).reasons;
}

// ---------- Attempts ----------
export async function createAttempt(store: MemoryStore, p: PromiseRow, urge: string, llm: LlmOpts = {}): Promise<AttemptResp> {
  if (p.status === "closed") throw new HttpError(409, "Promise is closed");
  const { trigger } = await labelUrge(urge, llm);
  const db = getDb();
  const id = `a${randomUUID().replace(/-/g, "").slice(0, 10)}`;
  const number = await db.tx(async (t) => {
    const n = ((await t.get<{ m: number | null }>("SELECT MAX(number) m FROM attempts WHERE promise_id = ?", [p.id]))!.m ?? 0) + 1;
    await t.run("INSERT INTO attempts(id, promise_id, number, state, created_at) VALUES (?,?,?,'open',?)", [id, p.id, n, Date.now()]);
    return n;
  });
  try {
    const w = await store.write(p.namespace, formatTag("urge", { attempt: number, trigger }, urge), { wait: true });
    return { attemptId: id, number, urgeBlobId: w.blobId ?? "", trigger };
  } catch (e) {
    await db.run("DELETE FROM attempts WHERE id = ?", [id]);
    throw e;
  }
}

export function getAttempt(id: string): Promise<AttemptRow | undefined> {
  return getDb().get<AttemptRow>("SELECT * FROM attempts WHERE id = ?", [id]);
}
export function getPromise(id: string): Promise<PromiseRow | undefined> {
  return getDb().get<PromiseRow>("SELECT * FROM promises WHERE id = ?", [id]);
}

export async function resolveAttemptForPastYou(promiseId: string, attemptId?: string | null): Promise<AttemptRow> {
  const rows = await dbAttempts(promiseId);
  const a = attemptId ? rows.find((r) => r.id === attemptId) : [...rows].reverse().find((r) => r.state === "open") ?? rows[rows.length - 1];
  if (!a) throw new HttpError(404, "No attempt yet. POST /attempts first.");
  return a;
}

// ---------- Past You ----------
function historyOf(mem: PromiseMem, facts: AttemptFacts[], before: number, txByNumber: Map<number, string | null>): PastAttempt[] {
  return [...mem.attempts.values()].filter((a) => a.number < before).sort((a, b) => a.number - b.number).map((a) => {
    const f = facts.find((x) => x.number === a.number);
    return {
      number: a.number, trigger: a.trigger, urge: a.urge, result: f?.result ?? "pending", felt: a.felt, finding: a.finding,
      at: a.at, blobId: a.blobId, txDigest: txByNumber.get(a.number) ?? undefined,
    };
  });
}

export async function assemblePastYou(store: MemoryStore, p: PromiseRow, attempt: AttemptRow, llm: LlmOpts = {}): Promise<PastYouDTO> {
  const mem = await loadPromiseMem(store, p.namespace);
  const rows = await dbAttempts(p.id);
  const facts = factsOf(mem, rows);
  const cur = mem.attempts.get(attempt.number);
  if (!cur) throw new HttpError(409, "Urge memory for this attempt is not available yet");
  const txBy = new Map(rows.map((r) => [r.number, r.exit_tx]));
  const history = historyOf(mem, facts, attempt.number, txBy);

  if (cur.trigger === "emergency" || isEmergencyText(cur.urge)) {
    return { emergency: true, trigger: "emergency", quotes: [], history, orderSource: "code", attemptNumber: attempt.number };
  }

  const ids = mem.reasons.map((r) => r.id);
  const stats = computeStats(ids, facts, cur.trigger, attempt.number);
  const byId = new Map(mem.reasons.map((r) => [r.id, r]));
  let chosen: { stats: typeof stats; source: "llm" | "code" };

  if (cur.shown) {
    // Already assembled for this attempt: stay stable across reloads.
    const sById = new Map(stats.map((s) => [s.reasonId, s]));
    chosen = { stats: cur.shown.reasons.map((i) => sById.get(i)).filter((s): s is NonNullable<typeof s> => !!s), source: cur.shown.src };
  } else {
    const top = rankReasons(stats);
    const order = await reorderTop(cur.trigger, top.map((s) => ({ id: s.reasonId, text: byId.get(s.reasonId)!.text, shown: s.shown, held: s.held })), llm);
    chosen = applyOrder(top, order);
    await store.write(p.namespace,
      formatTag("shown", { attempt: attempt.number, reasons: chosen.stats.map((s) => s.reasonId).join(","), src: chosen.source }),
      { wait: false });
  }

  const quotes: PastYouQuote[] = chosen.stats.map((s) => {
    const r = byId.get(s.reasonId)!;
    return { reasonId: r.id, text: r.text, date: r.createdAt, blobId: r.blobId, template: templateFor(s), stats: s };
  });
  return { emergency: false, trigger: cur.trigger, quotes, history, orderSource: chosen.source, attemptNumber: attempt.number };
}

// ---------- Decision / outcome ----------
const FOLLOW_UP_MS = Number(process.env.FOLLOW_UP_MS) || 24 * 3600 * 1000;

export async function recordDecision(store: MemoryStore, p: PromiseRow, a: AttemptRow, result: "held" | "exited", exitTx?: string, extra: { withdrawReason?: string; plan?: string } = {}) {
  if (a.state !== "open") throw new HttpError(409, "Decision already recorded for this attempt");
  if (result === "exited" && !exitTx) throw new HttpError(400, "exitTx is required when result is exited");
  const followUp = result === "exited" ? Date.now() + FOLLOW_UP_MS : null;
  await getDb().tx(async (t) => {
    await t.run("UPDATE attempts SET state = ?, exit_tx = ?, follow_up_at = ? WHERE id = ?", [result, result === "exited" ? exitTx! : null, followUp, a.id]);
    if (result === "exited") await t.run("UPDATE promises SET status = 'exiting' WHERE id = ?", [p.id]);
  });
  await store.write(p.namespace, formatTag("decision", { attempt: a.number, result }), { wait: false });
  if (result === "exited") {
    if (extra.withdrawReason?.trim()) await store.write(p.namespace, formatTag("withdraw", { attempt: a.number }, extra.withdrawReason.trim()), { wait: false });
    if (extra.plan?.trim()) await store.write(p.namespace, formatTag("plan", { attempt: a.number }, extra.plan.trim()), { wait: false });
  }
  return { attemptNumber: a.number, followUpAt: followUp ? new Date(followUp).toISOString() : null };
}

export async function recordOutcome(store: MemoryStore, p: PromiseRow, a: AttemptRow, felt: "regret" | "fine") {
  if (a.state === "open") throw new HttpError(409, "Record a decision before the outcome");
  const mem = await loadPromiseMem(store, p.namespace);
  if (mem.attempts.get(a.number)?.felt) throw new HttpError(409, "Outcome already recorded");
  const finding = a.exit_tx ? await exitFinding(p.owner, a.exit_tx) : "You kept your promise this time.";
  const w = await store.write(p.namespace, formatTag("outcome", { attempt: a.number, felt }, finding), { wait: false });
  return { finding, blobId: w.blobId };
}

// ---------- Memories listing ----------
export async function listMemories(store: MemoryStore, ns: string): Promise<MemoryItemDTO[]> {
  const mem = await loadPromiseMem(store, ns);
  return mem.tagged.map(({ tag, mem: m }) => ({
    blobId: m.blobId, walrusUrl: walrusBlobUrl(m.blobId), kind: tag.kind as TagKind, attrs: tag.attrs, text: tag.text, createdAt: m.createdAt,
  }));
}

// ---------- Habit ----------
export async function recordHabitCheck(store: MemoryStore, p: PromiseRow, week: number, result: "kept" | "missed" | "unknown", note?: string) {
  const w = await store.write(p.namespace, formatTag("habit", { week, result }, note), { wait: false });
  return { blobId: w.blobId };
}

// ---------- Insights ----------
/** Pure: counts from attempts (shared with the demo). */
export function insightsStats(attempts: InsightAttempt[]): InsightsDTO["stats"] {
  const by = new Map<Trigger, number>();
  for (const a of attempts) by.set(a.trigger, (by.get(a.trigger) ?? 0) + 1);
  return {
    attempts: attempts.length,
    held: attempts.filter((a) => a.result === "held").length,
    exited: attempts.filter((a) => a.result === "exited").length,
    regretted: attempts.filter((a) => a.felt === "regret").length,
    byTrigger: [...by.entries()].map(([trigger, count]) => ({ trigger, count })).sort((x, y) => y.count - x.count),
  };
}

/** The user's saving reasons next to every attempt to leave, from Walrus Memory, plus where withdrawn money went (Tatum). */
export async function buildInsights(store: MemoryStore, p: PromiseRow): Promise<InsightsDTO> {
  const [mem, rows] = await Promise.all([loadPromiseMem(store, p.namespace), dbAttempts(p.id)]);
  const byNumber = new Map(rows.map((r) => [r.number, r]));
  const attempts: InsightAttempt[] = [];
  for (const a of [...mem.attempts.values()].sort((x, y) => x.number - y.number)) {
    const row = byNumber.get(a.number);
    const result = a.result ?? (row?.state === "held" || row?.state === "exited" ? row.state : "pending");
    const exitTx = row?.exit_tx ?? undefined;
    const wentTo = result === "exited" ? (a.finding ?? (exitTx ? await exitFinding(p.owner, exitTx) : undefined)) : undefined;
    attempts.push({ number: a.number, at: a.at, trigger: a.trigger, urge: a.urge, withdrawReason: a.withdrawReason, plan: a.plan, result, felt: a.felt, wentTo, exitTx });
  }
  const goal = mem.reasons.map((r) => ({ text: r.text, date: r.createdAt }));
  return { goal, attempts, stats: insightsStats(attempts) };
}
