"use client";
import { useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "@/lib/client/api";
import { COIN_SYMBOL, COIN_TYPE, DEPOSIT_CAP } from "@/lib/client/config";
import { toBaseUnits } from "@/lib/client/format";
import { errMsg } from "@/lib/client/hooks";
import { rememberPromise } from "@/lib/client/store";
import { buildCreate } from "@/lib/client/vault";
import { useWallet } from "@/lib/client/wallet";
import { WAIT_DEFAULT_MS, WAIT_DEMO_MS, WAIT_MAX_MS } from "@/lib/types";
import { WalletGate } from "./WalletGate";

const WAITS = [
  { ms: WAIT_DEMO_MS, label: "60 seconds (demo only)" },
  { ms: WAIT_DEFAULT_MS, label: "24 hours (default)" },
  { ms: 3 * 86_400_000, label: "3 days" },
  { ms: WAIT_MAX_MS, label: "7 days (longest)" },
];

export function NewPromiseForm() {
  const params = useSearchParams();
  const relock = params.get("relock");
  return <WalletGate><Form relock={relock} /></WalletGate>;
}

function Form({ relock }: { relock: string | null }) {
  const router = useRouter();
  const { address, ensureAuth, run } = useWallet();
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState("");
  const [wait, setWait] = useState(WAIT_DEFAULT_MS);
  const [why, setWhy] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [step, setStep] = useState("");

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    try {
      const base = toBaseUnits(amount);
      if (base <= 0n) throw new Error("Choose an amount above zero.");
      if (Number(amount) > DEPOSIT_CAP) throw new Error(`This demo caps a vault at ${DEPOSIT_CAP} ${COIN_SYMBOL}.`);
      const unlock = new Date(`${date}T23:59:59`).getTime();
      if (!date || !(unlock > Date.now())) throw new Error("Pick an unlock date in the future.");
      if (why.trim().length < 3) throw new Error("Write a sentence about why this matters. It’s what you’ll hear later.");
      setBusy(true);
      setStep("Confirm in your wallet…");
      await ensureAuth();
      const out = await run(buildCreate({ amount: base, unlockMs: unlock, waitMs: wait, sender: address! }));
      if (!out.createdVaultId) throw new Error(`The vault was created (tx ${out.digest}) but its id couldn’t be read. Open your wallet’s activity to find it.`);
      setStep("Saving your words… this can take up to 30 seconds");
      const p = await api.createPromise({ vaultId: out.createdVaultId, coinType: COIN_TYPE, reason: why.trim() });
      rememberPromise(p.id);
      router.push(`/promise/${p.id}`);
    } catch (e2) { setErr(errMsg(e2)); setBusy(false); setStep(""); }
  }

  return (
    <form className="page wide formPage fade-in" onSubmit={submit} noValidate>
      <header className="formIntro stack stack-sm">
        <p className="eyebrow">{relock ? "Starting again" : "A new promise"}</p>
        <h1>{relock ? "Lock a new vault, with your words" : "What are you promising yourself?"}</h1>
        <p className="muted">Lock some money until a date. If you try to leave early, you wait, and you read what you write below.</p>
        <p className="faint">We save your words and only ever show them back to you. Nothing is ever written for you.</p>
      </header>

      <div className="formFields">
        <div className="fieldPair">
          <div>
            <label htmlFor="amount">Amount to lock ({COIN_SYMBOL})</label>
            <input id="amount" inputMode="decimal" placeholder={`up to ${DEPOSIT_CAP}`} value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <label htmlFor="date">Unlock date</label>
            <input id="date" type="date" value={date} min={new Date(Date.now() + 86400000).toISOString().slice(0, 10)} onChange={(e) => setDate(e.target.value)} required />
          </div>
        </div>
        <div>
          <label htmlFor="wait">If you want out early, you wait</label>
          <select id="wait" value={wait} onChange={(e) => setWait(Number(e.target.value))}>
            {WAITS.map((w) => <option key={w.ms} value={w.ms}>{w.label}</option>)}
          </select>
          <p className="hint">Before the unlock date, leaving early means waiting this long. Nobody can skip it, not even us.</p>
        </div>
        <div>
          <label htmlFor="why">Why does this matter?</label>
          <textarea id="why" value={why} onChange={(e) => setWhy(e.target.value)} placeholder="In your own words. This is what you’ll hear back, so make it sound like you." maxLength={1200} style={{ minHeight: "5.5rem" }} />
          <p className="hint">Write about you, not other people’s private details.</p>
        </div>
        {err && <p className="error" role="alert">{err}</p>}
        <div className="row">
          <button className="btn" type="submit" disabled={busy}>{busy ? step || "Working…" : relock ? "Lock again" : "Lock it in"}</button>
        </div>
      </div>
    </form>
  );
}
