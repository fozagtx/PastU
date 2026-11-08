import { delegateKeyToSuiAddress } from "@mysten-incubation/memwal";
import { generateDelegateKey } from "@mysten-incubation/memwal/account";
import { getDb, type UserRow } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
import { fakeStore, isFakeMemory, MemwalStore, type MemoryStore } from "./memory";
import { memoryOverride } from "./memory-override";
import { HttpError } from "./http";
import { env } from "./env";
import type { AccountResp } from "../types";

export async function upsertUser(address: string) {
  await getDb().run("INSERT INTO users(address) VALUES (?) ON CONFLICT (address) DO NOTHING", [address]);
}

function getUser(address: string): Promise<UserRow | undefined> {
  return getDb().get<UserRow>("SELECT * FROM users WHERE address = ?", [address]);
}

async function publicInfo(keyHex: string): Promise<{ pub: string; sui: string }> {
  const { delegateKeyToPublicKey } = await import("@mysten-incubation/memwal");
  const pub = await delegateKeyToPublicKey(keyHex);
  return { pub: Buffer.from(pub).toString("hex"), sui: await delegateKeyToSuiAddress(keyHex) };
}

/**
 * Step 1 (no accountId): create + store an encrypted delegate key, return its public key so the wallet can register it.
 * Step 2 (accountId): record the on-chain MemWal account id. Idempotent; never rotates an existing key.
 */
export async function ensureAccount(address: string, accountId?: string): Promise<AccountResp> {
  await upsertUser(address);
  const shared = sharedAgent();
  if (shared) {
    const { pub, sui } = await publicInfo(shared.key);
    return { delegatePublicKey: pub, delegateSuiAddress: sui, accountId: shared.accountId };
  }
  let u = (await getUser(address))!;
  if (!u.delegate_key_encrypted) {
    const k = await generateDelegateKey();
    await getDb().run("UPDATE users SET delegate_key_encrypted = ? WHERE address = ?", [encryptSecret(k.privateKey), address]);
    u = (await getUser(address))!;
  }
  if (accountId) await getDb().run("UPDATE users SET memwal_account_id = ? WHERE address = ?", [accountId, address]);
  u = (await getUser(address))!;
  const { pub, sui } = await publicInfo(decryptSecret(u.delegate_key_encrypted!));
  return { delegatePublicKey: pub, delegateSuiAddress: sui, accountId: u.memwal_account_id };
}

export async function deleteAccountKey(address: string) {
  await getDb().run("UPDATE users SET delegate_key_encrypted = NULL, memwal_account_id = NULL WHERE address = ?", [address]);
}

/** One shared agent for the whole app, from env. Each promise still has its own namespace. */
function sharedAgent(): { key: string; accountId: string } | null {
  return env.memwalPrivateKey && env.memwalAccountId ? { key: env.memwalPrivateKey, accountId: env.memwalAccountId } : null;
}

export async function getMemoryStore(owner: string): Promise<MemoryStore> {
  const o = memoryOverride();
  if (o) return o;
  if (isFakeMemory()) return fakeStore();
  const shared = sharedAgent();
  if (shared) return MemwalStore.fromKey(shared.key, shared.accountId);
  const u = await getUser(owner);
  if (!u?.delegate_key_encrypted || !u.memwal_account_id) {
    throw new HttpError(409, "No Walrus Memory account yet. Call POST /api/account and register the delegate key first.");
  }
  return MemwalStore.fromKey(decryptSecret(u.delegate_key_encrypted), u.memwal_account_id);
}
