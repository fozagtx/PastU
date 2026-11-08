#[test_only]
module past_you::vault_tests;

use past_you::vault::{Self, Vault};
use sui::clock::{Self, Clock};
use sui::coin::{Self, Coin};
use sui::sui::SUI;
use sui::test_scenario::{Self as ts, Scenario};

const USER: address = @0xA;
const START: u64 = 1_000;
const UNLOCK: u64 = 100_000;
const WAIT: u64 = 5_000;

fun setup(sc: &mut Scenario, clk: &mut Clock) {
    clk.set_for_testing(START);
    let coin = coin::mint_for_testing<SUI>(100, sc.ctx());
    vault::create(coin, UNLOCK, WAIT, clk, sc.ctx());
    sc.next_tx(USER);
}

fun at(sc: &mut Scenario, clk: &mut Clock, ms: u64) {
    clk.set_for_testing(ms);
    sc.next_tx(USER);
}

#[test]
fun complete_exit_exact_boundary_succeeds_and_pays_all() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);

    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.deposit(coin::mint_for_testing<SUI>(50, sc.ctx()), sc.ctx());
    v.deposit(coin::mint_for_testing<SUI>(25, sc.ctx()), sc.ctx());
    assert!(v.balance_value() == 175);
    v.request_early_exit(b"blob", &clk, sc.ctx());
    sc.return_to_sender(v);

    at(&mut sc, &mut clk, START + WAIT);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.complete_exit(&clk, sc.ctx());

    sc.next_tx(USER);
    let c = sc.take_from_sender<Coin<SUI>>();
    assert!(c.value() == 175);
    sc.return_to_sender(c);
    clk.destroy_for_testing();
    sc.end();
}

#[test, expected_failure(abort_code = vault::EExitNotReady)]
fun complete_exit_one_ms_early_fails() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"x", &clk, sc.ctx());
    sc.return_to_sender(v);

    at(&mut sc, &mut clk, START + WAIT - 1);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.complete_exit(&clk, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::ENoExitPending)]
fun complete_exit_without_request_fails() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.complete_exit(&clk, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::EExitPending)]
fun double_request_fails() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"a", &clk, sc.ctx());
    v.request_early_exit(b"b", &clk, sc.ctx());
    abort 0
}

#[test]
fun cancel_clears_and_new_request_starts_fresh() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"first", &clk, sc.ctx());
    assert!(v.exit_requested_ms() == option::some(START));
    v.cancel_exit(sc.ctx());
    assert!(v.exit_requested_ms().is_none());
    assert!(v.exit_reason_blob().is_empty());
    sc.return_to_sender(v);

    // New request at a later time restarts the timer.
    at(&mut sc, &mut clk, START + 4_000);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"second", &clk, sc.ctx());
    assert!(v.exit_requested_ms() == option::some(START + 4_000));
    assert!(v.exit_reason_blob() == b"second");
    sc.return_to_sender(v);

    // Old timer would have elapsed here, but the fresh one has not.
    at(&mut sc, &mut clk, START + WAIT + 100);
    let v = sc.take_from_sender<Vault<SUI>>();
    assert!(v.exit_requested_ms() == option::some(START + 4_000));
    sc.return_to_sender(v);
    clk.destroy_for_testing();
    sc.end();
}

#[test, expected_failure(abort_code = vault::EExitNotReady)]
fun completing_after_cancel_and_rerequest_uses_fresh_timer() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"first", &clk, sc.ctx());
    v.cancel_exit(sc.ctx());
    sc.return_to_sender(v);

    at(&mut sc, &mut clk, START + 4_000);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"second", &clk, sc.ctx());
    sc.return_to_sender(v);

    at(&mut sc, &mut clk, START + WAIT + 100);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.complete_exit(&clk, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::ENoExitPending)]
fun cancel_without_pending_fails() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.cancel_exit(sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::EStillLocked)]
fun withdraw_before_unlock_fails() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    at(&mut sc, &mut clk, UNLOCK - 1);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.withdraw(&clk, sc.ctx());
    abort 0
}

#[test]
fun withdraw_after_unlock_succeeds_with_exit_pending() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.deposit(coin::mint_for_testing<SUI>(11, sc.ctx()), sc.ctx());
    v.request_early_exit(b"pending", &clk, sc.ctx());
    sc.return_to_sender(v);

    at(&mut sc, &mut clk, UNLOCK);
    let v = sc.take_from_sender<Vault<SUI>>();
    v.withdraw(&clk, sc.ctx());

    sc.next_tx(USER);
    let c = sc.take_from_sender<Coin<SUI>>();
    assert!(c.value() == 111);
    sc.return_to_sender(c);
    clk.destroy_for_testing();
    sc.end();
}

#[test]
fun create_accepts_max_wait() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(START);
    let coin = coin::mint_for_testing<SUI>(1, sc.ctx());
    vault::create(coin, UNLOCK, vault::max_wait_ms(), &clk, sc.ctx());
    sc.next_tx(USER);
    let v = sc.take_from_sender<Vault<SUI>>();
    assert!(v.wait_ms() == 604_800_000);
    assert!(v.unlock_ms() == UNLOCK);
    sc.return_to_sender(v);
    clk.destroy_for_testing();
    sc.end();
}

#[test, expected_failure(abort_code = vault::EWaitTooLong)]
fun create_rejects_wait_above_cap() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(START);
    let coin = coin::mint_for_testing<SUI>(1, sc.ctx());
    vault::create(coin, UNLOCK, vault::max_wait_ms() + 1, &clk, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::EUnlockInPast)]
fun create_rejects_unlock_not_in_future() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    clk.set_for_testing(START);
    let coin = coin::mint_for_testing<SUI>(1, sc.ctx());
    vault::create(coin, START, WAIT, &clk, sc.ctx());
    abort 0
}

#[test, expected_failure(abort_code = vault::EExitPending)]
fun deposit_fails_while_exit_pending() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"x", &clk, sc.ctx());
    v.deposit(coin::mint_for_testing<SUI>(5, sc.ctx()), sc.ctx());
    abort 0
}

#[test]
fun deposit_allowed_after_cancel() {
    let mut sc = ts::begin(USER);
    let mut clk = clock::create_for_testing(sc.ctx());
    setup(&mut sc, &mut clk);
    let mut v = sc.take_from_sender<Vault<SUI>>();
    v.request_early_exit(b"x", &clk, sc.ctx());
    v.cancel_exit(sc.ctx());
    v.deposit(coin::mint_for_testing<SUI>(5, sc.ctx()), sc.ctx());
    assert!(v.balance_value() == 105);
    sc.return_to_sender(v);
    clk.destroy_for_testing();
    sc.end();
}
