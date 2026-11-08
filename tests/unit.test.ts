import "./setup-env";
import { describe, expect, it } from "vitest";
import { applyOrder, computeStats, rankReasons, templateFor, type AttemptFacts } from "../src/lib/server/scoring";
import { formatTag, parseTag } from "../src/lib/server/tags";
import { decryptSecret, encryptSecret } from "../src/lib/server/crypto";
import { heuristicLabel, labelUrge, reorderTop } from "../src/lib/server/llm";
import { mintSession, verifySession } from "../src/lib/server/session";
import { findingSentence } from "../src/lib/server/tatum";

const ids = ["r1", "r2", "r3", "r4", "r5"];
const att = (n: number, shown: string[], result: "held" | "exited", trigger: any = "loss", felt?: "regret" | "fine"): AttemptFacts =>
  ({ number: n, trigger, shown, result, felt });

describe("scoring", () => {
  it("new reasons score 0.5 and ties keep creation order", () => {
    const top = rankReasons(computeStats(ids, [], "loss"));
    expect(top.map((s) => s.reasonId)).toEqual(["r1", "r2", "r3"]);
    expect(top.every((s) => s.score === 0.5)).toBe(true);
  });
  it("applies (h + 0.5g + 1)/(s + 2) + 0.25c", () => {
    const [r1] = computeStats(["r1"], [att(1, ["r1"], "held"), att(2, ["r1"], "exited", "loss", "regret")], "loss", 3);
    expect(r1).toMatchObject({ shown: 2, held: 1, regretted: 1, similarHold: true });
    expect(r1.score).toBeCloseTo((1 + 0.5 + 1) / 4 + 0.25);
  });
  it("similarity bonus needs the same trigger label", () => {
    const hist = [att(1, ["r1"], "held", "payday")];
    expect(computeStats(["r1"], hist, "payday")[0].similarHold).toBe(true);
    expect(computeStats(["r1"], hist, "loss")[0].similarHold).toBe(false);
  });
  it("ignores attempts at or after beforeNumber", () => {
    expect(computeStats(["r1"], [att(2, ["r1"], "held")], "loss", 2)[0].shown).toBe(0);
  });
  it("different results give a different next order", () => {
    const heldA = rankReasons(computeStats(ids, [att(1, ["r1", "r2", "r3"], "held")], "loss")).map((s) => s.reasonId);
    const fineExit = rankReasons(computeStats(ids, [att(1, ["r1", "r2", "r3"], "exited", "loss", "fine")], "loss")).map((s) => s.reasonId);
    expect(heldA).toEqual(["r1", "r2", "r3"]);
    expect(fineExit).toEqual(["r4", "r5", "r1"]);
    expect(heldA).not.toEqual(fineExit);
  });
  it("same-trigger hold outranks otherwise equal reason", () => {
    const hist = [att(1, ["r2"], "held", "payday"), att(2, ["r3"], "held", "loss")];
    expect(rankReasons(computeStats(["r1", "r2", "r3"], hist, "payday"), 3).map((s) => s.reasonId)[0]).toBe("r2");
  });
  it("template wording", () => {
    const s = computeStats(["r1"], [att(1, ["r1"], "held"), att(2, ["r1"], "exited", "loss", "fine")], "loss")[0];
    expect(templateFor(s)).toBe("Shown 2 times. You kept your promise 1 time.");
  });
  it("applyOrder accepts permutations only", () => {
    const c = rankReasons(computeStats(ids, [], "loss"));
    expect(applyOrder(c, ["r3", "r1", "r2"])).toMatchObject({ source: "llm" });
    expect(applyOrder(c, ["r3", "r1", "r9"]).source).toBe("code");
    expect(applyOrder(c, ["r1", "r1", "r2"]).source).toBe("code");
    expect(applyOrder(c, null).stats).toBe(c);
  });
});

describe("tags", () => {
  it("round-trips all kinds", () => {
    const cases: [any, Record<string, string | number>, string?][] = [
      ["reason", { id: "r1" }, "Because Maya's school fees are due.\nSecond line [with brackets]"],
      ["urge", { attempt: 2, trigger: "loss" }, "I lost on that trade"],
      ["shown", { attempt: 2, reasons: "r1,r3" }],
      ["decision", { attempt: 2, result: "held" }],
      ["outcome", { attempt: 1, felt: "regret" }, "190 USDC left this wallet within an hour"],
      ["habit", { week: 3, result: "missed" }, "busy week"],
    ];
    for (const [k, a, t] of cases) {
      const p = parseTag(formatTag(k, a, t))!;
      expect(p.kind).toBe(k);
      expect(p.text).toBe(t ?? "");
      for (const [kk, v] of Object.entries(a)) expect(p.attrs[kk]).toBe(String(v));
    }
  });
  it("parses the spec examples and rejects non-tags", () => {
    expect(parseTag("[reason id=r1] text")).toEqual({ kind: "reason", attrs: { id: "r1" }, text: "text" });
    expect(parseTag("[shown attempt=2 reasons=r1,r3]")!.attrs.reasons).toBe("r1,r3");
    expect(parseTag("hello [reason id=r1]")).toBeNull();
    expect(parseTag("[unknown a=b] x")).toBeNull();
  });
  it("refuses unsafe attribute values", () => {
    expect(() => formatTag("urge", { attempt: 1, trigger: "a b" }, "x")).toThrow();
  });
});

describe("crypto + session", () => {
  it("AES-GCM round trip, random iv, tamper detection", () => {
    const e1 = encryptSecret("deadbeef"), e2 = encryptSecret("deadbeef");
    expect(e1).not.toBe(e2);
    expect(decryptSecret(e1)).toBe("deadbeef");
    const raw = Buffer.from(e1, "base64"); raw[raw.length - 1] ^= 1;
    expect(() => decryptSecret(raw.toString("base64"))).toThrow();
  });
  it("session tokens verify, expire and reject tampering", () => {
    const { token } = mintSession("0xabc", 1_000);
    expect(verifySession(token, 2_000)).toBe("0xabc");
    expect(verifySession(token, Date.now() + 10 * 86400_000)).toBeNull();
    expect(verifySession(token.slice(0, -2) + "xx", 2_000)).toBeNull();
    expect(verifySession(undefined)).toBeNull();
  });
});

const llmResp = (content: string, ok = true) =>
  (async () => ({ ok, json: async () => ({ choices: [{ message: { content } }] }) })) as unknown as typeof fetch;
const key = { apiKey: "k", model: "m" };

describe("llm fallback", () => {
  it("heuristic labeler", () => {
    expect(heuristicLabel("I lost money on a trade")).toBe("loss");
    expect(heuristicLabel("got my salary, treat myself")).toBe("payday");
    expect(heuristicLabel("so bored")).toBe("boredom");
    expect(heuristicLabel("my dad is in the hospital")).toBe("emergency");
    expect(heuristicLabel("xyz")).toBe("other");
  });
  it("no key => code label", async () => {
    expect(await labelUrge("so stressed about work")).toEqual({ trigger: "stress", source: "code" });
  });
  it("uses a valid LLM label", async () => {
    expect(await labelUrge("hmm", { ...key, fetchImpl: llmResp('{"trigger":"social"}') })).toEqual({ trigger: "social", source: "llm" });
  });
  it("falls back on invalid label, bad JSON, http error, thrown fetch", async () => {
    for (const f of [llmResp('{"trigger":"rage"}'), llmResp("not json"), llmResp("{}", false), (async () => { throw new Error("net"); }) as unknown as typeof fetch]) {
      expect((await labelUrge("so bored", { ...key, fetchImpl: f })).source).toBe("code");
    }
  });
  it("emergency keywords override the model", async () => {
    expect(await labelUrge("ambulance bill", { ...key, fetchImpl: llmResp('{"trigger":"loss"}') })).toEqual({ trigger: "emergency", source: "code" });
  });
  const cands = [1, 2, 3].map((i) => ({ id: `r${i}`, text: "t", shown: 0, held: 0 }));
  it("reorder accepts a permutation, rejects unknown/duplicate/missing ids", async () => {
    expect(await reorderTop("loss", cands, { ...key, fetchImpl: llmResp('{"order":["r3","r1","r2"]}') })).toEqual(["r3", "r1", "r2"]);
    for (const bad of ['{"order":["r1","r2","r9"]}', '{"order":["r1","r1","r2"]}', '{"order":["r1","r2"]}', "garbage"])
      expect(await reorderTop("loss", cands, { ...key, fetchImpl: llmResp(bad) })).toBeNull();
    expect(await reorderTop("loss", cands)).toBeNull(); // no key
  });
});

describe("tatum finding wording", () => {
  it("matches the spec shape", () => {
    expect(findingSentence({ left: 190_000_000n, coinType: "0x1::usdc::USDC", windowMs: 1_800_000, basis: "received-and-spent" }))
      .toBe("190 USDC left this wallet within an hour");
    expect(findingSentence({ left: 5_000_000n, coinType: "0x1::usdc::USDC", windowMs: null, basis: "diff" })).toContain("left the wallet");
  });
});
