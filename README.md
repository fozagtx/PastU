<h1 align="center">Past You</h1>

**What if the one who talks you out of breaking a savings promise is you, the day you made it?**

<p align="center">
  <a href="https://sui.io"><img src="https://img.shields.io/badge/Built_on-Sui-4DA2FF?style=for-the-badge&logo=sui&logoColor=white" alt="Built on Sui"></a>
  <a href="https://www.walrus.xyz"><img src="https://img.shields.io/badge/Memory_on-Walrus-97F0E5?style=for-the-badge&logoColor=black" alt="Memory on Walrus"></a>
  <a href="https://tatum.io"><img src="https://img.shields.io/badge/Data_via-Tatum-6C47FF?style=for-the-badge" alt="Data via Tatum"></a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Sui-Move-4DA2FF?logo=sui&logoColor=white" alt="Sui Move">
  <img src="https://img.shields.io/badge/Walrus-Memory-97F0E5?logoColor=black" alt="Walrus Memory">
  <img src="https://img.shields.io/badge/Tatum-gRPC-6C47FF" alt="Tatum">
  <img src="https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs&logoColor=white" alt="Next.js">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white" alt="TypeScript">
  <img src="https://img.shields.io/badge/SQLite-003B57?logo=sqlite&logoColor=white" alt="SQLite">
  <img src="https://img.shields.io/badge/vitest-6E9F18?logo=vitest&logoColor=white" alt="vitest">
</p>

<p align="center">
  <b>Total Recall hackathon · Consumer Finance Apps · Best Walrus Memory</b> · Testnet first · Contract unaudited
</p>

| |
| --- |
| [The problem](#the-problem) · [Deployed contract](#deployed-contract) · [What it does](#what-past-you-does) · [How it works](#how-it-works) · [Architecture](#architecture) · [Tech stack](#tech-stack) · [Quickstart](#quickstart) · [Get your keys and IDs](#get-your-keys-and-ids) · [Testnet runbook](#testnet-runbook) · [Commands](#commands) · [Demo mode](#demo-mode) · [Learning logic](#learning-logic) · [Repository layout](#repository-layout) · [Checks](#checks) · [Safety and trust](#safety-and-trust) · [Troubleshooting](#troubleshooting) · [Scope notes](#honest-scope-notes) |

## The problem

People break savings promises in the moment, when the reason they made them is out of mind. A time lock delays the action but says nothing about why it mattered. A reminder is easy to dismiss.

| Existing approach | What it does | What it misses |
| --- | --- | --- |
| Time-locked vault | Delays the withdrawal | Never reminds you why |
| Commitment or habit app | Tracks streaks, may charge a penalty | Relies on self-report, and doesn't learn what persuades you |
| **Past You** | Waits, shows your own words, learns what worked | Only protects money placed in the vault |

## Deployed contract

The vault contract is live on **Sui testnet**. Anyone can inspect it.

| | |
| --- | --- |
| Network | Sui testnet (chain id `4c78adac`) |
| Package ID | [`0x40ca229b92486eb521391f2290ff44d992a85e8f60dd1a4dafbbcf52048965a3`](https://suiscan.xyz/testnet/object/0x40ca229b92486eb521391f2290ff44d992a85e8f60dd1a4dafbbcf52048965a3) |
| Module | `past_you::vault` |
| Publish transaction | [`7hAvrmXDn4rE7qXCkoJX56kAXndkFk8F3Dju72zqNyKt`](https://suiscan.xyz/testnet/tx/7hAvrmXDn4rE7qXCkoJX56kAXndkFk8F3Dju72zqNyKt) |
| Publisher | `0xe63a423e9f452defdea24299bdfb09de64c4d3c5c9414cf265f991808ce7858f` |
| Upgrade capability | `0x1d4429e790222e00884ef8214a0c065acf6463ce6d4587211cd0413a50f93d64` (held by the publisher) |
| Walrus Memory account | `0x2d18637972623a08617e34ec68867db460a06f27e5d5e8c02b2cb99a000a6070` (testnet) |
| Walrus Memory agent ID | `21449ed62deff336332aa93e3a7e56d73416a49f3b02c25cca5764242b2bea75` (public key) |
| Toolchain | Sui CLI 1.73.0, Move edition 2024 |
| Tests | 14 Move tests pass (`cd contracts && sui move test`) |
| Status | **Unaudited.** Do not use funds you cannot afford to lose. |

**What a vault is.** `Vault<T>` is an object owned by whoever created it. It holds a balance, an unlock time and a wait length. It has the `key` ability only, so it cannot be wrapped or handed to another address with `public_transfer`. Only the owner can touch it.

**The rules, in order**

1. `create` locks a coin until `unlock_ms`. The unlock time must be in the future, and the wait can be at most 7 days (`604_800_000` ms).
2. `deposit` adds more, but is blocked while an exit is pending.
3. `request_early_exit` starts the cooling-off timer and stores a pointer to the reason you wrote (a Walrus blob id).
4. `cancel_exit` clears the timer and the reason. You can request again later and the timer starts fresh.
5. `complete_exit` pays out the full balance once `clock >= requested + wait`. The vault is deleted.
6. `withdraw` pays out once `clock >= unlock_ms`, even if an exit is pending.

**Errors** (abort codes): `0` unlock in the past, `1` wait too long, `2` exit already pending, `3` no exit pending, `4` exit not ready, `5` still locked.

**Events** the app reads through Tatum: `PromiseCreated`, `Deposited`, `ExitRequested`, `ExitCancelled`, `ExitCompleted`, `Withdrawn`.

**Honest note on admin power.** The contract has no admin function, no pause and no way to move anyone's funds. The publish did, however, create an **upgrade capability** held by the publisher, which lets the publisher ship a new version of the package. Old vaults keep the old rules only if the package is made immutable. Before real funds are used, either burn the capability (`sui::package::make_immutable`) or hand it to a multisig, and say which in this table.

Everything else about the contract is in [`contracts/README.md`](contracts/README.md).

## What Past You does

You lock money in a Sui vault with a written reason. The app steps in only when you try to break the promise.

- **A waiting period, enforced onchain.** Early exit needs a wait of up to 7 days. The app never holds the money, and the contract has no admin key.
- **Your own words, back at the right moment.** The Past You screen shows what you wrote, with dates, in large type. Counts sit below in small type. No warnings, no red banners, no guilt.
- **A screen that changes between attempts.** Reasons that have stopped you before move to the top. Reasons that preceded a regretted exit are weighted too.
- **Memory you own.** Reasons, urges and outcomes live in your Walrus Memory account. The app is a delegate you can remove.

The demo ends on one line: *Nobody lectured this person. They just heard from themselves.*

## How it works

```mermaid
%%{init: {'themeVariables': {'fontSize': '13px'}, 'flowchart': {'nodeSpacing': 18, 'rankSpacing': 22, 'padding': 6}}}%%
flowchart LR
    A[Urge] --> B[Save to Walrus] --> C[Timer on vault] --> D[Past You screen]
    D --> E{Hold or exit?}
    E -->|hold| F[cancel_exit]
    E -->|exit| G[complete_exit]
    F --> H[Follow-up + Tatum] --> I[Rescore] --> D
    G --> H
```

1. **Promise.** Lock an amount with an unlock date, a wait, and a reason. The reason is stored word for word.
2. **Urge.** Trying to break it asks "What's going on right now?". The answer is saved with `rememberAndWait` and its `blob_id` is written into the vault.
3. **Wait.** The timer runs onchain whatever the screen does. The Past You screen shows your top three reasons.
4. **Decide.** Keep the promise (`cancel_exit`) or exit once the wait is over (`complete_exit`). Completing early fails onchain.
5. **Follow up.** The app asks if it was the right call and checks through Tatum where the money went. The finding is saved as an outcome memory.
6. **Learn.** Results rescore every reason, so the next attempt looks different. An early exit closes the vault, so you can lock the promise again.

After the unlock date, `withdraw` works with no wait and no prompts.

## Architecture

The money path and the memory path are separate, so a compromised server can read memories but can't touch funds.

<details>
<summary><b>Architecture diagram</b> (click to expand)</summary>

```mermaid
%%{init: {'themeVariables': {'fontSize': '13px'}, 'flowchart': {'nodeSpacing': 18, 'rankSpacing': 22, 'padding': 6}}}%%
flowchart LR
    W[Wallet] -->|signs every tx| V[(Vault on Sui)]
    P[Next.js pages] --> API[API routes]
    API --> M[Memory + scoring]
    M -->|delegate key| WM[(Walrus Memory)]
    M --> N[Nebius: label + order IDs]
    API --> T[Tatum gRPC] -->|reads| V
```

</details>

**Vault** (`past_you::vault`). `Vault<T>` has `key` only, so it can't be moved by generic transfer calls.

| Function | Rule | Event |
| --- | --- | --- |
| `create<T>` | Unlock is in the future; wait ≤ 7 days | `PromiseCreated` |
| `deposit<T>` | Blocked while an exit is pending | `Deposited` |
| `request_early_exit<T>` | No exit already pending; stores the urge's `blob_id` | `ExitRequested` |
| `cancel_exit<T>` | An exit is pending; clears the timer | `ExitCancelled` |
| `complete_exit<T>` | Clock ≥ request + wait; pays out and deletes the vault | `ExitCompleted` |
| `withdraw<T>` | Clock ≥ unlock; works even with an exit pending | `Withdrawn` |

The wallet signs every vault transaction. The server holds a delegate key for memory only, encrypted at rest. It never holds a key that can move funds.

## Tech stack

| Layer | What it is |
| --- | --- |
| **Contract** | Sui Move (2024 edition), one module, no admin key |
| **App** | Next.js 15 · React 19 · TypeScript 5 (strict) · plain CSS with light and dark themes |
| **Wallet** | `@mysten/dapp-kit-core` · `@mysten/sui` · sign-in by signed message with a 10-minute window |
| **Memory** | [Walrus Memory](https://docs.wal.app/walrus-memory) via `@mysten-incubation/memwal`, one namespace per promise |
| **Chain data** | [Tatum](https://docs.tatum.io) Sui gRPC, API key sent server-side only |
| **Model** | [Nebius Token Factory](https://tokenfactory.nebius.com), OpenAI-compatible. Labels urges and orders IDs. Never writes user-visible text. |
| **Storage** | SQLite via better-sqlite3. Holds no text the user wrote. |
| **Tooling** | vitest · tsx · Playwright for screenshots |

## Quickstart

Requires Node 20.9+. The Sui CLI is needed only for the contract.

```bash
git clone https://github.com/fozagtx/PastU && cd PastU
cp .env.example .env.local        # add your secrets; public URLs live in src/lib/config.ts
npm install
npm run smoke                     # sanity check
npm run dev                       # http://localhost:3000, try /story first
```

`/story` runs the three-attempt story with a made-up persona and needs no wallet or backend.

## Get your keys and IDs

Every value goes in `.env.local` (local) or the Vercel project settings (deploy). Never commit them. Only `NEXT_PUBLIC_*` values reach the browser.

| Value | Where to get it |
| --- | --- |
| `SESSION_SECRET`, `DELEGATE_KEY_SECRET` | Generate two separate secrets: `openssl rand -hex 32` |
| `TATUM_API_KEY` | Sign up at [dashboard.tatum.io](https://dashboard.tatum.io), create an API key, and copy it. Your **account ID** for the hackathon form is shown in the same dashboard. Use a key that covers the network you run on. |
| `NEBIUS_API_KEY` | Sign up at [tokenfactory.nebius.com](https://tokenfactory.nebius.com), open the API keys page and create a key. Pick a model from its model list and set `NEBIUS_MODEL` to the exact ID. In account settings, turn on Zero Data Retention, since prompts are stored by default. [API docs](https://docs.tokenfactory.nebius.com/api-reference/introduction.md). |
| `NEXT_PUBLIC_VAULT_PACKAGE_ID` | Printed when you publish the contract: look for `PackageID` under *Published Objects* after `sui client publish`. Testnet and Mainnet have different IDs. |
| `NEXT_PUBLIC_COIN_TYPE` | Testnet: `0x2::sui::SUI`. Mainnet: the USDC coin type. Confirm it in a Sui explorer (Suiscan) before using real funds; it is still an open item. |
| Walrus relayer URL | Not an env var. `src/lib/config.ts` picks it from the network: testnet `https://relayer.dev.memwal.ai`, mainnet `https://relayer.memory.walrus.xyz`. See the [Walrus Memory docs](https://docs.wal.app/walrus-memory/sdk/quick-start). |
| `MEMWAL_AGENT_ID` (hackathon form) | The **delegate public key** of the app's Walrus Memory agent: `21449ed62deff336332aa93e3a7e56d73416a49f3b02c25cca5764242b2bea75`. Users never see or handle it; the app uses one shared agent, set by `MEMWAL_PRIVATE_KEY` and `MEMWAL_ACCOUNT_ID` on the server. |
| Walrus Memory `packageId` / `registryId` | Listed in the Walrus Memory docs for the network you use. Still an open item; check the [SDK quick start](https://docs.wal.app/walrus-memory/sdk/quick-start) and [headless setup](https://docs.wal.app/walrus-memory/sdk/headless-setup). |

## Testnet runbook

The vault runs on testnet with free coins, and Walrus Memory has a hosted testnet relayer (`https://relayer.dev.memwal.ai`, dashboard `dev.memwal.ai`), so the whole app can run on testnet. The app picks the relayer from `NEXT_PUBLIC_SUI_NETWORK`. For offline work only, set `MEMORY_MODE=fake`.

**1. Install the Sui CLI.** Follow the [Sui install guide](https://docs.sui.io/guides/developer/getting-started/sui-install) (Homebrew: `brew install sui`, or use `suiup`). Check with `sui --version`.

**2. Point it at testnet and get free coins.**

```bash
sui client new-env --alias testnet --rpc https://fullnode.testnet.sui.io:443   # skip if it exists
sui client switch --env testnet
sui client active-address            # your address
sui client faucet                    # free test SUI; or use https://faucet.sui.io
sui client gas                       # confirm you have a balance
```

**3. Test and publish the contract.**

```bash
cd contracts
sui move test                        # all 14 tests should pass
sui client publish --gas-budget 200000000
```

Copy the `PackageID` from the output. The contract compiles and the tests pass. This repo is already published; see [Deployed contract](#deployed-contract).

**4. Configure the app.** In `.env.local`:

```bash
NEXT_PUBLIC_SUI_NETWORK=testnet
NEXT_PUBLIC_VAULT_PACKAGE_ID=<PackageID>
NEXT_PUBLIC_COIN_TYPE=0x2::sui::SUI
NEXT_PUBLIC_DEPOSIT_CAP=100
TATUM_API_KEY=<optional>
```

**5. Try it.** Run `npm run smoke`, then `npm run dev`. Set your wallet (Slush or any Sui wallet) to **Testnet**, claim faucet SUI in it, and walk through `/promise/new` with the 60-second wait. Request an exit, watch the countdown, then cancel or complete it.

**6. Before submitting.** Switch `NEXT_PUBLIC_SUI_NETWORK=mainnet`, publish to Mainnet, set the real coin type and `MEMWAL_RELAYER_URL`, and keep deposits capped. The hackathon needs at least 10 Walrus Memory writes on Mainnet.

## Commands

| Command | What it does |
| --- | --- |
| `npm run dev` | Start the app on port 3000 |
| `npm run build` · `npm start` | Production build and server |
| `npm test` | vitest: scoring, tags, crypto, LLM fallback, full 3-attempt flow |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run smoke` | Memory write and exact recall; checks Tatum if a key is set |
| `cd contracts && sui move test` | The 13 Move tests |

**Environment variables** (see `.env.example`)

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUI_NETWORK` | `testnet` (default) or `mainnet`. Drives wallet, Sui client and Tatum URL. |
| `NEXT_PUBLIC_VAULT_PACKAGE_ID` · `NEXT_PUBLIC_COIN_TYPE` · `NEXT_PUBLIC_DEPOSIT_CAP` | Contract and deposit cap |
| `SESSION_SECRET` · `DELEGATE_KEY_SECRET` | Required in production unless `MEMORY_MODE=fake` |
| `MEMORY_MODE` · `MEMWAL_RELAYER_URL` | `fake` or `real`; the Walrus relayer |
| `TATUM_API_KEY` | Vault state and post-exit findings |
| `NEBIUS_API_KEY` · `NEBIUS_MODEL` | Optional. Without them the code's order is used. |
| `DB_PATH` · `FOLLOW_UP_MS` | SQLite file; follow-up delay (default 24h) |

## Demo mode

`/story` (the old `/demo` redirects here) shows the same promise across three attempts with an invented persona, Maya, clearly labelled. The quote order changes visibly between attempts, and a table beside it shows how each reason's rank moves. A 60-second timer drives a disabled Withdraw button.

With `MEMORY_MODE=fake`, the whole app runs on an in-memory store, so the real flow works without keys. Walrus records real write times, so the demo presents learning by attempt number rather than pretending weeks have passed.

## Learning logic

Plain code scores each reason. The model only labels the urge and suggests an order.

```
score = (h + 0.5g + 1) / (s + 2) + 0.25c
```

| Term | Meaning |
| --- | --- |
| `s` | Attempts where this reason was shown |
| `h` | Of those, attempts where the user held |
| `g` | Of those, attempts where the user exited and later regretted it |
| `c` | 1 if this reason held during a similar past urge, otherwise 0 |

A new reason starts at 0.5, so it gets tried. The weights are starting values to adjust once real attempts exist.

**On each attempt:** the model labels the urge (loss, payday, stress, boredom, social, emergency, other), code scores every reason and keeps the top three, the model may reorder those three by ID, and the server fills fixed sentence templates with the counts. If the model fails, returns bad JSON or an unknown ID, the screen falls back to code's order.

**Memory tags** are plain text at the start of each memory, parsed by server code:

| Type | Format |
| --- | --- |
| Reason | `[reason id=r1] This is my rent deposit...` |
| Urge | `[urge attempt=2 trigger=loss] Down 200 on a bet...` |
| Shown | `[shown attempt=2 reasons=r1,r3]` |
| Decision | `[decision attempt=2 result=held]` |
| Outcome | `[outcome attempt=1 felt=regret] 190 USDC went to an exchange within an hour` |
| Habit | `[habit week=3 result=missed] Payday weekend, forgot` |

## Repository layout

```
PastU/
├── contracts/
│   ├── sources/vault.move         # past_you::vault
│   ├── tests/vault_tests.move     # 14 tests: boundaries, caps, payout
│   └── README.md                  # build, test, publish
├── src/
│   ├── app/
│   │   ├── page.tsx · demo/       # landing and the no-wallet walkthrough
│   │   ├── promise/               # new · [id] · break · past-you · follow-up · memory
│   │   └── api/                   # auth · account · promises · attempts routes
│   ├── components/                # Past You screen, countdown, blob links, wallet gate
│   └── lib/
│       ├── types.ts               # shared API contract
│       ├── client/                # wallet, vault PTBs, typed fetch client
│       └── server/
│           ├── memory.ts          # Walrus Memory behind one interface, plus a fake
│           ├── scoring.ts         # the formula and top-three selection
│           ├── llm.ts             # Nebius labelling and reordering, with fallback
│           ├── tatum.ts           # vault state and post-exit findings
│           ├── tags.ts            # memory tag format and parsing
│           ├── crypto.ts          # AES-256-GCM for delegate keys
│           ├── session.ts · db.ts # signed cookie, SQLite
│           └── service.ts         # Past You assembly
├── tests/                         # unit and full-flow tests
├── scripts/smoke.ts               # npm run smoke
└── .env.example
```

## Checks

```bash
npm test                  # 26 tests
npm run typecheck
npm run build
cd contracts && sui move test
```

The tests cover:

- the score formula, ties and the `c` bonus
- that different results give a different order on the next attempt
- exact stored text in quotes, with count templates
- the ownership guards (401 and 404) and body validation
- AES-GCM round trip and tamper detection
- Nebius fallback on bad JSON, unknown IDs, no key and HTTP errors
- the emergency case showing only the timer
- that SQLite holds no user-written text

The Move tests cover `complete_exit` at the exact millisecond and one before, double requests, cancel and re-request, `withdraw` with an exit pending, the wait cap, past unlock dates, deposits during an exit, and payout equal to deposits.

## Safety and trust

The app can slow someone down, but it must never trap them, shame them or misrepresent what they said.

- **Money stays reachable.** No admin function in the contract, and the wait can't exceed 7 days. The publisher still holds an upgrade capability; see [Deployed contract](#deployed-contract).
- **Emergencies get no argument.** If the urge is labelled emergency, or mentions health or safety, the screen shows only the timer. The label can't shorten the onchain wait, and the app says so at promise time.
- **Quotes are exact.** Only stored text appears in quote styling.
- **No shame.** Templates report what happened and never scold.
- **Memory is lasting.** No delete method is documented, so don't write other people's private details.
- **Revoking is honest.** Removal stops future access. It doesn't erase what the app already read or re-encrypt old memories.
- **Keys stay separated.** The owner key stays in the wallet. Delegate keys are encrypted at rest. Tatum and Nebius keys stay on the server.
- **Model calls are disclosed.** The urge and top reasons go to Nebius for labelling and ordering. Turn on Zero Data Retention in the Nebius account.
- **The contract is unaudited.** Deposits are capped. Do not use real funds.
- **Demo data is made up.**

## Troubleshooting

**`sui: command not found`**
Install the Sui CLI to build, test and publish the contract. The app itself doesn't need it.

**The app shows a wallet error on a different network.**
Check `NEXT_PUBLIC_SUI_NETWORK` and the wallet's selected network match.

**Vault calls fail with "function not found".**
`NEXT_PUBLIC_VAULT_PACKAGE_ID` is empty or from another network. Republish and update `.env.local`.

**`SESSION_SECRET is required in production`**
Set `SESSION_SECRET` and `DELEGATE_KEY_SECRET`, or run with `MEMORY_MODE=fake` for a demo.

**Sign-in fails with an expired message.**
The signed message must have an `Issued:` time within the last 10 minutes. Sign in again.

**The Past You screen order never changes.**
Order comes from stored decisions and outcomes. Answer the follow-up after each attempt. Without a Nebius key the code's order is used, which is fine.

**Tatum findings say "unavailable".**
Set `TATUM_API_KEY`. If the key is set, the gateway may not accept grpc-web, which `@mysten/sui`'s client uses.

## Honest scope notes

- **Not run yet:** the Move tests (no Sui CLI in the build sandbox), and the wallet, Walrus, Tatum and Nebius paths against live services. The backend flow is tested on a fake memory store.
- **Re-lock** creates a new promise rather than attaching a new vault to the old one, so history does not carry over yet.
- **Revoke** removes the app's access to every memory, not one at a time.
- **JSON-RPC:** the browser reads chain state over JSON-RPC, which Sui has disabled on some Mainnet nodes. Move it to gRPC before the Mainnet switch.
- **Open:** Mainnet package and coin IDs, Tatum support for `ListTransactions`, `ListEvents` and `ListOwnedObjects`, and the similarity threshold for a "similar urge".
- **Not in this version:** streaks, badges, price-based promises, trusted contacts, partial exits, native apps, agent payments.
- **Habit tracking** (one weekly deposit, confirmed through Tatum) is a Should item and only partly built.
- Claims stay modest: no promise of better finances, and no treatment claims.
