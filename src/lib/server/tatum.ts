import { SuiGrpcClient } from "@mysten/sui/grpc";
import { env } from "./env";
import { isFakeMemory } from "./memory";
import type { VaultInfo } from "../types";

/** Server-side only. The x-api-key never leaves this module. */
let cached: { key: string; client: SuiGrpcClient } | null = null;
export function tatumConfigured() { return !!env.tatumKey; }

function client(): SuiGrpcClient {
  const key = env.tatumKey;
  if (!key) throw new Error("TATUM_API_KEY not configured");
  if (cached?.key === key) return cached.client;
  // SuiGrpcClient accepts grpc-web transport options, including request metadata (headers).
  const c = new SuiGrpcClient({ network: "mainnet", baseUrl: env.tatumUrl, meta: { "x-api-key": key } });
  cached = { key, client: c };
  return c;
}

function mockAllowed() { return isFakeMemory(); }

const DECIMALS: Record<string, number> = { USDC: 6, USDT: 6, SUI: 9 };
export function symbolOf(coinType: string): string {
  return coinType.split("::").pop() || coinType;
}
function decimalsOf(coinType: string): number { return DECIMALS[symbolOf(coinType).toUpperCase()] ?? 9; }
export function formatAmount(base: bigint, coinType: string): string {
  const d = decimalsOf(coinType);
  const neg = base < 0n; const v = neg ? -base : base;
  const div = 10n ** BigInt(d);
  const whole = v / div; const frac = (v % div).toString().padStart(d, "0").replace(/0+$/, "").slice(0, 2);
  return `${neg ? "-" : ""}${whole}${frac ? "." + frac : ""}`;
}

// ---- Vault ----
export async function getVault(objectId: string): Promise<VaultInfo> {
  const { object } = await client().core.getObject({ objectId, include: { json: true } });
  const j = (object.json ?? {}) as Record<string, unknown>;
  const num = (v: unknown) => (v == null ? null : String(typeof v === "object" && v && "value" in v ? (v as { value: unknown }).value : v));
  const balance = num(j.balance ?? j.principal ?? j.amount);
  const exit = num(j.exit_at_ms ?? j.exit_ready_ms ?? j.unlock_ms ?? j.exit_time_ms);
  const exitMs = exit && /^\d+$/.test(exit) ? Number(exit) : null;
  const m = /<(.+)>$/.exec(object.type);
  return {
    objectId, balance, coinType: m ? m[1] : null,
    exitAt: exitMs ? new Date(exitMs).toISOString() : null,
    exitRemainingMs: exitMs ? Math.max(0, exitMs - Date.now()) : null,
    raw: j,
  };
}

export async function listBalances(address: string): Promise<{ coinType: string; balance: string }[]> {
  const r = await client().core.listBalances({ owner: address });
  return r.balances.map((b) => ({ coinType: b.coinType, balance: b.balance }));
}

export async function getTransaction(digest: string) {
  const r = await client().core.getTransaction({ digest, include: { balanceChanges: true } });
  return r.Transaction ?? r.FailedTransaction;
}

// ---- Findings ----
export function describeWindow(ms: number): string {
  const h = ms / 3_600_000;
  if (h <= 1) return "within an hour";
  if (h < 24) return `within ${Math.ceil(h)} hours`;
  const d = Math.ceil(h / 24);
  return `within ${d} day${d === 1 ? "" : "s"}`;
}

/** Pure: build the sentence from numbers (unit-testable). */
export function findingSentence(args: { left: bigint; coinType: string; windowMs: number | null; basis: "received-and-spent" | "diff" }): string {
  const sym = symbolOf(args.coinType);
  const amt = formatAmount(args.left, args.coinType);
  if (args.left <= 0n) return `The ${sym} from this exit is still in the wallet.`;
  const when = args.windowMs == null ? "" : ` ${describeWindow(args.windowMs)}`;
  return args.basis === "received-and-spent"
    ? `${amt} ${sym} left this wallet${when}`
    : `${amt} ${sym} left the wallet (before/after balance difference)`;
}

/**
 * What happened to the money after an exit. Heuristic: amount received in the exit tx minus what the wallet
 * holds of that coin now (assumes the wallet held little of it before). Falls back to a plain diff wording.
 */
export async function exitFinding(address: string, exitTx: string): Promise<string> {
  if (!tatumConfigured()) {
    if (mockAllowed()) return "[mock finding] 190 USDC left this wallet within an hour";
    return "Exit recorded. On-chain details are unavailable right now.";
  }
  try {
    const tx = await getTransaction(exitTx);
    const changes = (tx?.balanceChanges ?? []).filter((c) => c.address === address && BigInt(c.amount) > 0n);
    if (!changes.length) return "Exit recorded. No funds arrived in this wallet from that transaction.";
    const top = changes.sort((a, b) => (BigInt(b.amount) > BigInt(a.amount) ? 1 : -1))[0];
    const received = BigInt(top.amount);
    const now = (await listBalances(address)).find((b) => b.coinType === top.coinType);
    const holding = now ? BigInt(now.balance) : 0n;
    const left = received > holding ? received - holding : 0n;
    const windowMs = tx?.timestampMs ? Date.now() - tx.timestampMs : null;
    return findingSentence({ left, coinType: top.coinType, windowMs, basis: windowMs == null ? "diff" : "received-and-spent" });
  } catch {
    return "Exit recorded. On-chain details are unavailable right now.";
  }
}

/** Best effort: did the owner send >= weeklyAmount (whole units) of `coinType` out in this digest? */
export async function checkHabitDigest(owner: string, digest: string, coinType: string, weeklyAmount: number): Promise<"kept" | "missed" | "unknown"> {
  if (!tatumConfigured()) return mockAllowed() ? "kept" : "unknown";
  try {
    const tx = await getTransaction(digest);
    if (!tx || tx.status?.success === false) return "missed";
    const out = (tx.balanceChanges ?? []).filter((c) => c.address === owner && c.coinType === coinType && BigInt(c.amount) < 0n);
    const sent = out.reduce((s, c) => s - BigInt(c.amount), 0n);
    const need = BigInt(Math.round(weeklyAmount * 10 ** decimalsOf(coinType)));
    return sent >= need ? "kept" : "missed";
  } catch { return "unknown"; }
}
