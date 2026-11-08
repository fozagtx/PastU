"use client";
import { useEffect, useRef } from "react";
import { useWallet } from "@/lib/client/wallet";

/** Hosts the dapp-kit <mysten-dapp-kit-connect-button> web component (created imperatively; no JSX typings needed). */
export function ConnectButton() {
  const host = useRef<HTMLDivElement>(null);
  const { kit } = useWallet();
  useEffect(() => {
    if (!kit || !host.current) return;
    const el = document.createElement("mysten-dapp-kit-connect-button") as HTMLElement & { instance?: unknown };
    el.instance = kit;
    host.current.replaceChildren(el);
    return () => el.remove();
  }, [kit]);
  return <div ref={host} aria-label="Wallet" style={{ minHeight: 40 }}>{!kit && <button className="btn quiet" disabled>Wallet…</button>}</div>;
}
