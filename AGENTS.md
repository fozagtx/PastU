# AGENTS.md

Instructions for coding agents working on Past You. Read `README.md` for the product and `HANDOFF.md` for what is unverified and what to build next, before starting a task.

## Project overview

Past You is a savings app that holds you accountable using your own words. Money sits in a Sui vault with a waiting period. When the user tries to break the promise, the app shows what they wrote when they made it, and which reasons have stopped them before.

It is a Total Recall hackathon project (Consumer Finance Apps, Best Walrus Memory). One full-stack Next.js app serves the pages and API routes, and one Move module holds the money.

## Repo layout

```text
AGENTS.md · README.md · HANDOFF.md · vercel.json · .env.example
contracts/                   Sui Move package `past_you`
  sources/vault.move         The only module. No admin key.
  tests/vault_tests.move     13 tests
scripts/smoke.ts             `npm run smoke`
tests/                       vitest: unit.test.ts, flow.test.ts
src/
  app/
    page.tsx · demo/         Landing and the no-wallet walkthrough
    promise/                 new · [id] · break · past-you · follow-up · memory
    api/                     auth · account · promises · attempts routes
  components/                Screens and shared UI (CSS modules + globals.css)
  lib/
    types.ts                 Shared API contract. Change it additively.
    client/                  Wallet, vault PTBs (vault.ts), typed fetch client (api.ts)
    server/
      memory.ts              Walrus Memory behind the `MemoryStore` interface, plus a fake
      scoring.ts             The score formula and top-three selection
      llm.ts                 Nebius labelling and reordering, always with a code fallback
      tatum.ts               Vault state and post-exit findings over Sui gRPC
      tags.ts                Memory tag format and parsing
      crypto.ts              AES-256-GCM for delegate keys
      session.ts · db.ts     Signed cookie, SQLite
      service.ts             Past You assembly
      env.ts                 All env access, read lazily
```

## Setup commands

```bash
cp .env.example .env.local     # MEMORY_MODE=fake works offline
npm install
npm run dev                    # http://localhost:3000, try /demo
npm test                       # vitest
npm run typecheck              # tsc --noEmit
npm run build                  # production build
npm run smoke                  # memory round trip, Tatum if a key is set
cd contracts && sui move test  # needs the Sui CLI
```

Run `npm test`, `npm run typecheck` and `npm run build` before every commit. All three must pass.

## Tech stack

- **Contract:** Sui Move, 2024 edition
- **App:** Next.js 15 App Router, React 19, TypeScript strict, plain CSS with light and dark themes
- **Wallet:** `@mysten/dapp-kit-core`, `@mysten/sui`
- **Memory:** `@mysten-incubation/memwal` against the hosted Walrus Memory relayer (Mainnet)
- **Chain data:** Tatum Sui gRPC, server-side only
- **Model:** Nebius Token Factory, OpenAI-compatible, model set by `NEBIUS_MODEL`
- **Storage:** SQLite via better-sqlite3 (see the Vercel note in `HANDOFF.md`)
- **Tests:** vitest

## Hard rules (do not break these)

These come from the product's safety and trust rules.

1. **Money path and memory path stay separate.** The wallet signs every vault transaction. The server never holds a key that can move funds. The owner key never reaches the server.
2. **No admin key in the contract**, and `MAX_WAIT_MS` stays at 7 days. Do not add any function that can move funds without the owner.
3. **Quotes are exact.** Quote styling shows only text read back from memory, byte for byte. Never paraphrase, trim, summarise or regenerate a user's words.
4. **The LLM never writes text the user sees.** It may only label an urge from the fixed list and return reordered IDs, validated with zod. Any failure, bad JSON or unknown ID falls back to code's order. The app must work fully with no Nebius key.
5. **Emergency means no argument.** If the urge is labelled emergency or mentions health or safety, show only the timer. Keyword matching must keep forcing this even if the model disagrees.
6. **No shame.** No warnings, red banners, scolding copy, streaks or badges. Templates report what happened and nothing more.
7. **The database holds no user-written text.** Reasons, urges and outcomes live only in Walrus Memory. SQLite stores IDs, state and the encrypted delegate key.
8. **Never use `analyze` on reasons.** It extracts facts instead of keeping exact words. Reasons and urges use `rememberAndWait` (the urge's `blob_id` goes onchain); everything else uses `remember`.
9. **One namespace per promise** (`promise-<id>`), and one delegate key per user. Delegate keys are encrypted at rest and never logged or returned to the client.
10. **Tatum and Nebius keys stay on the server.** Only `NEXT_PUBLIC_*` values reach the browser, so never put a secret in one.
11. **Be honest about limits.** Say the contract is unaudited, deposits are capped, revoking does not erase what the app already read, and model calls send the urge and top reasons to Nebius. Make no claims about better finances or treatment.
12. **Demo data is made up.** Label invented personas clearly.

## Scoring and learning rules

```
score = (h + 0.5g + 1) / (s + 2) + 0.25c
```

- `s` shown, `h` held, `g` exited and later regretted, `c` = 1 if the reason held in a past attempt with the same trigger label.
- A new reason scores 0.5. Keep the top three. Ties are stable by creation order.
- Different results must produce a different order on the next attempt. This is tested in `tests/flow.test.ts`; keep it passing.
- The weights are starting values. Change them only with a note in `HANDOFF.md`.

## Memory tag format

Structure goes in a tag at the start of the memory text, parsed in `src/lib/server/tags.ts`. Change the format only together with its parser and tests.

```text
[reason id=r1] ...      [urge attempt=2 trigger=loss] ...
[shown attempt=2 reasons=r1,r3]      [decision attempt=2 result=held]
[outcome attempt=1 felt=regret] ...  [habit week=3 result=missed] ...
```

## Code style

- TypeScript strict. Validate every request body and model response with zod.
- API routes check the session and that the signed-in address owns the promise or attempt. Return 404 for someone else's resource, not 403.
- Keep Walrus behind `MemoryStore`. Do not import the SDK outside `memory.ts`.
- Keep Move signatures and PTB builders in step: `contracts/sources/vault.move` and the `CALLS` table in `src/lib/client/vault.ts` change together.
- Read env through `src/lib/server/env.ts`, lazily, so tests can change it.
- Add shared request and response types to `src/lib/types.ts` additively. Do not rename or remove existing fields without updating both sides.
- Scope the UI to the screens in the README. The Past You screen is the product: quote in large type first, counts small below.

## Testing

- Backend logic gets vitest tests with `MEMORY_MODE=fake` and no network or keys.
- A new route needs a test for the 401, the 404 ownership guard and the body validation.
- Contract changes need Move tests for both sides of each time boundary (one millisecond before, and at the exact moment).
- Do not claim something works against Walrus, Tatum, Nebius or a wallet unless you ran it. State what was not run.

## Boundaries

- Do not commit secrets, `.env*` (except `.env.example`), `data/`, or `*.db`.
- Do not deploy or publish the contract to Mainnet without the user's say-so.
- Do not skip or disable a failing test to get green.
- Ask before adding a dependency that changes what leaves the browser or the server.
- Leave the design to the principles above until real design inspiration is provided. `seesaw.website` was unreachable from the build session.
