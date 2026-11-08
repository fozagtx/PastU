-- Past You schema. Only ids, addresses, counters and encrypted keys live here. NEVER user-written text.
-- Idempotent: safe to apply repeatedly. Applied with `npm run migrate` over the direct (unpooled) connection.
CREATE TABLE IF NOT EXISTS users(
  address TEXT PRIMARY KEY, memwal_account_id TEXT, delegate_key_encrypted TEXT);
CREATE TABLE IF NOT EXISTS promises(
  id TEXT PRIMARY KEY, owner TEXT NOT NULL, current_vault_id TEXT, namespace TEXT NOT NULL,
  coin_type TEXT NOT NULL, status TEXT NOT NULL DEFAULT 'active', created_at BIGINT NOT NULL);
CREATE TABLE IF NOT EXISTS attempts(
  id TEXT PRIMARY KEY, promise_id TEXT NOT NULL, number INTEGER NOT NULL, exit_tx TEXT,
  follow_up_at BIGINT, state TEXT NOT NULL DEFAULT 'open', created_at BIGINT NOT NULL,
  UNIQUE(promise_id, number));
CREATE TABLE IF NOT EXISTS habits(
  id TEXT PRIMARY KEY, promise_id TEXT NOT NULL UNIQUE, weekly_amount DOUBLE PRECISION NOT NULL, weekday INTEGER NOT NULL);
CREATE INDEX IF NOT EXISTS idx_promises_owner ON promises(owner);
