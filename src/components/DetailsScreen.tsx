"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client/api";
import { errMsg } from "@/lib/client/hooks";
import { MEMWAL_DASHBOARD, NETWORK, VAULT_PACKAGE_ID } from "@/lib/client/config";
import { memwalRelayerUrl } from "@/lib/config";
import { useWallet } from "@/lib/client/wallet";
import type { AccountResp } from "@/lib/types";
import { CopyField } from "./CopyField";
import { WalletGate } from "./WalletGate";

export function DetailsScreen() { return <WalletGate><Inner /></WalletGate>; }

function Inner() {
  const { address, ensureAuth } = useWallet();
  const [acct, setAcct] = useState<AccountResp | null>(null);
  const [accountId, setAccountId] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function load(id?: string) {
    setErr(null); setBusy(true);
    try { await ensureAuth(); const a = await api.account(id); setAcct(a); if (a.accountId) setAccountId(a.accountId); }
    catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [address]);

  const chain = NETWORK === "mainnet" ? "mainnet" : "testnet";
  return (
    <div className="page stack stack-lg fade-in" style={{ paddingTop: "1.5rem" }}>
      <header className="stack stack-sm">
        <p className="eyebrow">Details</p>
        <h1>Your agent and accounts</h1>
        <p className="muted">The IDs behind your promises. Copy any of them. Nothing here is secret: the agent’s private key never leaves the server.</p>
      </header>

      {err && <p className="error" role="alert">{err}</p>}

      <section className="card stack">
        <h2>Agent</h2>
        <p className="muted">Past You uses an agent key to read and write your memories on Walrus. Register this public key on your Walrus Memory account.</p>
        {acct ? (
          <>
            <CopyField label="Agent ID (delegate public key)" value={acct.delegatePublicKey} hint="Use this as the agent ID on the hackathon form, and as the public key when you add a delegate key." />
            <CopyField label="Agent Sui address" value={acct.delegateSuiAddress} />
          </>
        ) : <p className="muted">{busy ? "Creating your agent key…" : "Not loaded yet."}</p>}
      </section>

      <section className="card stack">
        <h2>Walrus Memory account</h2>
        <p className="muted">
          Create an account at <a href={MEMWAL_DASHBOARD} target="_blank" rel="noreferrer">{MEMWAL_DASHBOARD.replace("https://", "")}</a>, add the agent public key above as a delegate key, then paste the account ID here.
        </p>
        <div>
          <label htmlFor="acct">Account ID</label>
          <input id="acct" value={accountId} onChange={(e) => setAccountId(e.target.value.trim())} placeholder="0x…" spellCheck={false} />
        </div>
        <div className="row">
          <button className="btn" disabled={busy || !/^0x[0-9a-fA-F]{1,64}$/.test(accountId)} onClick={() => load(accountId)}>Save account ID</button>
          {acct?.accountId && <span className="pill">Connected</span>}
        </div>
      </section>

      <section className="card stack">
        <h2>Chain</h2>
        <CopyField label="Network" value={NETWORK} />
        {address && <CopyField label="Your wallet" value={address} />}
        <CopyField label="Vault contract (package ID)" value={VAULT_PACKAGE_ID || "Not set. Add NEXT_PUBLIC_VAULT_PACKAGE_ID."} />
        <CopyField label="Walrus Memory relayer" value={memwalRelayerUrl(chain)} />
      </section>
    </div>
  );
}
