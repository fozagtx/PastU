import { memwalRelayerUrl, walrusAggregatorUrl, NEBIUS_BASE_URL, NEBIUS_MODEL, NEON_AI_MODEL, tatumGrpcUrl } from "../config";

// Central env access (secrets only; public URLs live in ../config). Read lazily so tests can mutate process.env.
export const env = {
  get databaseUrl() { return process.env.DATABASE_URL || ""; },
  get sessionSecret() { return secret("SESSION_SECRET"); },
  get delegateKeySecret() { return secret("DELEGATE_KEY_SECRET"); },
  get relayerUrl() { return memwalRelayerUrl(this.network); },
  get memoryMode(): "fake" | "real" {
    return process.env.MEMORY_MODE === "fake" ? "fake" : "real";
  },
  get nebiusKey() { return process.env.NEBIUS_API_KEY || ""; },
  get neonAiModel() { return NEON_AI_MODEL; },
  get nebiusModel() { return NEBIUS_MODEL; },
  get nebiusBase() { return NEBIUS_BASE_URL; },
  get neonAiToken() { return process.env.NEON_AI_GATEWAY_TOKEN || ""; },
  get neonAiBase() { return (process.env.NEON_AI_GATEWAY_BASE_URL || "").replace(/\/+$/, ""); },
  /** One shared Walrus Memory agent for the whole app (demo mode). Both must be set to take effect. */
  get memwalPrivateKey() { return process.env.MEMWAL_PRIVATE_KEY || ""; },
  get memwalAccountId() { return process.env.MEMWAL_ACCOUNT_ID || ""; },
  get tatumKey() { return process.env.TATUM_API_KEY || ""; },
  /** Chain the vault lives on. Walrus Memory blobs stay on mainnet regardless (hosted relayer). */
  get network(): "mainnet" | "testnet" { return process.env.NEXT_PUBLIC_SUI_NETWORK === "mainnet" ? "mainnet" : "testnet"; },
  get tatumUrl() { return tatumGrpcUrl(this.network); },
  get walrusAggregator() { return walrusAggregatorUrl(this.network); },
};

function secret(name: string): string {
  const v = process.env[name];
  if (v) return v;
  if (process.env.NODE_ENV === "production" && process.env.MEMORY_MODE !== "fake") {
    throw new Error(`${name} is required in production`);
  }
  return `dev-insecure-${name}`;
}
