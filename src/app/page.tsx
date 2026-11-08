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
          Maya locked 400 SUI for a year of breathing room. Three weeks in, a bad month made her want it back. Past You showed her what she wrote the day she started. She waited out the timer, and kept her promise.
        </p>
        <p className="faint storyLine">You lock money and write why. If you try to leave early, you wait and read your own words first.</p>
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
