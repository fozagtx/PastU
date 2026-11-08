"use client";
import type { ReactNode } from "react";
import { WalletProvider } from "@/lib/client/wallet";
export function Providers({ children }: { children: ReactNode }) {
  return <WalletProvider>{children}</WalletProvider>;
}
