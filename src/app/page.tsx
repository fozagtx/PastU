import Link from "next/link";
import { HeroMockup } from "@/components/LandingVisuals";
import { NoteLockIllustration, SmileIllustration, WaitWordsIllustration, WalletIllustration } from "@/components/Illustrations";
import { RememberedPromises } from "@/components/RememberedPromises";

/** Pattern from goldsand.fi: badge, serif headline, two pill buttons, product below. */
export default function Landing() {
  return (
    <div className="page wide hero3">
      <div className="heroDecor" aria-hidden>
        <div className="decor decorL1"><NoteLockIllustration /></div>
        <div className="decor decorL2"><SmileIllustration /></div>
        <div className="decor decorR1"><WaitWordsIllustration /></div>
        <div className="decor decorR2"><WalletIllustration /></div>
      </div>
      <span className="badge fade-in"><span className="dot" aria-hidden />Accountable savings lock on Sui</span>
      <h1 className="hero3Title fade-in" style={{ animationDelay: ".05s" }}>Savings that remind you why</h1>
      <div className="row hero3Cta fade-in" style={{ animationDelay: ".1s" }}>
        <Link className="btn" href="/promise/new">Start a promise</Link>
        <Link className="btn quiet" href="/story">See Maya’s story</Link>
      </div>
      <RememberedPromises />
      <div className="hero3Peek fade-in" style={{ animationDelay: ".2s" }} aria-hidden>
        <HeroMockup />
      </div>
    </div>
  );
}
