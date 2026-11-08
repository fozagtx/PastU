"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Transaction } from "@mysten/sui/transactions";
import { api } from "./api";
import { NETWORK } from "./config";
import { fetchVault, VAULT_TYPE_SUFFIX, type VaultState } from "./vault";

// Loosely-typed handle on the dapp-kit instance (it is created lazily, client-side only).
type Kit = {
  stores: { $connection: { get(): ConnState; subscribe(cb: (c: ConnState) => void): () => void } };
  signPersonalMessage(a: { message: Uint8Array }): Promise<{ bytes: string; signature: string }>;
  signAndExecuteTransaction(a: { transaction: Transaction }): Promise<{ Transaction?: { digest: string }; FailedTransaction?: { digest?: string; status?: { error?: { message?: string } } } }>;
  getClient(): RpcClient;
};
type ConnState = { isConnected: boolean; account: { address: string } | null };
type RpcClient = {
  getObject: (a: { id: string; options: { showContent: boolean } }) => Promise<unknown>;
  core: { waitForTransaction(a: { digest: string; include: { effects: boolean; objectTypes: boolean } }): Promise<unknown> };
};

let readClient: RpcClient | undefined;

export interface TxOutcome { digest: string; createdVaultId?: string }

interface WalletCtx {
  kit: Kit | null;
  ready: boolean;
  address: string | null;
  /** Sign in with a wallet message -> POST /api/auth. Cached per address for the tab. */
  ensureAuth(): Promise<void>;
  run(tx: Transaction): Promise<TxOutcome>;
  readVault(id: string): Promise<VaultState>;
}
const Ctx = createContext<WalletCtx | null>(null);
export const useWallet = () => { const c = useContext(Ctx); if (!c) throw new Error("WalletProvider missing"); return c; };

export function WalletProvider({ children }: { children: ReactNode }) {
  const [kit, setKit] = useState<Kit | null>(null);
  const [address, setAddress] = useState<string | null>(null);
  const authed = useRef<Record<string, Promise<void>>>({});

  useEffect(() => {
    let unsub: (() => void) | undefined; let dead = false;
    (async () => {
      const [{ createDAppKit }, { SuiJsonRpcClient, getJsonRpcFullnodeUrl }] = await Promise.all([
        import("@mysten/dapp-kit-core"), import("@mysten/sui/jsonRpc"),
      ]);
      await import("@mysten/dapp-kit-core/web"); // registers <mysten-dapp-kit-connect-button>
      if (dead) return;
      const k = createDAppKit({
        networks: [NETWORK],
        defaultNetwork: NETWORK,
        createClient: (network: string) => new SuiJsonRpcClient({ network: network as typeof NETWORK, url: getJsonRpcFullnodeUrl(network as typeof NETWORK) }),
      } as never) as unknown as Kit;
      setKit(k);
      unsub = k.stores.$connection.subscribe((c) => setAddress(c.isConnected && c.account ? c.account.address : null));
    })().catch((e) => console.error("wallet init failed", e));
    return () => { dead = true; unsub?.(); };
  }, []);

  const ensureAuth = useCallback(async () => {
    if (!kit || !address) throw new Error("Connect your wallet first.");
    if (!authed.current[address]) {
      const p = (async () => {
        const message = `Sign in to Past You\nAddress: ${address}\nIssued: ${new Date().toISOString()}\nNonce: ${crypto.randomUUID()}`;
        const { signature } = await kit.signPersonalMessage({ message: new TextEncoder().encode(message) });
        await api.auth({ address, message, signature });
      })();
      authed.current[address] = p;
      p.catch(() => { delete authed.current[address]; });
    }
    return authed.current[address];
  }, [kit, address]);

  const run = useCallback(async (tx: Transaction): Promise<TxOutcome> => {
    if (!kit) throw new Error("Wallet not ready.");
    const res = await kit.signAndExecuteTransaction({ transaction: tx });
    if (res.FailedTransaction) throw new Error(res.FailedTransaction.status?.error?.message || "The transaction did not go through.");
    const digest = res.Transaction!.digest;
    let createdVaultId: string | undefined;
    try {
      const done = (await kit.getClient().core.waitForTransaction({ digest, include: { effects: true, objectTypes: true } })) as {
        Transaction?: { effects?: { changedObjects: { objectId: string; idOperation: string }[] }; objectTypes?: Record<string, string> };
      };
      const t = done.Transaction;
      createdVaultId = t?.effects?.changedObjects.find((o) => o.idOperation === "Created" && t.objectTypes?.[o.objectId]?.includes(VAULT_TYPE_SUFFIX))?.objectId;
    } catch { /* non-fatal */ }
    return { digest, createdVaultId };
  }, [kit]);

  const readVault = useCallback(async (id: string) => {
    // Reads don't need a wallet: use a plain RPC client.
    const { SuiJsonRpcClient, getJsonRpcFullnodeUrl } = await import("@mysten/sui/jsonRpc");
    readClient ??= new SuiJsonRpcClient({ network: NETWORK, url: getJsonRpcFullnodeUrl(NETWORK) }) as unknown as RpcClient;
    return fetchVault(readClient, id);
  }, []);

  const value = useMemo(() => ({ kit, ready: !!kit, address, ensureAuth, run, readVault }), [kit, address, ensureAuth, run, readVault]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}
