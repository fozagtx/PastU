import Link from "next/link";
import { HeroMockup } from "@/components/LandingVisuals";
import { RememberedPromises } from "@/components/RememberedPromises";

/** One screen, no scrolling on a laptop: what it is, what to do, and the product. */
export default function Landing() {
  return (
    <div className="page wide landing">
      <section className="landingText fade-in">
        <p className="eyebrow">A savings lock that talks you out of quitting</p>
        <h1 className="display">Keep the promise you made to yourself.</h1>
        <p className="lede">
          Lock some money until a date and write why it matters. If you try to take it out early, you wait a short timer and read your own words first. No lectures, just you.
        </p>
        <div className="row">
          <Link className="btn" href="/promise/new">Start a promise</Link>
          <Link className="btn quiet" href="/demo">See how it works</Link>
        </div>
        <p className="faint">Free to try. Uses Sui testnet coins, not real money.</p>
        <RememberedPromises />
      </section>
      <section className="landingArt fade-in" style={{ animationDelay: ".12s" }}>
        <HeroMockup />
      </section>
    </div>
  );
}
