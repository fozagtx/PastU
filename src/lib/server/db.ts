import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

// Only ids, addresses, counters and encrypted keys live here. NEVER user-written text.
const SCHEMA = `
CREATE TABLE IF NOT EXISTS users(
  address TEXT PRIMARY KEY, memwal_account_id TEXT, delegate_key_encrypted TEXT);
CREATE TABLE IF NOT EXISTS promises(
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, current_vault_id TEXT, namespace TEXT NOT NULL,
  coin_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at INTEGER NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(
  id TEXT PRIMARY KEY, promise_id TEXT NOT NULL, number INTEGER NOT NULL, exit_tx TEXT,
  follow_up_at INTEGER, state TEXT NOT NULL DEFAULT 'open', created_at INTEGER NOT NULL,
  UNIQUE(promise_id, number));
CREATE TABLE IF NOT EXISTS habits(
  id TEXT PRIMARY KEY, promise_id TEXT NOT NULL UNIQUE, weekly_amount REAL NOT NULL, weekday INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_promises_owner ON promises(owner);
`;

const g = globalThis as unknown as { __pastyouDb?: Database.Database; __pastyouDbPath?: string };

export function getDb(): Database.Database {
  const p = env.dbPath;
  if (g.__pastyouDb && g.__pastyouDbPath === p) return g.__pastyouDb;
  g.__pastyouDb?.close();
  if (p !== ":memory:") fs.mkdirSync(path.dirname(path.resolve(p)), { recursive: true });
  const db = new Database(p);
  db.pragma("journal_mode = WAL");
  db.exec(SCHEMA);
  g.__pastyouDb = db;
  g.__pastyouDbPath = p;
  return db;
}

export function resetDbForTests() {
  g.__pastyouDb?.close();
  g.__pastyouDb = undefined;
}

export interface PromiseRow { id: string; owner: string; current_vault_id: string | null; namespace: string; coin_type: string; status: "active" | "exiting" | "closed"; created_at: number }
export interface AttemptRow { id: string; promise_id: string; number: number; exit_tx: string | null; follow_up_at: number | null; state: "open" | "held" | "exited"; created_at: number }
export interface UserRow { address: string; memwal_account_id: string | null; delegate_key_encrypted: string | null }
