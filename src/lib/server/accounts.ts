import { delegateKeyToSuiAddress } from "@mysten-incubation/memwal";
import { generateDelegateKey } from "@mysten-incubation/memwal/account";
import { getDb, type UserRow } from "./db";
import { decryptSecret, encryptSecret } from "./crypto";
import { fakeStore, isFakeMemory, MemwalStore, type MemoryStore } from "./memory";
import { memoryOverride } from "./memory-override";
import { HttpError } from "./http";
import type { AccountResp } from "../types";

export function upsertUser(address: string) {
  getDb().prepare("INSERT OR IGNORE INTO users(address) VALUES (?)").run(address);
}

function getUser(address: string): UserRow | undefined {
  return getDb().prepare("SELECT * FROM users WHERE address = ?").get(address) as UserRow | undefined;
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
  upsertUser(address);
  let u = getUser(address)!;
  if (!u.delegate_key_encrypted) {
    const k = await generateDelegateKey();
    getDb().prepare("UPDATE users SET delegate_key_encrypted = ? WHERE address = ?").run(encryptSecret(k.privateKey), address);
    u = getUser(address)!;
  }
  if (accountId) getDb().prepare("UPDATE users SET memwal_account_id = ? WHERE address = ?").run(accountId, address);
  u = getUser(address)!;
  const { pub, sui } = await publicInfo(decryptSecret(u.delegate_key_encrypted!));
  return { delegatePublicKey: pub, delegateSuiAddress: sui, accountId: u.memwal_account_id };
}

export function deleteAccountKey(address: string) {
  getDb().prepare("UPDATE users SET delegate_key_encrypted = NULL, memwal_account_id = NULL WHERE address = ?").run(address);
}

export function getMemoryStore(owner: string): MemoryStore {
  const o = memoryOverride();
  if (o) return o;
  if (isFakeMemory()) return fakeStore();
  const u = getUser(owner);
  if (!u?.delegate_key_encrypted || !u.memwal_account_id) {
    throw new HttpError(409, "No Walrus Memory account yet. Call POST /api/account and register the delegate key first.");
  }
  return MemwalStore.fromKey(decryptSecret(u.delegate_key_encrypted), u.memwal_account_id);
}
