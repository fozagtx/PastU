"use client";
import { useCallback, useEffect, useState } from "react";
import type { PromiseDetailDTO } from "../types";
import { api } from "./api";
import { errMsg } from "./hooks";
import { useWallet } from "./wallet";
import type { VaultState } from "./vault";

export function usePromiseData(id: string, pollMs = 0) {
  const { readVault, address } = useWallet();
  const [promise, setPromise] = useState<PromiseDetailDTO | null>(null);
  const [vault, setVault] = useState<VaultState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [vaultError, setVaultError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    try {
      const p = await api.getPromise(id);
      setPromise(p); setError(null);
      if (p.currentVaultId) {
        try { setVault(await readVault(p.currentVaultId)); setVaultError(null); } catch (e) { setVaultError(errMsg(e)); }
      } else setVault(null);
    } catch (e) { setError(errMsg(e)); } finally { setLoading(false); }
  }, [id, readVault]);

  useEffect(() => { if (address) void refresh(); }, [address, refresh]);
  useEffect(() => { if (!pollMs || !address) return; const t = setInterval(() => void refresh(), pollMs); return () => clearInterval(t); }, [pollMs, address, refresh]);

  return { promise, vault, error, vaultError, loading, refresh };
}
