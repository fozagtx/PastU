import Link from "next/link";
import { RememberedPromises } from "@/components/RememberedPromises";

export default function Landing() {
  return (
    <div className="page stack stack-lg" style={{ paddingTop: "clamp(2rem, 8vw, 5rem)" }}>
      <section className="stack fade-in">
        <p className="eyebrow">A savings promise that remembers you</p>
        <h1 className="big-serif" style={{ fontSize: "clamp(2.2rem, 7vw, 3.8rem)", textWrap: "balance" as never }}>
          Nobody lectured this person. They just heard from themselves.
        </h1>
        <p className="muted" style={{ fontSize: "1.1rem", maxWidth: "34rem" }}>
          You lock some savings and write down why. When you later try to break the promise, Past You doesn’t scold. It shows you your own words, from your own earlier self, and waits with you.
        </p>
        <div className="row" style={{ marginTop: "1.5rem" }}>
          <Link className="btn" href="/promise/new">Make a promise</Link>
          <Link className="btn quiet" href="/demo">Watch a made-up example</Link>
        </div>
        <p className="faint">Connect a wallet with the button at the top to begin.</p>
      </section>

      <RememberedPromises />

      <section className="stack-sm stack">
        <h2>How it feels</h2>
        <ol className="stack muted" style={{ paddingLeft: "1.2rem" }}>
          <li>You lock an amount until a date, and write one sentence about why it matters.</li>
          <li>If you try to leave early, you say what’s going on. Then you see what you once wrote.</li>
          <li>An exit timer runs, set by you, enforced onchain. You can keep the promise or leave when it ends.</li>
          <li>Later, you say whether it was the right call. That shapes which of your words come first next time.</li>
        </ol>
      </section>
    </div>
  );
}
