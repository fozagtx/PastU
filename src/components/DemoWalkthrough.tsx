"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { DEMO_ATTEMPTS, PERSONA } from "@/lib/client/demo";
import { PastYouView } from "./PastYouView";
import { Countdown } from "./Countdown";
import { fmtDate } from "@/lib/client/format";
import s from "./Demo.module.css";

const DEMO_WAIT_MS = 60_000;

export function DemoWalkthrough() {
  const [i, setI] = useState(0);
  const [endsAt, setEndsAt] = useState<number | null>(null);
  const [nowTick, setNowTick] = useState(0);
  const dto = DEMO_ATTEMPTS[i];

  useEffect(() => { setEndsAt(Date.now() + DEMO_WAIT_MS); }, [i]);
  useEffect(() => { const t = setInterval(() => setNowTick((n) => n + 1), 500); return () => clearInterval(t); }, []);
  const done = endsAt != null && Date.now() >= endsAt && nowTick >= 0;

  // Rank of each reason per attempt, to show the reordering.
  const reasons = Array.from(new Map(DEMO_ATTEMPTS.flatMap((a) => a.quotes).map((q) => [q.reasonId, q])).values());

  return (
    <div className={`page wide storyWide ${s.storyPage}`} style={{ paddingTop: "1rem" }}>
      <div className={s.topRow}>
        <p className={s.banner}>Maya’s promise: <span className="serif">“{PERSONA.promise}.”</span> <span className="faint">An invented example.</span></p>
        <nav className={s.steps} aria-label="Attempts">
          {DEMO_ATTEMPTS.map((a, n) => (
            <button key={n} className={`${s.step} ${n === i ? s.on : ""}`} aria-current={n === i ? "step" : undefined} onClick={() => setI(n)}>
              Attempt {a.attemptNumber}
            </button>
          ))}
        </nav>
      </div>

      <div className={s.grid}>
        <div>
          <PastYouView dto={dto} demo>
            <div className="timerRow">
              <div>
                <p className="eyebrow">Withdraw in</p>
                <p className="timer num timerNum"><Countdown targetMs={endsAt} doneLabel="Now" /></p>
              </div>
              <div className="row">
                <button className="btn" onClick={() => setI((i + 1) % DEMO_ATTEMPTS.length)}>Keep my promise</button>
                <button className="btn quiet" disabled={!done} title={done ? "" : "Available when the timer ends"}>Withdraw</button>
              </div>
            </div>
          </PastYouView>
        </div>

        <aside className={s.side} aria-label="How the order moved">
          <h2 style={{ fontSize: "1.05rem" }}>How the order moved</h2>
          <p className="faint">Same four things Maya wrote. Different order each time, depending on what happened before.</p>
          <table className={s.table}>
            <thead><tr><th scope="col">Her words</th>{DEMO_ATTEMPTS.map((a, n) => <th key={n} scope="col" className={n === i ? s.hi : ""}>#{a.attemptNumber}</th>)}</tr></thead>
            <tbody>
              {reasons.map((r) => (
                <tr key={r.reasonId}>
                  <th scope="row"><span className={s.quote} title={r.text}>{r.text}</span><span className={s.date}>{fmtDate(r.date)}</span></th>
                  {DEMO_ATTEMPTS.map((a, n) => {
                    const rank = a.quotes.findIndex((q) => q.reasonId === r.reasonId);
                    return <td key={n} className={n === i ? s.hi : ""}>{rank < 0 ? <span className="faint">–</span> : <span className={rank === 0 ? s.first : ""}>{rank + 1}</span>}</td>;
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="faint">No scores or badges. The model only reorders; every word shown is exactly what she wrote.</p>
          <Link href="/promise/new" className="btn quiet" style={{ marginTop: "1rem" }}>Make my own promise</Link>
        </aside>
      </div>
    </div>
  );
}
