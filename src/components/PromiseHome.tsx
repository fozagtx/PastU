"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { COIN_SYMBOL, DEPOSIT_CAP } from "@/lib/client/config";
import { fmtDate, fromBaseUnits, toBaseUnits } from "@/lib/client/format";
import { errMsg, useNow } from "@/lib/client/hooks";
import { getActiveAttempt, rememberPromise } from "@/lib/client/store";
import { usePromiseData } from "@/lib/client/usePromiseData";
import { buildDeposit, buildWithdraw } from "@/lib/client/vault";
import { useWallet } from "@/lib/client/wallet";
import type { Reason } from "@/lib/types";
import { WalletGate } from "./WalletGate";
import { Countdown } from "./Countdown";

export function PromiseHome() { return <WalletGate><Inner /></WalletGate>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { address, ensureAuth, run } = useWallet();
  const { promise, vault, error, vaultError, loading, refresh } = usePromiseData(id, 20_000);
  const now = useNow(1000);
  const [reasons, setReasons] = useState<Reason[]>([]);
  const [newReason, setNewReason] = useState("");
  const [deposit, setDeposit] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [active, setActive] = useState<string | null>(null);

  useEffect(() => { rememberPromise(id); setActive(getActiveAttempt(id)); }, [id]);
  useEffect(() => { if (promise) setReasons(promise.reasons ?? []); }, [promise]);

  const unlocked = !!vault && now != null && now >= vault.unlockMs;
  const exiting = promise?.status === "exiting" || (!!vault && vault.exitReadyMs != null);

  async function addReason(e: FormEvent) {
    e.preventDefault(); if (newReason.trim().length < 3) return;
    setBusy("reason"); setErr(null);
    try { await ensureAuth(); const r = await api.addReason(id, newReason.trim()); setReasons((x) => [...x, r]); setNewReason(""); setMsg("Added. It’s now part of what you’ll hear."); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(null); }
  }
  async function doDeposit(e: FormEvent) {
    e.preventDefault(); setErr(null); setMsg(null);
    try {
      const base = toBaseUnits(deposit);
      const total = Number(deposit) + Number(fromBaseUnits(vault?.balance ?? 0n, 9));
      if (base <= 0n) throw new Error("Enter an amount.");
      if (total > DEPOSIT_CAP) throw new Error(`This demo caps a vault at ${DEPOSIT_CAP} ${COIN_SYMBOL} in total.`);
      setBusy("deposit");
      await run(buildDeposit({ vault: promise!.currentVaultId!, amount: base, sender: address! }));
      setDeposit(""); setMsg("Added to your vault."); await refresh();
    } catch (e2) { setErr(errMsg(e2)); } finally { setBusy(null); }
  }
  async function withdraw() {
    setBusy("withdraw"); setErr(null); setMsg(null);
    try { await run(buildWithdraw({ vault: promise!.currentVaultId!, sender: address! })); setMsg("Withdrawn. Your promise is complete."); await refresh(); }
    catch (e2) { setErr(errMsg(e2)); } finally { setBusy(null); }
  }

  if (loading) return <div className="page"><p className="muted" style={{ paddingTop: "3rem" }}>Loading…</p></div>;
  if (error || !promise) return <div className="page stack" style={{ paddingTop: "3rem" }}><h1>We couldn’t open this promise</h1><p className="error">{error}</p><Link href="/">Back home</Link></div>;

  return (
    <div className="page stack stack-lg fade-in" style={{ paddingTop: "2rem" }}>
      <section className="stack stack-sm">
        <p className="eyebrow">Your promise</p>
        <p className="big-serif num" style={{ fontSize: "clamp(2.4rem, 9vw, 4rem)" }}>
          {vault ? fromBaseUnits(vault.balance) : "…"} <span className="muted" style={{ fontSize: "55%" }}>{COIN_SYMBOL}</span>
        </p>
        <p className="muted">
          {vault ? <>Locked until <strong>{fmtDate(vault.unlockMs)}</strong>{unlocked ? ". That day has come." : "."}</> : vaultError ? <span className="error">{vaultError}</span> : "Reading the vault…"}
        </p>
        {exiting && <p className="notice">An exit is in progress{vault?.exitReadyMs ? <> (ready in <Countdown targetMs={vault.exitReadyMs} doneLabel="now" />)</> : null}. <Link href={active ? `/promise/${id}/past-you?attempt=${active}` : `/promise/${id}/break`}>Open it</Link></p>}
      </section>

      {msg && <p className="notice" role="status">{msg}</p>}
      {err && <p className="error" role="alert">{err}</p>}

      <section className="stack stack-sm">
        <h2>Why you said yes</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {reasons.length === 0 && <li className="muted">Nothing here yet.</li>}
          {reasons.map((r) => (
            <li key={r.id}>
              <p className="serif" style={{ fontSize: "1.25rem", lineHeight: 1.45 }}>“{r.text}”</p>
              <p className="faint">{fmtDate(r.createdAt)}{r.kind === "checkin" ? " · check-in" : ""}</p>
            </li>
          ))}
        </ul>
        <form onSubmit={addReason} className="stack stack-sm" style={{ marginTop: "1rem" }}>
          <label htmlFor="nr">Add another reason</label>
          <textarea id="nr" value={newReason} onChange={(e) => setNewReason(e.target.value)} style={{ minHeight: "5rem" }} maxLength={1200} />
          <div><button className="btn quiet" disabled={busy === "reason" || newReason.trim().length < 3}>Add it</button></div>
        </form>
        <p className="faint"><Link href={`/promise/${id}/memory`}>See everything stored, or revoke access</Link></p>
      </section>

      <section className="stack stack-sm">
        <h2>Adding to it</h2>
        <p className="muted">This week: no deposit yet. There’s no schedule to keep. Add when it feels right.</p>
        <form onSubmit={doDeposit} className="row">
          <label htmlFor="dep" className="faint" style={{ margin: 0 }}>Amount ({COIN_SYMBOL})</label>
          <input id="dep" inputMode="decimal" value={deposit} onChange={(e) => setDeposit(e.target.value)} style={{ width: "9rem" }} />
          <button className="btn quiet" disabled={!deposit || busy === "deposit" || !vault}>Add</button>
        </form>
        <p className="faint">Vault total is capped at {DEPOSIT_CAP} {COIN_SYMBOL} in this unaudited demo.</p>
      </section>

      <section className="stack">
        {unlocked && !exiting && vault && vault.balance > 0n && (
          <div><button className="btn" onClick={withdraw} disabled={busy === "withdraw"}>{busy === "withdraw" ? "Confirm in wallet…" : "Withdraw"}</button></div>
        )}
        {!unlocked && !exiting && <div><Link className="btn text" href={`/promise/${id}/break`}>Break promise</Link></div>}
        {promise.attempts > 0 && <p className="faint">You’ve reached for the exit {promise.attempts} time{promise.attempts === 1 ? "" : "s"}. That’s part of the story, not a score.</p>}
      </section>
    </div>
  );
}
