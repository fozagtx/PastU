# Past You: handoff

Status as of the last push on `claude/funny-maxwell-h7jhyo`. Full stack Next.js 15 (App Router) app plus a Sui Move contract. Read `README.md` for the product and architecture; this file is what remains.

## What is done
- **Contract** `contracts/` (`past_you::vault`): written, 13 tests written. **Never compiled or run.**
- **Backend** `src/app/api`, `src/lib/server`: all PRD routes, scoring, Nebius fallback, Tatum client, AES-GCM delegate keys, SQLite. 26 vitest tests pass on a fake memory store.
- **Frontend** `src/app`, `src/components`, `src/lib/client`: all screens plus `/demo` (no wallet or backend needed). `tsc` and `next build` pass.
- **Config:** `NEXT_PUBLIC_SUI_NETWORK` (default `testnet`), `npm run smoke`, `vercel.json`.

## Not verified (do these first, in order)
1. **Contract.** Install the Sui CLI, then `cd contracts && sui move test`. Fix any compile errors (it was only reviewed by hand). Then `sui client switch --env testnet && sui client faucet && sui client publish` and note the package ID.
2. **Wire the package.** Set `NEXT_PUBLIC_VAULT_PACKAGE_ID` and `NEXT_PUBLIC_COIN_TYPE` (`0x2::sui::SUI` on testnet).
3. **Wallet flow, end to end on testnet** with the 60s wait: sign in, create vault, request exit, cancel, complete, withdraw. Check `src/lib/client/vault.ts`: the `CALLS` table holds argument lists (the contract added a trailing `ctx` that PTBs ignore), `RETURNS_COIN` is false because the contract pays out inside the function, and `buildCreate` finds the new vault by type suffix `::vault::Vault`. The vault is **owned**, not shared; confirm the frontend handles that.
4. **Real Walrus Memory.** The relayer is Mainnet-only. Run one real write and recall with a delegate key. `MemwalStore` in `src/lib/server/memory.ts` was only type-checked. Unknowns: whether `created_at` is returned (quote dates fall back to epoch), `restore` behaviour, relayer cost in WAL/SUI.
5. **Tatum.** Check the gateway accepts grpc-web (what `@mysten/sui/grpc` uses). If not, switch `src/lib/server/tatum.ts` to `@grpc/grpc-js`. Test `ListTransactions`, `ListEvents`, `ListOwnedObjects`; fall back to balance diffs if missing. Confirm the testnet endpoint `sui-testnet-grpc.gateway.tatum.io`.
6. **Nebius.** Confirm the model name (`NEBIUS_MODEL`) and that `response_format: json_object` works. Turn on Zero Data Retention.
7. **Render the authenticated pages** (promise home, break, past-you, follow-up, memory). Only `/`, `/demo`, `/promise/new` have been screenshotted.

## Known gaps to build
- **Re-lock keeps history.** Add an endpoint to attach a new vault to an existing promise (`current_vault_id` update). Today "Lock a new vault" creates a new promise, so the demo's attempt 2 loses its history. This matters for the demo.
- **Single-attempt GET** (`/api/attempts/[id]`): the follow-up page reads the urge and result from localStorage.
- **Per-memory view of revoke** is all-or-nothing (`DELETE /api/account`). Also needs the wallet-side `removeDelegateKey` transaction in the UI.
- **Browser reads chain over JSON-RPC** (`src/lib/client/wallet.tsx`). Sui disabled JSON-RPC on some Mainnet nodes; move to gRPC before Mainnet.
- **Weekly habit (R13, R14)** is partly built (`/api/promises/[id]/habit`), no UI for the missed-week prompt.
- **UI design.** `seesaw.website` was unreachable from the build session (host not allowlisted). The UI follows the PRD's direction only. Restyle with real inspiration if wanted.
- **Auth** uses a signed message with an `Issued:` window; add a server-side nonce store if replay within 10 minutes matters.

## Deploying to Vercel (important)
`vercel.json` is in the repo. **Serverless functions have no persistent disk**, so two things in this app do not work as-is on Vercel:
- **SQLite** (`DB_PATH`, default `./data/pastyou.db`) is read-only or ephemeral. Setting `DB_PATH=/tmp/pastyou.db` lets it run but data is lost between cold starts. For anything real, move `src/lib/server/db.ts` to Turso/libSQL or Postgres (Neon/Vercel Postgres). Tables: `users`, `promises`, `attempts`, `habits`. No user-written text is stored there.
- **Fake memory store** (`MEMORY_MODE=fake`) lives in process memory and resets. On Vercel use `MEMORY_MODE=real` with the Walrus relayer, or accept that only `/demo` is reliable.
- `better-sqlite3` is a native module (`serverExternalPackages` is set in `next.config.mjs`). If the Vercel build complains, drop it when you move to a hosted DB.

The static `/demo` page and `/` work on Vercel immediately and are enough for a judge-facing link while the rest is finished.

**Vercel env vars** (Project Settings, never commit): `SESSION_SECRET`, `DELEGATE_KEY_SECRET` (both 32+ random bytes), `NEXT_PUBLIC_SUI_NETWORK`, `NEXT_PUBLIC_VAULT_PACKAGE_ID`, `NEXT_PUBLIC_COIN_TYPE`, `NEXT_PUBLIC_DEPOSIT_CAP`, `MEMORY_MODE`, `MEMWAL_RELAYER_URL`, `TATUM_API_KEY`, `NEBIUS_API_KEY`, `NEBIUS_MODEL`, `DB_PATH` (if staying on SQLite). `NEXT_PUBLIC_*` values are exposed to the browser.

## Hackathon submission checklist
- [ ] At least 10 Walrus Memory writes on **Mainnet** (one 3-attempt run does it). Switch network and relayer for this run.
- [ ] Tatum used for vault state and the post-exit finding; Tatum account ID on the form.
- [ ] `MEMWAL_AGENT_ID` on the form = the delegate **public** key of the demo account.
- [ ] Public repo, README, one architecture diagram (in README), working demo link, demo video (3 min, 60s wait, invented persona).
- [ ] Blog post: what it does, how it uses Tatum and Walrus, how it learned. Use the 3-attempt demo as the spine.
- [ ] Contract marked unaudited, deposits capped on Mainnet.
- [ ] Optional: post on X or LinkedIn tagging Tatum and Walrus.

## Commands
```bash
npm install && npm run dev        # app
npm test && npm run typecheck     # checks
npm run smoke                     # sanity (fake memory)
cd contracts && sui move test     # contract (needs Sui CLI)
```
