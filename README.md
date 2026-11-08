# Past You

A savings app that holds you accountable using your own words. Money sits in a Sui vault with a waiting period. When you try to break the promise, the app replays what you wrote when you made it, and which reasons have stopped you before.

> **UNAUDITED.** The Move contract has not been audited or compiled in CI. Deposits are capped. Demo data uses an invented persona.

## Architecture
- **Money path:** browser wallet signs every `past_you::vault` transaction (`contracts/`). No admin key; wait capped at 7 days.
- **Memory path:** server holds only an encrypted *delegate* key for the user's Walrus Memory account (`src/lib/server/memory.ts`). The owner key stays in the wallet; revoking cuts the app off.
- **Learning:** plain code scores reasons `(h + 0.5g + 1)/(s + 2) + 0.25c` (`scoring.ts`). Nebius only labels the urge and reorders IDs; any failure falls back to code. The LLM never writes user-visible text.
- **Tatum:** Sui gRPC for vault state and "where did the money go" findings that feed outcome memories.

## Run
```bash
cp .env.example .env.local   # fill in keys; MEMORY_MODE=fake works offline
npm install
npm run dev                  # open /demo for the no-wallet walkthrough
npm test && npm run typecheck
cd contracts && sui move test   # requires the Sui CLI
```

## Status / unverified
- Move tests were written but **not run** (no Sui CLI in the build sandbox).
- Walrus relayer, Nebius, Tatum gRPC (grpc-web vs native) and wallet flows are untested against live services; the backend flow is tested on a fake memory store (26 tests).
- Open: Mainnet package/coin IDs, Tatum `ListTransactions`/`ListEvents` support, similarity threshold.
