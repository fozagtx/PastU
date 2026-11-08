/// PastU vault: a self-imposed lock on funds with a cooling-off early exit.
/// UNAUDITED. No admin key or capability exists; only the vault owner can act.
module past_you::vault;

use sui::balance::{Self, Balance};
use sui::clock::Clock;
use sui::coin::{Self, Coin};
use sui::event;

// === Errors ===
const EUnlockInPast: u64 = 0;
const EWaitTooLong: u64 = 1;
const EExitPending: u64 = 2;
const ENoExitPending: u64 = 3;
const EExitNotReady: u64 = 4;
const EStillLocked: u64 = 5;

// === Constants ===
/// Maximum cooling-off wait: 7 days in milliseconds.
const MAX_WAIT_MS: u64 = 604_800_000;

// === Objects ===
/// Owned by the user. `key` only (no `store`): cannot be wrapped or
/// transferred via public_transfer.
public struct Vault<phantom T> has key {
    id: UID,
    balance: Balance<T>,
    unlock_ms: u64,
    wait_ms: u64,
    exit_requested_ms: Option<u64>,
    exit_reason_blob: vector<u8>,
}

// === Events ===
public struct PromiseCreated has copy, drop {
    vault_id: ID,
    owner: address,
    amount: u64,
    unlock_ms: u64,
    wait_ms: u64,
    created_ms: u64,
}

public struct Deposited has copy, drop {
    vault_id: ID,
    owner: address,
    amount: u64,
    new_balance: u64,
}

public struct ExitRequested has copy, drop {
    vault_id: ID,
    owner: address,
    requested_ms: u64,
    ready_ms: u64,
    reason_blob: vector<u8>,
}

public struct ExitCancelled has copy, drop {
    vault_id: ID,
    owner: address,
    reason_blob: vector<u8>,
}

public struct ExitCompleted has copy, drop {
    vault_id: ID,
    owner: address,
    amount: u64,
    completed_ms: u64,
    reason_blob: vector<u8>,
}

public struct Withdrawn has copy, drop {
    vault_id: ID,
    owner: address,
    amount: u64,
    withdrawn_ms: u64,
}

// === Public functions ===

/// Create a vault holding `coin` and transfer it to the sender.
public fun create<T>(
    coin: Coin<T>,
    unlock_ms: u64,
    wait_ms: u64,
    clock: &Clock,
    ctx: &mut TxContext,
) {
    let now = clock.timestamp_ms();
    assert!(unlock_ms > now, EUnlockInPast);
    assert!(wait_ms <= MAX_WAIT_MS, EWaitTooLong);

    let owner = ctx.sender();
    let balance = coin.into_balance();
    let amount = balance.value();
    let vault = Vault<T> {
        id: object::new(ctx),
        balance,
        unlock_ms,
        wait_ms,
        exit_requested_ms: option::none(),
        exit_reason_blob: vector[],
    };
    event::emit(PromiseCreated {
        vault_id: object::id(&vault),
        owner,
        amount,
        unlock_ms,
        wait_ms,
        created_ms: now,
    });
    transfer::transfer(vault, owner);
}

/// Add funds. Not allowed while an early exit is pending.
public fun deposit<T>(vault: &mut Vault<T>, coin: Coin<T>, ctx: &TxContext) {
    assert!(vault.exit_requested_ms.is_none(), EExitPending);
    let amount = coin.value();
    vault.balance.join(coin.into_balance());
    event::emit(Deposited {
        vault_id: object::id(vault),
        owner: ctx.sender(),
        amount,
        new_balance: vault.balance.value(),
    });
}

/// Start the cooling-off timer for an early exit.
public fun request_early_exit<T>(
    vault: &mut Vault<T>,
    reason_blob: vector<u8>,
    clock: &Clock,
    ctx: &TxContext,
) {
    assert!(vault.exit_requested_ms.is_none(), EExitPending);
    let now = clock.timestamp_ms();
    vault.exit_requested_ms = option::some(now);
    vault.exit_reason_blob = reason_blob;
    event::emit(ExitRequested {
        vault_id: object::id(vault),
        owner: ctx.sender(),
        requested_ms: now,
        ready_ms: now + vault.wait_ms,
        reason_blob,
    });
}

/// Abandon a pending early exit; clears timer and reason.
public fun cancel_exit<T>(vault: &mut Vault<T>, ctx: &TxContext) {
    assert!(vault.exit_requested_ms.is_some(), ENoExitPending);
    vault.exit_requested_ms = option::none();
    let reason_blob = std::mem::take(&mut vault.exit_reason_blob);
    event::emit(ExitCancelled {
        vault_id: object::id(vault),
        owner: ctx.sender(),
        reason_blob,
    });
}

/// After the wait has elapsed, pay everything to the sender and delete the vault.
public fun complete_exit<T>(vault: Vault<T>, clock: &Clock, ctx: &mut TxContext) {
    let now = clock.timestamp_ms();
    assert!(vault.exit_requested_ms.is_some(), ENoExitPending);
    let requested = *vault.exit_requested_ms.borrow();
    assert!(now >= requested + vault.wait_ms, EExitNotReady);

    let Vault { id, balance, unlock_ms: _, wait_ms: _, exit_requested_ms: _, exit_reason_blob } =
        vault;
    let amount = balance.value();
    event::emit(ExitCompleted {
        vault_id: id.to_inner(),
        owner: ctx.sender(),
        amount,
        completed_ms: now,
        reason_blob: exit_reason_blob,
    });
    id.delete();
    transfer::public_transfer(coin::from_balance(balance, ctx), ctx.sender());
}

/// After unlock time (even with an exit pending), pay out and delete the vault.
public fun withdraw<T>(vault: Vault<T>, clock: &Clock, ctx: &mut TxContext) {
    let now = clock.timestamp_ms();
    assert!(now >= vault.unlock_ms, EStillLocked);

    let Vault { id, balance, unlock_ms: _, wait_ms: _, exit_requested_ms: _, exit_reason_blob: _ } =
        vault;
    let amount = balance.value();
    event::emit(Withdrawn {
        vault_id: id.to_inner(),
        owner: ctx.sender(),
        amount,
        withdrawn_ms: now,
    });
    id.delete();
    transfer::public_transfer(coin::from_balance(balance, ctx), ctx.sender());
}

// === Read accessors ===
public fun balance_value<T>(vault: &Vault<T>): u64 { vault.balance.value() }
public fun unlock_ms<T>(vault: &Vault<T>): u64 { vault.unlock_ms }
public fun wait_ms<T>(vault: &Vault<T>): u64 { vault.wait_ms }
public fun exit_requested_ms<T>(vault: &Vault<T>): Option<u64> { vault.exit_requested_ms }
public fun exit_reason_blob<T>(vault: &Vault<T>): vector<u8> { vault.exit_reason_blob }
public fun max_wait_ms(): u64 { MAX_WAIT_MS }
