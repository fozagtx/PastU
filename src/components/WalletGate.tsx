"use client";
import type { ReactNode } from "react";
import { useWallet } from "@/lib/client/wallet";

export function WalletGate({ children }: { children: ReactNode }) {
  const { address, ready } = useWallet();
  if (!address) {
    return (
      <div className="page stack" style={{ paddingTop: "3rem" }}>
        <h1>Connect your wallet</h1>
        <p className="muted">{ready ? "Use the button at the top of the page to connect. Your wallet is how Past You knows these words are yours." : "Looking for wallets…"}</p>
      </div>
    );
  }
  return <>{children}</>;
}
