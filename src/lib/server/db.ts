import fs from "node:fs";
import path from "node:path";
import { env } from "./env";

// Only ids, addresses, counters and encrypted keys live here. NEVER user-written text.
// Postgres (Neon). App traffic uses the pooled DATABASE_URL through node-postgres.
// Tests use in-memory Postgres (PGlite) so they never touch a real database.

export interface Db {
  all<T = unknown>(sql: string, params?: unknown[]): Promise<T[]>;
  get<T = unknown>(sql: string, params?: unknown[]): Promise<T | undefined>;
  run(sql: string, params?: unknown[]): Promise<void>;
  /** Runs fn in one transaction on one connection. Rolls back if fn throws. */
  tx<T>(fn: (db: Db) => Promise<T>): Promise<T>;
}

/** `?` placeholders -> `$1, $2, ...` so SQL stays readable. */
const toPg = (sql: string) => { let i = 0; return sql.replace(/\?/g, () => `$${++i}`); };
/** Postgres returns BIGINT as a string/bigint; every BIGINT here is a millisecond timestamp that fits a JS number. */
const norm = <T>(row: T): T => {
  for (const k of Object.keys(row as object)) { const v = (row as Record<string, unknown>)[k]; if (typeof v === "bigint") (row as Record<string, unknown>)[k] = Number(v); }
  return row;
};

export const SCHEMA_SQL = () => fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8");

type Queryable = { query(sql: string, params?: unknown[]): Promise<{ rows: unknown[] }> };
function wrap(q: Queryable, tx: Db["tx"]): Db {
  const run = async (sql: string, params: unknown[] = []) => (await q.query(toPg(sql), params)).rows.map((r) => norm(r));
  return {
    all: (sql, params) => run(sql, params) as never,
    get: async (sql, params) => (await run(sql, params))[0] as never,
    run: async (sql, params) => { await run(sql, params); },
    tx,
  };
}

const g = globalThis as unknown as { __pastyouDb?: Promise<Db>; __pastyouClose?: () => Promise<void> };

async function open(): Promise<Db> {
  if (process.env.DB_DRIVER === "pglite") {
    const { PGlite } = await import("@electric-sql/pglite");
    const pg = new PGlite();
    await pg.exec(SCHEMA_SQL());
    g.__pastyouClose = () => pg.close();
    const adapter: Queryable = { query: async (sql, params) => ({ rows: (await pg.query(sql, params as never[])).rows as unknown[] }) };
    const self: Db = wrap(adapter, async (fn) => pg.transaction(async (t) => fn(wrap({ query: async (s, p) => ({ rows: (await t.query(s, p as never[])).rows as unknown[] }) }, () => { throw new Error("nested transaction"); }))));
    return self;
  }
  const { Pool, types } = await import("pg");
  types.setTypeParser(20, (v) => Number(v)); // BIGINT -> number
  const pool = new Pool({ connectionString: env.databaseUrl, max: 5 });
  try { (await import("@vercel/functions")).attachDatabasePool(pool); } catch { /* not on Vercel */ }
  g.__pastyouClose = () => pool.end();
  return wrap(pool, async (fn) => {
    const c = await pool.connect();
    try {
      await c.query("BEGIN");
      const r = await fn(wrap(c, () => { throw new Error("nested transaction"); }));
      await c.query("COMMIT");
      return r;
    } catch (e) { await c.query("ROLLBACK").catch(() => {}); throw e; } finally { c.release(); }
  });
}

export function getDb(): Db {
  const lazy = () => (g.__pastyouDb ??= open());
  return {
    all: async (s, p) => (await lazy()).all(s, p),
    get: async (s, p) => (await lazy()).get(s, p),
    run: async (s, p) => (await lazy()).run(s, p),
    tx: async (fn) => (await lazy()).tx(fn),
  };
}

/** Tests: a fresh empty database (new in-memory instance, or truncate when TEST_DATABASE_URL points at a throwaway Neon branch). */
export async function resetDbForTests() {
  if (process.env.DB_DRIVER === "pglite") {
    await g.__pastyouClose?.(); g.__pastyouDb = undefined; g.__pastyouClose = undefined;
    return;
  }
  const db = await (g.__pastyouDb ??= open());
  await db.run("TRUNCATE users, promises, attempts, habits");
}

export interface PromiseRow { id: string; owner: string; current_vault_id: string | null; namespace: string; coin_type: string; status: "active" | "exiting" | "closed"; created_at: number }
export interface AttemptRow { id: string; promise_id: string; number: number; exit_tx: string | null; follow_up_at: number | null; state: "open" | "held" | "exited"; created_at: number }
export interface UserRow { address: string; memwal_account_id: string | null; delegate_key_encrypted: string | null }
