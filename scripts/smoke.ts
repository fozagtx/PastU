// Smoke test: `npm run smoke`. Offline-safe (fake memory); checks Tatum if TATUM_API_KEY is set.
import { env } from "../src/lib/server/env";
import { fakeStore } from "../src/lib/server/memory";
import { listBalances } from "../src/lib/server/tatum";

async function step(name: string, fn: () => Promise<void>) {
  try { await fn(); console.log(`PASS ${name}`); }
  catch (e) { console.log(`FAIL ${name}: ${(e as Error).message}`); process.exitCode = 1; }
}

(async () => {
  console.log(`network=${env.network} memory=${env.memoryMode} tatum=${env.tatumKey ? "key" : "none"} nebius=${env.nebiusKey ? "key" : "none"}`);
  await step("memory write + exact recall (fake store)", async () => {
    const s = fakeStore(); const ns = `smoke-${Date.now()}`;
    const text = "[reason id=r1] This is my rent deposit.";
    await s.write(ns, text, { wait: true });
    const all = await s.readAll(ns);
    if (all[0]?.text !== text) throw new Error("recalled text differs from stored text");
  });
  if (env.tatumKey) await step(`tatum ${env.network} gRPC reachable`, async () => {
    await listBalances("0x" + "0".repeat(64));
  });
  else console.log("SKIP tatum (no TATUM_API_KEY)");
  if (env.memoryMode === "real") console.log("NOTE real Walrus check needs a user delegate key: use the app's /promise/new flow.");
})();
