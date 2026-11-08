import { Transaction, coinWithBalance } from "@mysten/sui/transactions";
import { CLOCK_ID, COIN_TYPE, VAULT_PACKAGE_ID } from "./config";

/**
 * PTB builders for `past_you::vault`. If the Move signatures change, adjust the `CALLS` table below:
 * each entry maps a function name to a function that produces the argument list. One-line tweaks.
 */
type Ctx = { tx: Transaction; vault?: string; coin?: ReturnType<typeof coinWithBalance>; unlockMs?: bigint; waitMs?: bigint; reasonBlob?: Uint8Array };
const obj = (c: Ctx, id: string) => c.tx.object(id);

export const CALLS = {
  // create<T>(coin, unlock_ms, wait_ms, clock, ctx)
  create: { fn: "create", args: (c: Ctx) => [c.coin!, c.tx.pure.u64(c.unlockMs!), c.tx.pure.u64(c.waitMs!), obj(c, CLOCK_ID)] },
  // deposit<T>(vault, coin, clock, ctx)
  deposit: { fn: "deposit", args: (c: Ctx) => [obj(c, c.vault!), c.coin!] }, // Move: deposit(vault, coin, ctx), no clock
  // request_early_exit<T>(vault, reason_blob: vector<u8>, clock)
  requestEarlyExit: { fn: "request_early_exit", args: (c: Ctx) => [obj(c, c.vault!), c.tx.pure.vector("u8", Array.from(c.reasonBlob!)), obj(c, CLOCK_ID)] },
  // cancel_exit<T>(vault)
  cancelExit: { fn: "cancel_exit", args: (c: Ctx) => [obj(c, c.vault!)] },
  // complete_exit<T>(vault, clock, ctx)
  completeExit: { fn: "complete_exit", args: (c: Ctx) => [obj(c, c.vault!), obj(c, CLOCK_ID)] },
  // withdraw<T>(vault, clock, ctx)
  withdraw: { fn: "withdraw", args: (c: Ctx) => [obj(c, c.vault!), obj(c, CLOCK_ID)] },
} as const;

export const VAULT_MODULE = "vault";
export const VAULT_TYPE_SUFFIX = `::${VAULT_MODULE}::Vault`;
/** Whether withdraw/complete_exit return a Coin<T> that must be transferred to the sender (set false if they transfer internally). */
export const RETURNS_COIN = { completeExit: false, withdraw: false };

function target(name: keyof typeof CALLS) {
  if (!VAULT_PACKAGE_ID) throw new Error("NEXT_PUBLIC_VAULT_PACKAGE_ID is not set.");
  return `${VAULT_PACKAGE_ID}::${VAULT_MODULE}::${CALLS[name].fn}`;
}

function call(name: keyof typeof CALLS, c: Ctx, sender?: string) {
  const res = c.tx.moveCall({ target: target(name), typeArguments: [COIN_TYPE], arguments: CALLS[name].args(c) as never });
  if ((RETURNS_COIN as Record<string, boolean>)[name] && sender) c.tx.transferObjects([res as never], sender);
  return res;
}

export function buildCreate(p: { amount: bigint; unlockMs: number; waitMs: number; sender: string }) {
  const tx = new Transaction();
  tx.setSenderIfNotSet(p.sender);
  const coin = coinWithBalance({ balance: p.amount, type: COIN_TYPE });
  call("create", { tx, coin, unlockMs: BigInt(p.unlockMs), waitMs: BigInt(p.waitMs) }, p.sender);
  return tx;
}
export function buildDeposit(p: { vault: string; amount: bigint; sender: string }) {
  const tx = new Transaction();
  tx.setSenderIfNotSet(p.sender);
  call("deposit", { tx, vault: p.vault, coin: coinWithBalance({ balance: p.amount, type: COIN_TYPE }) }, p.sender);
  return tx;
}
export function buildRequestEarlyExit(p: { vault: string; urgeBlobId: string; sender: string }) {
  const tx = new Transaction();
  tx.setSenderIfNotSet(p.sender);
  call("requestEarlyExit", { tx, vault: p.vault, reasonBlob: new TextEncoder().encode(p.urgeBlobId) });
  return tx;
}
export function buildCancelExit(p: { vault: string; sender: string }) {
  const tx = new Transaction(); tx.setSenderIfNotSet(p.sender);
  call("cancelExit", { tx, vault: p.vault });
  return tx;
}
export function buildCompleteExit(p: { vault: string; sender: string }) {
  const tx = new Transaction(); tx.setSenderIfNotSet(p.sender);
  call("completeExit", { tx, vault: p.vault }, p.sender);
  return tx;
}
export function buildWithdraw(p: { vault: string; sender: string }) {
  const tx = new Transaction(); tx.setSenderIfNotSet(p.sender);
  call("withdraw", { tx, vault: p.vault }, p.sender);
  return tx;
}

// ---- Reading vault state from chain -------------------------------------------------

export interface VaultState {
  id: string;
  balance: bigint;
  unlockMs: number;
  waitMs: number;
  /** ms epoch when the early-exit becomes completable; null if no exit is pending. */
  exitReadyMs: number | null;
  raw: Record<string, unknown>;
}

const num = (v: unknown): number | null => {
  if (v === null || v === undefined) return null;
  if (typeof v === "object") { const o = v as Record<string, unknown>; return num(o.vec && Array.isArray(o.vec) ? o.vec[0] : (o.value ?? o.fields)); }
  const n = Number(v); return Number.isFinite(n) ? n : null;
};
const pick = (f: Record<string, unknown>, names: string[]) => { for (const n of names) if (n in f) return f[n]; return undefined; };

export type CoreReader = { core: { getObject(a: { objectId: string; include: { json: boolean } }): Promise<unknown> } };

/** Tolerant parser: tweak the key names here if the Move struct differs. */
export function parseVaultFields(id: string, f: Record<string, unknown>): VaultState {
  const bal = pick(f, ["balance", "locked", "funds"]);
  const balance = BigInt(num(typeof bal === "object" && bal ? (bal as Record<string, unknown>).value ?? bal : bal) ?? 0);
  const unlockMs = num(pick(f, ["unlock_ms", "unlock_at_ms", "unlock_time_ms"])) ?? 0;
  const waitMs = num(pick(f, ["wait_ms", "exit_wait_ms"])) ?? 0;
  const ready = num(pick(f, ["exit_ready_ms", "exit_available_ms", "exit_at_ms"]));
  const requested = num(pick(f, ["exit_requested_ms", "exit_requested_at_ms", "exit_start_ms", "exit_ts_ms"]));
  const exitReadyMs = ready ?? (requested != null ? requested + waitMs : null);
  return { id, balance, unlockMs, waitMs, exitReadyMs, raw: f };
}

/** Reads the vault through the client's core API (works over gRPC; public JSON-RPC is deprecated). */
export async function fetchVault(client: CoreReader, id: string): Promise<VaultState> {
  const res = (await client.core.getObject({ objectId: id, include: { json: true } })) as { object?: { json?: Record<string, unknown> | null } };
  const fields = res?.object?.json ?? undefined;
  if (!fields) throw new Error("Could not read the vault from chain.");
  return parseVaultFields(id, fields);
}
