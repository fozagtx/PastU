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

## Testnet runbook
Vault on testnet with free coins; Walrus Memory's hosted relayer is Mainnet-only, so keep `MEMORY_MODE=fake` until you want real writes.
1. `cd contracts && sui client switch --env testnet && sui client faucet && sui client publish`. Copy the package ID.
2. `.env.local`: `NEXT_PUBLIC_SUI_NETWORK=testnet`, `NEXT_PUBLIC_VAULT_PACKAGE_ID=<id>`, `NEXT_PUBLIC_COIN_TYPE=0x2::sui::SUI`, `MEMORY_MODE=fake`, plus `TATUM_API_KEY` if you have one.
3. `npm run smoke` (sanity check), then `npm run dev`; set the wallet to testnet, claim faucet SUI, and walk through `/promise/new` with a 60s wait.
4. Before submitting, switch to `mainnet`, set the real coin type and relayer URL, and keep deposits capped.

Caveat: the browser reads chain state over JSON-RPC (`getJsonRpcFullnodeUrl`). Sui has disabled JSON-RPC on some Mainnet nodes, so that path may need moving to gRPC before the Mainnet switch.

## Status / unverified
- Move tests were written but **not run** (no Sui CLI in the build sandbox).
- Walrus relayer, Nebius, Tatum gRPC (grpc-web vs native) and wallet flows are untested against live services; the backend flow is tested on a fake memory store (26 tests).
- Open: Mainnet package/coin IDs, Tatum `ListTransactions`/`ListEvents` support, similarity threshold.
