import "./setup-env";
import { beforeEach, describe, expect, it } from "vitest";
import { resetDbForTests } from "../src/lib/server/db";
import { fakeStore } from "../src/lib/server/memory";
import { COOKIE, mintSession } from "../src/lib/server/session";
import { POST as createPromise } from "../src/app/api/promises/route";
import { POST as addAttempt } from "../src/app/api/promises/[id]/attempts/route";
import { GET as insights } from "../src/app/api/promises/[id]/insights/route";
import { POST as chat } from "../src/app/api/promises/[id]/insights/chat/route";
import { POST as decision } from "../src/app/api/attempts/[id]/decision/route";
import { insightsStats } from "../src/lib/server/service";
import { answerQuestion } from "../src/lib/server/chat";
import type { InsightsDTO } from "../src/lib/types";

const ME = "0x" + "a".repeat(64), OTHER = "0x" + "b".repeat(64);
const VAULT = "0x" + "c".repeat(64), COIN = "0x2::usdc::USDC", TX = "T".repeat(44), TX2 = "U".repeat(44);
const cookie = (a: string) => `${COOKIE}=${mintSession(a).token}`;
const call = (h: Function, who: string | null, body?: unknown, id?: string, sub?: string, url = "http://x/") =>
  h(new Request(url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(who ? { cookie: cookie(who) } : {}) }, body: body ? JSON.stringify(body) : undefined }),
    { params: Promise.resolve({ id }) });

beforeEach(async () => { await resetDbForTests(); fakeStore().clear(); });

async function setup() {
  const r = await call(createPromise, ME, { vaultId: VAULT, coinType: COIN, reason: "Save for my daughter's school fees." });
  expect(r.status).toBe(201);
  return (await r.json()).promise.id as string;
}

describe("insightsStats (pure)", () => {
  it("counts attempts, outcomes and triggers", () => {
    const s = insightsStats([
      { number: 1, at: "2026-01-01", trigger: "loss", urge: "a", result: "held" },
      { number: 2, at: "2026-01-02", trigger: "loss", urge: "b", result: "exited", felt: "regret" },
      { number: 3, at: "2026-01-03", trigger: "stress", urge: "c", result: "exited", felt: "fine" },
    ]);
    expect(s).toEqual({ attempts: 3, held: 1, exited: 2, regretted: 1, byTrigger: [{ trigger: "loss", count: 2 }, { trigger: "stress", count: 1 }] });
  });
});

describe("chat grounding (pure)", () => {
  const dto: InsightsDTO = {
    goal: [{ text: "Save for my daughter's school fees.", date: "2026-01-01" }],
    attempts: [{ number: 1, at: "2026-01-02", trigger: "loss", urge: "Lost money on a trade, want it back.", withdrawReason: "I panicked after the loss.", plan: "Sell now.", result: "exited", felt: "regret", wentTo: "50 USDC left this wallet within an hour" }],
    stats: { attempts: 1, held: 0, exited: 1, regretted: 1, byTrigger: [{ trigger: "loss", count: 1 }] },
  };
  it("answers with verbatim quotes only and no invented words", async () => {
    const { answer } = await answerQuestion(dto, "why did I withdraw after a loss?");
    expect(answer).toContain("Based only on your own words");
    // Both the urge text and the withdraw reason share the "loss/lost" clue.
    expect(answer).toContain("I panicked after the loss.");
    // No paraphrase: every quoted sentence must be a stored text verbatim.
    const stored = [...dto.goal.map((g) => g.text), dto.attempts[0].urge, dto.attempts[0].withdrawReason!, dto.attempts[0].plan!, dto.attempts[0].wentTo!];
    for (const line of answer.split("\n").filter((l) => l.startsWith("- “"))) {
      const q = line.slice(3, line.indexOf("”"));
      expect(stored).toContain(q);
    }
  });
  it("uses LLM picks when the model returns valid ids", async () => {
    const fetchImpl = (async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: '{"relevant":["a1-withdraw"]}' } }] }) })) as unknown as typeof fetch;
    const { answer, source } = await answerQuestion(dto, "anything", { apiKey: "k", model: "m", fetchImpl });
    expect(source).toBe("llm");
    expect(answer).toContain("I panicked after the loss.");
  });
  it("falls back to code on bad JSON or unknown ids", async () => {
    for (const bad of ['{"relevant":["nope"]}', "garbage", '{"relevant":[]}']) {
      const fetchImpl = (async () => ({ ok: true, json: async () => ({ choices: [{ message: { content: bad } }] }) })) as unknown as typeof fetch;
      const { source } = await answerQuestion(dto, "loss", { apiKey: "k", model: "m", fetchImpl });
      expect(source).toBe("code");
    }
  });
});

describe("insights + chat routes", () => {
  it("401 without session, 404 for someone else, 400 on bad chat body", async () => {
    const pid = await setup();
    expect((await call(insights, null, undefined, pid)).status).toBe(401);
    expect((await call(insights, OTHER, undefined, pid)).status).toBe(404);
    expect((await call(chat, OTHER, { messages: [{ role: "user", content: "hi" }] }, pid)).status).toBe(404);
    expect((await call(chat, ME, { messages: [] }, pid)).status).toBe(400);
    expect((await call(chat, ME, { messages: [{ role: "assistant", content: "hi" }] }, pid)).status).toBe(400);
    expect((await call(chat, ME, { messages: [{ role: "user", content: "hi" }] }, pid)).status).toBe(200);
  });

  it("shows withdraw reason, plan and Tatum finding beside saving reasons", async () => {
    const pid = await setup();
    const a = await (await call(addAttempt, ME, { urge: "Lost money on a trade, want it back now" }, pid)).json();
    expect((await call(decision, ME, { result: "exited", exitTx: TX, withdrawReason: "I panicked after the loss.", plan: "Sell now." }, a.attemptId)).status).toBe(200);

    const dto: InsightsDTO = await (await call(insights, ME, undefined, pid)).json();
    expect(dto.goal).toEqual([{ text: "Save for my daughter's school fees.", date: expect.any(String) }]);
    expect(dto.attempts).toHaveLength(1);
    expect(dto.attempts[0]).toMatchObject({
      number: 1, trigger: "loss", result: "exited",
      urge: "Lost money on a trade, want it back now",
      withdrawReason: "I panicked after the loss.", plan: "Sell now.",
    });
    expect(dto.attempts[0].wentTo).toContain("[mock finding]");
    expect(dto.stats).toMatchObject({ attempts: 1, held: 0, exited: 1 });
    expect(dto.stats.byTrigger).toEqual([{ trigger: "loss", count: 1 }]);

    // held attempts keep urge with no withdraw fields, and stats distinguish them
    const a2 = await (await call(addAttempt, ME, { urge: "so stressed about work today" }, pid)).json();
    await call(decision, ME, { result: "held" }, a2.attemptId);
    const d2: InsightsDTO = await (await call(insights, ME, undefined, pid)).json();
    expect(d2.attempts).toHaveLength(2);
    expect(d2.stats).toMatchObject({ attempts: 2, held: 1, exited: 1 });
    expect(d2.attempts[1]).toMatchObject({ number: 2, trigger: "stress", result: "held" });
    expect(d2.attempts[1].withdrawReason).toBeUndefined();

    // chat answers from this promise only with stored words
    const ans = await (await call(chat, ME, { messages: [{ role: "user", content: "why did I want to withdraw after a loss?" }] }, pid)).json();
    expect(ans.answer).toContain("Based only on your own words");
    expect(ans.answer).toContain("Lost money on a trade");
    // The question is loss-specific, so it should surface the loss quotes, not a goal.
    expect(ans.answer).toContain("I panicked after the loss.");
    // No invented text: every quoted line must be a stored string.
    const storedTexts = [dto.goal[0].text, ...dto.attempts.map((a) => [a.urge, a.withdrawReason, a.plan, a.wentTo].filter(Boolean) as string[]).flat()];
    for (const line of String(ans.answer).split("\n").filter((l: string) => l.startsWith("- “"))) {
      const q = line.slice(3, line.indexOf("”"));
      expect(storedTexts).toContain(q);
    }
  });

  it("second exit keeps both attempts in order with their own reasons", async () => {
    const pid = await setup();
    const a1 = await (await call(addAttempt, ME, { urge: "Payday! I want to treat myself" }, pid)).json();
    await call(decision, ME, { result: "exited", exitTx: TX, withdrawReason: "It was payday.", plan: "Treat myself." }, a1.attemptId);
    const a2 = await (await call(addAttempt, ME, { urge: "I lost money on a trade" }, pid)).json();
    await call(decision, ME, { result: "exited", exitTx: TX2, withdrawReason: "I want to win it back.", plan: "One more trade." }, a2.attemptId);
    const dto: InsightsDTO = await (await call(insights, ME, undefined, pid)).json();
    expect(dto.attempts.map((x) => x.number)).toEqual([1, 2]);
    expect(dto.attempts.map((x) => x.withdrawReason)).toEqual(["It was payday.", "I want to win it back."]);
    expect(dto.stats.byTrigger).toHaveLength(2);
    expect(dto.stats.byTrigger.map((t) => t.count)).toEqual([1, 1]);
  });
});
