"use client";
import type { ReactNode } from "react";
import { useWallet } from "@/lib/client/wallet";
import { Onboarding } from "./Onboarding";

/** Not connected yet: show how to get started instead of a bare "connect your wallet". */
export function WalletGate({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  if (!address) {
    return (
      <div className="page wide stack fade-in" style={{ paddingTop: "1.25rem" }}>
        <header className="stack stack-sm" style={{ textAlign: "center", justifyItems: "center" }}>
          <p className="eyebrow">Before your first promise</p>
          <h1 style={{ fontSize: "clamp(1.9rem, 3.4vw, 2.6rem)" }}>Here’s how it works</h1>
        </header>
        <Onboarding />
      </div>
    );
  }
  return <>{children}</>;
}
