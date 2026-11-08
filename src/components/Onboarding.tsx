"use client";
import { ConnectButton } from "./ConnectButton";
import { FaucetIllustration, NoteLockIllustration, WaitWordsIllustration, WalletIllustration } from "./Illustrations";

const STEPS = [
  { Illo: WalletIllustration, title: "Get a Sui wallet", body: "Install Slush, then switch it to Testnet in its settings.", link: { href: "https://slush.app", label: "Get Slush" } },
  { Illo: FaucetIllustration, title: "Add free test SUI", body: "Paste your wallet address at the Sui faucet. It’s free.", link: { href: "https://faucet.sui.io", label: "Open the faucet" } },
  { Illo: NoteLockIllustration, title: "Lock it, write why", body: "Pick an amount and a date, then say why it matters to you.", link: { href: "/promise/new", label: "Start a promise" } },
  { Illo: WaitWordsIllustration, title: "Try to leave early", body: "A timer starts, and you read your own words before you decide.", link: { href: "/story", label: "See Maya’s story" } },
];

/** What a first-time user needs to do, in order, with the real links. */
export function Onboarding({ showConnect = true }: { showConnect?: boolean }) {
  return (
    <div className="stack onboarding">
      <ol className="onbSteps">
        {STEPS.map(({ Illo, title, body, link }, i) => (
          <li key={title} className="onbStep fade-in" style={{ animationDelay: `${i * 0.06}s` }}>
            <div className="onbArt"><Illo /></div>
            <p className="eyebrow">Step {i + 1}</p>
            <h3>{title}</h3>
            <p className="onbBody">{body}</p>
            {link.href.startsWith("http") ? <a className="onbLink" href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a> : <a className="onbLink" href={link.href}>{link.label} →</a>}
          </li>
        ))}
      </ol>
      {showConnect && (
        <div className="onbConnect">
          <ConnectButton />
          <p className="faint">Have a wallet with test SUI? Connect it to start your promise.</p>
        </div>
      )}
    </div>
  );
}
