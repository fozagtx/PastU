"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { errMsg } from "@/lib/client/hooks";
import { fmtDate } from "@/lib/client/format";
import { useWallet } from "@/lib/client/wallet";
import type { MemoryItemDTO } from "@/lib/types";
import { BlobLink } from "./BlobLink";
import { WalletGate } from "./WalletGate";

export function MemoryScreen() { return <WalletGate><Inner /></WalletGate>; }

const kindLabel: Record<string, string> = { reason: "reason", urge: "what was going on", shown: "shown to you", decision: "decision", outcome: "looking back", habit: "weekly check" };

function Inner() {
  const { id } = useParams<{ id: string }>();
  const { ensureAuth } = useWallet();
  const [items, setItems] = useState<MemoryItemDTO[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const [revoked, setRevoked] = useState(false);

  useEffect(() => { (async () => { try { await ensureAuth(); setItems(await api.listMemories(id)); } catch (e) { setErr(errMsg(e)); } })(); }, [id, ensureAuth]);

  async function revoke() {
    setErr(null);
    try { await api.revokeAccess(); setRevoked(true); setConfirm(false); } catch (e) { setErr(errMsg(e)); }
  }

  return (
    <div className="page stack stack-lg fade-in" style={{ paddingTop: "2rem" }}>
      <header className="stack stack-sm">
        <p className="eyebrow"><Link href={`/promise/${id}`}>← Your promise</Link></p>
        <h1>What’s remembered</h1>
        <p className="muted">Everything you’ve written for this promise, word for word.</p>
      </header>

      <section className="card stack stack-sm">
        <h2>Revoke Past You’s access</h2>
        <p className="muted">Revoking stops Past You from reading your words from now on. It does <strong>not</strong> delete what you saved, and anything it already read stays read. It applies to everything, not one item at a time.</p>
        {revoked ? <p className="pill" style={{ justifySelf: "start" }}>Access revoked</p> : confirm ? (
          <div className="row"><button className="btn" onClick={revoke}>Yes, revoke access</button><button className="btn text" onClick={() => setConfirm(false)}>Cancel</button></div>
        ) : <div><button className="btn quiet" onClick={() => setConfirm(true)}>Revoke access</button></div>}
      </section>

      {err && <p className="error" role="alert">{err}</p>}
      {!items ? <p className="muted">Loading…</p> : items.length === 0 ? <p className="muted">Nothing is stored yet.</p> : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {items.map((m, i) => (
            <li key={m.blobId ?? i} className="card stack stack-sm" style={{ opacity: revoked ? 0.6 : 1 }}>
              <p className="serif" style={{ fontSize: "1.2rem", lineHeight: 1.45 }}>“{m.text}”</p>
              <p className="faint">{fmtDate(m.createdAt)} · {kindLabel[m.kind] ?? m.kind} · {m.walrusUrl ? <a href={m.walrusUrl} target="_blank" rel="noreferrer">Stored copy</a> : <BlobLink blobId={m.blobId} />}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
