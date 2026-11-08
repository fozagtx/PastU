"use client";
import Link from "next/link";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { errMsg, useNow } from "@/lib/client/hooks";
import { loadAttemptMeta, saveAttemptMeta, setActiveAttempt } from "@/lib/client/store";
import { usePromiseData } from "@/lib/client/usePromiseData";
import { buildCancelExit, buildCompleteExit } from "@/lib/client/vault";
import { useWallet } from "@/lib/client/wallet";
import type { PastYouDTO } from "@/lib/types";
import { fmtDuration } from "@/lib/client/format";
import { getActiveAttempt } from "@/lib/client/store";
import { PastYouView } from "./PastYouView";
import { WalletGate } from "./WalletGate";

export function PastYouScreen() { return <WalletGate><Inner /></WalletGate>; }

function Inner() {
  const { id } = useParams<{ id: string }>();
  const sp = useSearchParams();
  const router = useRouter();
  const [attemptId, setAttemptId] = useState<string | null>(sp.get("attempt"));
  useEffect(() => { if (!attemptId) setAttemptId(getActiveAttempt(id)); }, [attemptId, id]);
  const { address, ensureAuth, run } = useWallet();
  const { promise, vault, vaultError } = usePromiseData(id, 10_000);
  const now = useNow(250);
  const [dto, setDto] = useState<PastYouDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState<"keep" | "exit" | null>(null);

  useEffect(() => {
    if (!attemptId) return;
    let dead = false;
    (async () => { try { await ensureAuth(); const d = await api.getPastYou(id, attemptId); if (!dead) setDto(d); } catch (e) { if (!dead) setErr(errMsg(e)); } })();
    return () => { dead = true; };
  }, [id, attemptId, ensureAuth]);

  if (!attemptId) return <div className="page stack" style={{ paddingTop: "3rem" }}><p className="muted">There’s no exit in progress.</p><Link href={`/promise/${id}`}>Back to your promise</Link></div>;

  const ready = vault?.exitReadyMs ?? null;
  const left = ready != null && now != null ? ready - now : null;
  const canWithdraw = left != null && left <= 0;

  async function keep() {
    if (!promise?.currentVaultId) return;
    setBusy("keep"); setErr(null);
    try {
      const out = await run(buildCancelExit({ vault: promise.currentVaultId, sender: address! }));
      await api.decide(id, attemptId!, { result: "held", exitTx: out.digest });
      const m = loadAttemptMeta(attemptId!); if (m) saveAttemptMeta(attemptId!, { ...m, result: "held" });
      setActiveAttempt(id, null);
      router.push(`/promise/${id}`);
    } catch (e) { setErr(errMsg(e)); setBusy(null); }
  }
  async function leave() {
    if (!promise?.currentVaultId) return;
    setBusy("exit"); setErr(null);
    try {
      const out = await run(buildCompleteExit({ vault: promise.currentVaultId, sender: address! }));
      await api.decide(id, attemptId!, { result: "exited", exitTx: out.digest });
      const m = loadAttemptMeta(attemptId!); if (m) saveAttemptMeta(attemptId!, { ...m, result: "exited" });
      setActiveAttempt(id, null);
      router.push(`/promise/${id}/follow-up/${encodeURIComponent(attemptId!)}`);
    } catch (e) { setErr(errMsg(e)); setBusy(null); }
  }

  const timer = (
    <div className="stack" role="group" aria-label="Exit timer">
      <div className="timerRow">
      <div>
        <p className="eyebrow">{canWithdraw ? "Wait is over" : "Withdraw in"}</p>
        <p className="timer num timerNum" role="timer">
          {left == null ? (vaultError ? "—" : "…") : canWithdraw ? "Now" : fmtDuration(left)}
        </p>
      </div>
      <div className="row">
        <button className="btn" onClick={keep} disabled={!!busy}>{busy === "keep" ? "Confirm in wallet…" : "Keep my promise"}</button>
        <button className="btn quiet" onClick={leave} disabled={!canWithdraw || !!busy} title={canWithdraw ? "" : "Available when the timer ends"}>{busy === "exit" ? "Confirm in wallet…" : "Withdraw"}</button>
      </div>
      </div>
      {vaultError && <p className="error">{vaultError}</p>}
      {err && <p className="error" role="alert">{err}</p>}
    </div>
  );

  return (
    <div className="page" style={{ paddingTop: "1rem" }}>
      {dto ? <PastYouView dto={dto}>{timer}</PastYouView> : err ? <><p className="error">{err}</p>{timer}</> : <p className="muted" style={{ paddingTop: "3rem" }}>One moment…</p>}
    </div>
  );
}
