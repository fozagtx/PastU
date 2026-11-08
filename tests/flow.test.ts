import "./setup-env";
import { beforeEach, describe, expect, it } from "vitest";
import { getDb, resetDbForTests } from "../src/lib/server/db";
import { fakeStore } from "../src/lib/server/memory";
import { COOKIE, mintSession } from "../src/lib/server/session";
import { POST as createPromise, GET as listPromises } from "../src/app/api/promises/route";
import { GET as getPromise } from "../src/app/api/promises/[id]/route";
import { POST as addReason } from "../src/app/api/promises/[id]/reasons/route";
import { POST as addAttempt } from "../src/app/api/promises/[id]/attempts/route";
import { GET as pastYou } from "../src/app/api/promises/[id]/past-you/route";
import { GET as memories } from "../src/app/api/promises/[id]/memories/route";
import { GET as chain } from "../src/app/api/promises/[id]/chain/route";
import { POST as decision } from "../src/app/api/attempts/[id]/decision/route";
import { POST as outcome } from "../src/app/api/attempts/[id]/outcome/route";
import { POST as account, DELETE as delAccount } from "../src/app/api/account/route";
import type { AttemptResp, PastYouDTO } from "../src/lib/types";

const ME = "0x" + "a".repeat(64), OTHER = "0x" + "b".repeat(64);
const VAULT = "0x" + "c".repeat(64), COIN = "0x2::usdc::USDC", TX = "T".repeat(44);
const cookie = (a: string) => `${COOKIE}=${mintSession(a).token}`;
const call = (h: Function, who: string | null, body?: unknown, id?: string, url = "http://x/") =>
  h(new Request(url, { method: body ? "POST" : "GET", headers: { "content-type": "application/json", ...(who ? { cookie: cookie(who) } : {}) }, body: body ? JSON.stringify(body) : undefined }),
    { params: Promise.resolve({ id }) });

beforeEach(() => { resetDbForTests(); fakeStore().clear(); });

async function setup() {
  const r = await call(createPromise, ME, { vaultId: VAULT, coinType: COIN, reason: "Maya's school fees start in January." });
  expect(r.status).toBe(201);
  const { promise } = await r.json();
  for (const t of ["I want to own my first home.", "Dad worked 30 years for this.", "Freedom to quit a bad job.", "Never again borrowing from friends."])
    expect((await call(addReason, ME, { text: t }, promise.id)).status).toBe(201);
  return promise.id as string;
}

async function attempt(pid: string, urge: string) {
  const a: AttemptResp = await (await call(addAttempt, ME, { urge }, pid)).json();
  const py: PastYouDTO = await (await call(pastYou, ME, undefined, pid, `http://x/?attempt=${a.attemptId}`)).json();
  return { a, py };
}
const order = (py: PastYouDTO) => py.quotes.map((q) => q.reasonId);

describe("auth guards", () => {
  it("401 without session, 404 for someone else's promise", async () => {
    expect((await call(listPromises, null)).status).toBe(401);
    const pid = await setup();
    expect((await call(getPromise, OTHER, undefined, pid)).status).toBe(404);
    expect((await call(addAttempt, OTHER, { urge: "x" }, pid)).status).toBe(404);
    expect((await call(getPromise, ME, undefined, pid)).status).toBe(200);
  });
  it("validates bodies with zod", async () => {
    expect((await call(createPromise, ME, { vaultId: "nope" })).status).toBe(400);
  });
});

describe("account", () => {
  it("returns delegate public key, records accountId, deletes key", async () => {
    const r1 = await (await call(account, ME, {})).json();
    expect(r1.delegatePublicKey).toMatch(/^[0-9a-f]{64}$/);
    expect(r1.accountId).toBeNull();
    const r2 = await (await call(account, ME, { accountId: VAULT })).json();
    expect(r2.delegatePublicKey).toBe(r1.delegatePublicKey);
    expect(r2.accountId).toBe(VAULT);
    const row = getDb().prepare("SELECT * FROM users WHERE address = ?").get(ME) as any;
    expect(row.delegate_key_encrypted).toBeTruthy();
    expect(row.delegate_key_encrypted).not.toMatch(/^[0-9a-f]{64}$/);
    expect((await call(delAccount, ME)).status).toBe(200);
    expect((getDb().prepare("SELECT * FROM users WHERE address = ?").get(ME) as any).delegate_key_encrypted).toBeNull();
  });
});

describe("full 3-attempt demo", () => {
  it("quote order changes as results come in, stats are templated, nothing textual is in SQLite", async () => {
    const pid = await setup();

    // Attempt 1 (payday): all reasons new => creation order.
    const a1 = await attempt(pid, "Payday! I want to treat myself");
    expect(a1.a.trigger).toBe("payday");
    expect(a1.a.urgeBlobId).toBeTruthy();
    expect(a1.py.emergency).toBe(false);
    expect(order(a1.py)).toEqual(["r1", "r2", "r3"]);
    expect(a1.py.orderSource).toBe("code");
    expect(a1.py.quotes[0].text).toBe("Maya's school fees start in January."); // exact stored text
    expect(a1.py.quotes[0].template).toBe("You haven't seen this one yet.");
    // idempotent re-read
    const again: PastYouDTO = await (await call(pastYou, ME, undefined, pid)).json();
    expect(order(again)).toEqual(order(a1.py));

    // exits, feels fine => shown reasons drop below the unseen r4/r5.
    expect((await call(decision, ME, { result: "exited" }, a1.a.attemptId)).status).toBe(400); // needs tx
    expect((await call(decision, ME, { result: "exited", exitTx: TX }, a1.a.attemptId)).status).toBe(200);
    expect((await call(decision, ME, { result: "held" }, a1.a.attemptId)).status).toBe(409);
    const o1 = await (await call(outcome, ME, { felt: "fine" }, a1.a.attemptId)).json();
    expect(o1.finding).toContain("[mock finding]");

    // Attempt 2 (loss): order changed.
    const a2 = await attempt(pid, "I lost money on a trade, want to win it back");
    expect(a2.a.number).toBe(2);
    expect(order(a2.py)).toEqual(["r4", "r5", "r1"]);
    expect(order(a2.py)).not.toEqual(order(a1.py));
    expect(a2.py.history).toHaveLength(1);
    expect(a2.py.history[0]).toMatchObject({ number: 1, trigger: "payday", result: "exited", felt: "fine", txDigest: TX });
    expect(a2.py.quotes[2].template).toBe("Shown 1 time. You kept your promise 0 times.");

    // Exits again and regrets => its set drops; a newly added reason now wins a slot.
    await call(decision, ME, { result: "exited", exitTx: TX }, a2.a.attemptId);
    await call(outcome, ME, { felt: "regret" }, a2.a.attemptId);
    await call(addReason, ME, { text: "Newest reason." }, pid);

    const a3 = await attempt(pid, "so bored tonight");
    expect(order(a3.py)).toEqual(["r4", "r5", "r6"]);
    expect(order(a3.py)).not.toEqual(order(a2.py));
    expect(a3.py.history.map((h) => h.number)).toEqual([1, 2]);
    await call(decision, ME, { result: "held" }, a3.a.attemptId);

    // Memories listing exposes every tagged memory with blob ids.
    const mems: any[] = await (await call(memories, ME, undefined, pid)).json();
    const kinds = mems.map((m) => m.kind);
    for (const k of ["reason", "urge", "shown", "decision", "outcome"]) expect(kinds).toContain(k);
    expect(mems.filter((m) => m.kind === "reason")).toHaveLength(6);
    expect(mems.every((m) => m.blobId)).toBe(true);

    const detail = await (await call(getPromise, ME, undefined, pid)).json();
    expect(detail.attempts).toBe(3);
    expect(detail.reasons.map((r: any) => r.id)).toEqual(["r1", "r2", "r3", "r4", "r5", "r6"]);
    expect(detail.status).toBe("exiting");

    // No user-written text in SQLite.
    const dump = JSON.stringify(["users", "promises", "attempts", "habits"].map((t) => getDb().prepare(`SELECT * FROM ${t}`).all()));
    for (const s of ["Maya", "treat myself", "lost money", "bored", "Newest reason"]) expect(dump).not.toContain(s);
  });

  it("emergency: no quotes, timer only", async () => {
    const pid = await setup();
    const { py } = await attempt(pid, "My mother is in the hospital and I need money now");
    expect(py).toMatchObject({ emergency: true, trigger: "emergency", quotes: [] });
  });

  it("chain endpoint degrades to a labelled mock without a Tatum key", async () => {
    const pid = await setup();
    expect(await (await call(chain, ME, undefined, pid)).json()).toMatchObject({ source: "mock", vault: null });
  });
});
