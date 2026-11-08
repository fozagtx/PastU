"use client";
import { ConnectButton } from "./ConnectButton";
import { FaucetIllustration, NoteLockIllustration, WaitWordsIllustration, WalletIllustration } from "./Illustrations";

const STEPS = [
  { Illo: WalletIllustration, title: "Get a Sui wallet", body: "Install Slush, a free Sui wallet. In its settings, switch the network to Testnet.", link: { href: "https://slush.app", label: "Get Slush" } },
  { Illo: FaucetIllustration, title: "Add free test SUI", body: "Testnet coins cost nothing. Copy your wallet address and ask the Sui faucet for some.", link: { href: "https://faucet.sui.io", label: "Open the faucet" } },
  { Illo: NoteLockIllustration, title: "Lock it and write why", body: "Pick an amount, an unlock date and how long an early exit makes you wait. Then write one sentence about why it matters." },
  { Illo: WaitWordsIllustration, title: "If you try to leave early", body: "A timer starts. While it runs, you read what you wrote. Then you keep your promise, or withdraw when it ends." },
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
            {link && <a className="onbLink" href={link.href} target="_blank" rel="noreferrer">{link.label} ↗</a>}
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
