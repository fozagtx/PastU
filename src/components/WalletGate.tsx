"use client";
import type { ReactNode } from "react";
import { useWallet } from "@/lib/client/wallet";
import { Onboarding } from "./Onboarding";

/** Not connected yet: show how to get started instead of a bare "connect your wallet". */
export function WalletGate({ children }: { children: ReactNode }) {
  const { address } = useWallet();
  if (!address) {
    return (
      <div className="page wide centerPage fade-in">
        <h1 className="centerTitle">Before your first promise</h1>
        <Onboarding />
      </div>
    );
  }
  return <>{children}</>;
}
