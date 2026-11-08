import Link from "next/link";
import { MomentCards } from "@/components/LandingVisuals";

export const metadata = { title: "How it works · Past You" };

export default function How() {
  return (
    <div className="page wide stack stack-lg" style={{ paddingTop: "2rem" }}>
      <header className="stack stack-sm">
        <p className="eyebrow"><Link href="/">← Back</Link></p>
        <h1>How Past You works</h1>
      </header>
      <MomentCards />
      <section className="stack" style={{ maxWidth: "42rem" }}>
        <h2>Step by step</h2>
        <ol className="steps muted">
          <li>You lock an amount until a date, and write one sentence about why it matters.</li>
          <li>If you try to leave early, you say what’s going on. Then you see what you once wrote.</li>
          <li>An exit timer runs, set by you, enforced onchain. Keep the promise, or leave when it ends.</li>
          <li>Later, you say whether it was the right call. That shapes which of your words come first next time.</li>
        </ol>
        <div className="row"><Link className="btn" href="/promise/new">Make a promise</Link><Link className="btn quiet" href="/demo">See an example</Link></div>
      </section>
    </div>
  );
}
