"use client";
import type { ReactNode } from "react";
import { useWallet } from "@/lib/client/wallet";

export function WalletGate({ children }: { children: ReactNode }) {
  const { address, ready } = useWallet();
  if (!address) {
    return (
      <div className="page walletGate stack fade-in" style={{ textAlign: "center", justifyItems: "center" }}>
        <p className="eyebrow">Sign in</p>
        <h1 className="display" style={{ fontSize: "clamp(2.2rem, 7vw, 3.6rem)" }}>Connect a Sui wallet</h1>
        <p className="lede">{ready ? "Use the Connect Wallet button at the top. Your wallet is how we know which promises are yours. No email, no password." : "Looking for wallets…"}</p>
      </div>
    );
  }
  return <>{children}</>;
}
