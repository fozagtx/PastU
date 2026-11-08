# past_you (Sui Move)

Package `past_you`, module `past_you::vault`: a self-imposed lock on funds with a
cooling-off early exit. The contract has no admin function. Publishing created an
upgrade capability, held by the publisher; see the deployment record below.

**UNAUDITED. Do not use with funds you cannot afford to lose. Get an independent
audit before any mainnet use.**

## Build, test, publish

```sh
cd contracts
sui move build
sui move test
sui client publish --gas-budget 100000000
```

Record the `packageId` from the publish output; the frontend calls
`<packageId>::vault::<function>`. Switch networks first with
`sui client switch --env testnet` (or devnet). The shared clock object is `0x6`.

## Behaviour

- `Vault<T>` has `key` only (no `store`), is owned by the creator, and cannot be wrapped or `public_transfer`red.
- `create`: `unlock_ms` must be in the future; `wait_ms <= 604_800_000` (7 days).
- `deposit`: blocked while an exit is pending.
- `request_early_exit` starts a timer and stores a reason blob; `cancel_exit` clears both.
- `complete_exit`: allowed when `clock >= requested + wait_ms`; pays the full balance and deletes the vault.
- `withdraw`: allowed when `clock >= unlock_ms`, even with an exit pending.

## Function signatures (all `public fun`, callable from a PTB; `0x6` is the Clock)

```
create<T>(coin: Coin<T>, unlock_ms: u64, wait_ms: u64, clock: &Clock, ctx)
deposit<T>(vault: &mut Vault<T>, coin: Coin<T>, ctx)
request_early_exit<T>(vault: &mut Vault<T>, reason_blob: vector<u8>, clock: &Clock, ctx)
cancel_exit<T>(vault: &mut Vault<T>, ctx)
complete_exit<T>(vault: Vault<T>, clock: &Clock, ctx)
withdraw<T>(vault: Vault<T>, clock: &Clock, ctx)
```

Events: `PromiseCreated`, `Deposited`, `ExitRequested`, `ExitCancelled`,
`ExitCompleted`, `Withdrawn`.

## Deployment record (testnet)

- Package ID: `0x40ca229b92486eb521391f2290ff44d992a85e8f60dd1a4dafbbcf52048965a3`
- Publish digest: `7hAvrmXDn4rE7qXCkoJX56kAXndkFk8F3Dju72zqNyKt`
- Upgrade capability: `0x1d4429e790222e00884ef8214a0c065acf6463ce6d4587211cd0413a50f93d64`
- Chain id `4c78adac`, Sui CLI 1.73.0. `Published.toml` records this and should stay in version control.
- `Move.toml` has no explicit framework dependency. The CLI adds the matching framework itself; pinning `framework/mainnet` made every test fail with a verifier error on CLI 1.73.0.
