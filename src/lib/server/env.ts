// Central env access. Read lazily so tests can mutate process.env.
export const env = {
  get dbPath() { return process.env.DB_PATH || "./data/pastyou.db"; },
  get sessionSecret() { return secret("SESSION_SECRET"); },
  get delegateKeySecret() { return secret("DELEGATE_KEY_SECRET"); },
  get relayerUrl() { return process.env.MEMWAL_RELAYER_URL || ""; },
  get memoryMode(): "fake" | "real" {
    if (process.env.MEMORY_MODE === "fake") return "fake";
    if (process.env.MEMORY_MODE === "real") return "real";
    return process.env.MEMWAL_RELAYER_URL ? "real" : "fake";
  },
  get nebiusKey() { return process.env.NEBIUS_API_KEY || ""; },
  get nebiusModel() { return process.env.NEBIUS_MODEL || ""; },
  get nebiusBase() { return process.env.NEBIUS_BASE_URL || "https://api.tokenfactory.nebius.com/v1/"; },
  get tatumKey() { return process.env.TATUM_API_KEY || ""; },
  /** Chain the vault lives on. Walrus Memory blobs stay on mainnet regardless (hosted relayer). */
  get network(): "mainnet" | "testnet" { return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet"; },
  get tatumUrl() { return process.env.TATUM_GRPC_URL || `https://sui-${this.network}-grpc.gateway.tatum.io`; },
  get walrusAggregator() { return process.env.WALRUS_AGGREGATOR_URL || "https://aggregator.walrus-mainnet.walrus.space"; },
};

function secret(name: string): string {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === "production" && process.env.MEMORY_MODE !== "fake") {
    throw new Error(`${name} is required in production`);
  }
  return `dev-insecure-${name}`;
}
