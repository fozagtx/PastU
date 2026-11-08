"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { errMsg } from "@/lib/client/hooks";
import { loadAttemptMeta, type AttemptMeta } from "@/lib/client/store";
import { useWallet } from "@/lib/client/wallet";
import { WalletGate } from "./WalletGate";

export function FollowUp() { return <WalletGate><Inner /></WalletGate>; }

function Inner() {
  const { id, attemptId } = useParams<{ id: string; attemptId: string }>();
  const { ensureAuth } = useWallet();
  const [meta, setMeta] = useState<AttemptMeta | null>(null);
  const [felt, setFelt] = useState<"regret" | "fine" | null>(null);
  const [finding, setFinding] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setMeta(loadAttemptMeta(attemptId)), [attemptId]);

  async function answer(v: "regret" | "fine") {
    setBusy(true); setErr(null);
    try { await ensureAuth(); const r = await api.outcome(id, attemptId, { felt: v }); setFelt(v); setFinding(r.finding); } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }

  return (
    <div className="page stack stack-lg fade-in" style={{ paddingTop: "3rem" }}>
      <header className="stack stack-sm">
        <p className="eyebrow">Looking back{meta ? ` · attempt ${meta.number}` : ""}</p>
        <h1 className="big-serif">Was that the right call?</h1>
      </header>
      {meta?.urge && <blockquote className="serif" style={{ margin: 0, fontSize: "1.35rem", lineHeight: 1.45 }}>“{meta.urge}”</blockquote>}

      {!felt ? (
        <div className="stack">
          <div className="row">
            <button className="btn quiet" disabled={busy} onClick={() => answer("fine")}>Yes, it was fine</button>
            <button className="btn quiet" disabled={busy} onClick={() => answer("regret")}>I wish I’d stayed</button>
          </div>
          <p className="faint">Either answer is welcome. It only helps Past You choose better words next time.</p>
        </div>
      ) : (
        <div className="stack">
          {finding && <div className="notice"><strong>What the chain shows.</strong> {finding}</div>}
          <p className="muted">{felt === "fine" ? "Thank you. That’s noted, with no judgment." : "Thank you for saying so. Those words will be remembered, gently."}</p>
          {meta?.result !== "held" && (
            <div className="card stack stack-sm">
              <h2>Want to start again?</h2>
              <p className="muted">You can lock a new vault and write a fresh sentence about why. Only if it feels right.</p>
              <div className="row"><Link className="btn" href={`/promise/new?relock=${encodeURIComponent(id)}`}>Lock a new vault</Link><Link className="btn text" href={`/promise/${id}`}>Not now</Link></div>
            </div>
          )}
          {meta?.result === "held" && <Link href={`/promise/${id}`}>Back to your promise</Link>}
        </div>
      )}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );
}
