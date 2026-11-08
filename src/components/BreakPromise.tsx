"use client";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { errMsg } from "@/lib/client/hooks";
import { saveAttemptMeta, setActiveAttempt } from "@/lib/client/store";
import { usePromiseData } from "@/lib/client/usePromiseData";
import { buildRequestEarlyExit } from "@/lib/client/vault";
import { useWallet } from "@/lib/client/wallet";
import type { AttemptResp } from "@/lib/types";
import { WalletGate } from "./WalletGate";

export function BreakPromise() { return <WalletGate><Inner /></WalletGate>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { address, ensureAuth, run } = useWallet();
  const { promise, error, loading } = usePromiseData(id);
  const [urge, setUrge] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [attempt, setAttempt] = useState<AttemptResp | null>(null); // kept so a failed wallet step can retry without a duplicate attempt

  async function submit(e: FormEvent) {
    e.preventDefault(); setErr(null);
    if (!promise?.currentVaultId) { setErr("This promise has no active vault."); return; }
    if (urge.trim().length < 2) { setErr("Say a few words about what’s going on."); return; }
    setBusy(true);
    try {
      await ensureAuth();
      const a = attempt ?? await api.startAttempt(id, { urge: urge.trim() });
      setAttempt(a);
      await run(buildRequestEarlyExit({ vault: promise.currentVaultId, urgeBlobId: a.urgeBlobId, sender: address! }));
      setActiveAttempt(id, a.attemptId);
      saveAttemptMeta(a.attemptId, { urge: urge.trim(), number: a.number });
      router.push(`/promise/${id}/past-you?attempt=${encodeURIComponent(a.attemptId)}`);
    } catch (e2) { setErr(errMsg(e2)); setBusy(false); }
  }

  if (loading) return <div className="page"><p className="muted" style={{ paddingTop: "3rem" }}>Loading…</p></div>;
  if (error) return <div className="page"><p className="error" style={{ marginTop: "3rem" }}>{error}</p></div>;

  return (
    <form className="page stack stack-lg fade-in" style={{ paddingTop: "3rem" }} onSubmit={submit}>
      <header className="stack stack-sm">
        <h1 className="big-serif">What’s going on right now?</h1>
        <p className="muted">Take your time. Nothing happens to your money yet. This starts the exit timer you chose, and then you’ll see something you wrote.</p>
      </header>
      <div>
        <label htmlFor="urge" className="faint" style={{ fontWeight: 400 }}>In your own words</label>
        <textarea id="urge" value={urge} onChange={(e) => setUrge(e.target.value)} maxLength={1200} autoFocus disabled={busy && !!attempt} />
        <p className="hint">Please keep other people’s private details out of it.</p>
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <div className="row">
        <button className="btn" disabled={busy}>{busy ? "Working…" : attempt ? "Try the wallet again" : "Continue"}</button>
        <Link className="btn text" href={`/promise/${id}`}>Never mind</Link>
      </div>
    </form>
  );
}
