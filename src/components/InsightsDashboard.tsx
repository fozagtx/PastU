"use client";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "@/lib/client/api";
import { errMsg } from "@/lib/client/hooks";
import { DEMO_INSIGHTS } from "@/lib/client/demo";
import { fmtDate, triggerLabel } from "@/lib/client/format";
import type { ChatMessage, InsightsDTO } from "@/lib/types";
import { WalletGate } from "./WalletGate";

/** Dashboard: saving reasons next to every attempt, counts, where money went, and Q&A. */
export function InsightsScreen() {
  return <WalletGate><Inner /></WalletGate>;
}

function Inner() {
  const { id } = useParams<{ id: string }>();
  const [data, setData] = useState<InsightsDTO | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const d = await api.getInsights(id);
        if (!dead) setData(d);
      } catch (e) { if (!dead) setErr(errMsg(e)); }
    })();
    return () => { dead = true; };
  }, [id]);

  if (err) return <div className="page stack" style={{ paddingTop: "3rem" }}><h1>We couldn’t open insights</h1><p className="error">{err}</p><Link href={`/promise/${id}`}>Back to your promise</Link></div>;
  if (!data) return <div className="page"><p className="muted" style={{ paddingTop: "3rem" }}>One moment…</p></div>;
  return <DashboardView data={data} promiseId={id} />;
}

/** Pure view, reusable for the no-wallet demo (Maya). */
export function DashboardView({ data, promiseId, demo = false }: { data: InsightsDTO; promiseId?: string; demo?: boolean }) {
  return (
    <div className="page stack stack-lg fade-in" style={{ paddingTop: "2rem" }}>
      <header className="stack stack-sm">
        <p className="eyebrow">Your words, beside what happened</p>
        <h1 className="big-serif">Why you saved it, and where it went</h1>
        <p className="muted">Saving reasons next to every attempt to leave. Where money actually went is read from chain when you withdrew. Nothing here judges you.</p>
        {demo && <p className="notice">Maya’s story — invented example, no wallet or backend involved.</p>}
        {promiseId && !demo && <p className="faint"><Link href={`/promise/${promiseId}`}>Back to your promise</Link> · <Link href={`/promise/${promiseId}/memory`}>Stored memories</Link></p>}
        {demo && <p className="faint"><Link href="/story">Maya’s story</Link> · <Link href="/promise/new">Make my own promise</Link></p>}
      </header>

      <section className="stack stack-sm">
        <h2>Why you said yes</h2>
        <ul style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack">
          {data.goal.length === 0 && <li className="muted">Nothing stored yet.</li>}
          {data.goal.map((g, i) => (
            <li key={i}>
              <p className="serif" style={{ fontSize: "1.25rem", lineHeight: 1.45 }}>“{g.text}”</p>
              <p className="faint">{fmtDate(g.date)}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="stack stack-sm">
        <h2>The numbers</h2>
        <p className="muted">
          {data.stats.attempts} attempts to leave · {data.stats.held} kept · {data.stats.exited} withdrew · {data.stats.regretted} regretted looking back.
        </p>
        {data.stats.byTrigger.length > 0 && (
          <p className="faint">Most common trigger: {data.stats.byTrigger.map((t) => `${triggerLabel[t.trigger] ?? t.trigger} ×${t.count}`).join(" · ")}</p>
        )}
      </section>

      <section className="stack stack-sm">
        <h2>Every attempt, in your words</h2>
        {data.attempts.length === 0 && <p className="muted">No attempts yet. Break a promise and this fills in.</p>}
        <ol style={{ listStyle: "none", padding: 0, margin: 0 }} className="stack stack-lg">
          {data.attempts.map((a) => (
            <li key={a.number} className="stack stack-sm">
              <p className="faint">Attempt {a.number} · {triggerLabel[a.trigger] ?? a.trigger} · {fmtDate(a.at)} · {a.result === "held" ? "You held." : a.result === "exited" ? "You withdrew." : "Still open."}{a.felt === "regret" ? " Looking back, it felt like a mistake." : a.felt === "fine" ? " Looking back, it felt fine." : ""}</p>
              <blockquote className="serif" style={{ fontSize: "1.15rem", lineHeight: 1.5, margin: 0 }}>“{a.urge}” <span className="faint">— what was going on</span></blockquote>
              {a.withdrawReason && <p className="muted">“{a.withdrawReason}” <span className="faint">— why you withdrew</span></p>}
              {(a.plan || a.wentTo) && (
                <p className="muted">
                  {a.plan && <span>Planned: “{a.plan}” </span>}
                  {a.wentTo && <span>On-chain: {a.wentTo}</span>}
                </p>
              )}
              {a.exitTx && <p className="faint">Exit tx {a.exitTx.slice(0, 12)}…</p>}
            </li>
          ))}
        </ol>
      </section>

      <InsightsChat data={data} promiseId={promiseId} demo={demo} />
    </div>
  );
}

function demoAnswer(data: InsightsDTO, q: string): string {
  const qWords = q.toLowerCase().split(/[^a-z0-9]+/).filter((w) => w.length > 2);
  const pool: { text: string; meta: string }[] = [
    ...data.goal.map((g) => ({ text: g.text, meta: `Saving reason · ${g.date}` })),
    ...data.attempts.flatMap((a) => [
      { text: a.urge, meta: `Attempt ${a.number} · ${a.at}` },
      ...(a.withdrawReason ? [{ text: a.withdrawReason, meta: `Attempt ${a.number} · withdraw reason` }] : []),
      ...(a.plan ? [{ text: a.plan, meta: `Attempt ${a.number} · where it was going` }] : []),
      ...(a.wentTo ? [{ text: a.wentTo, meta: `Attempt ${a.number} · where it went (chain)` }] : []),
    ]),
  ];
  const scored = pool.map((p) => ({ p, s: qWords.filter((w) => p.text.toLowerCase().includes(w)).length })).filter((x) => x.s > 0).sort((a, b) => b.s - a.s).slice(0, 3).map((x) => x.p);
  const picked = scored.length ? scored : pool.slice(0, 3);
  const lines = picked.map((p) => `- “${p.text}” (${p.meta})`);
  return [`Based only on your own words, here is what fits your question:`, "", ...lines, "", "Ordered by simple rules, from your own history. Only your words are shown."].join("\n");
}

function InsightsChat({ data, promiseId, demo }: { data: InsightsDTO; promiseId?: string; demo?: boolean }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => { boxRef.current?.scrollTo({ top: boxRef.current.scrollHeight }); }, [messages, busy]);

  async function send(e: FormEvent) {
    e.preventDefault();
    const text = q.trim();
    if (!text || busy) return;
    setQ(""); setErr(null);
    const withUser = [...messages, { role: "user" as const, content: text }];
    setMessages(withUser);
    setBusy(true);
    try {
      const answer = demo
        ? demoAnswer(data, text)
        : (await api.chatInsights(promiseId!, { messages: withUser })).answer;
      setMessages((m) => [...m, { role: "assistant" as const, content: answer }]);
    } catch (e2) { setErr(errMsg(e2)); }
    finally { setBusy(false); }
  }

  return (
    <section className="stack stack-sm">
      <h2>Ask about your own words</h2>
      <p className="muted">Ask what made you want to leave, when you held, or where money went. The answer quotes only what you wrote. A model only chooses which quotes fit.</p>
      <div ref={boxRef} style={{ maxHeight: "24rem", overflowY: "auto", border: "1px solid var(--line)", borderRadius: "var(--radius)", padding: "1rem" }} className="stack stack-sm">
        {messages.length === 0 && <p className="faint">Example: “Why did I want to withdraw after a loss?”</p>}
        {messages.map((m, i) => (
          <div key={i}>
            <p className="faint">{m.role === "user" ? "You" : "Past You"}</p>
            <p className={m.role === "assistant" ? "serif" : "muted"} style={{ whiteSpace: "pre-wrap", lineHeight: 1.55 }}>{m.content}</p>
          </div>
        ))}
        {busy && <p className="muted">One moment…</p>}
      </div>
      {err && <p className="error" role="alert">{err}</p>}
      <form onSubmit={send} className="row" style={{ alignItems: "flex-end" }}>
        <label className="faint" style={{ flex: 1 }}>Your question
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Why did I want to withdraw after a loss?" maxLength={500} />
        </label>
        <button className="btn" disabled={busy || q.trim().length < 2}>Ask</button>
      </form>
      <p className="faint">The question and your stored quotes are sent to Nebius to pick the best fits. No new facts are invented.</p>
    </section>
  );
}

/** No-wallet demo for judges. */
export function DemoInsights() {
  return <DashboardView data={DEMO_INSIGHTS} demo />;
}
