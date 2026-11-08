// Non-secret, public endpoints. These are constants, not environment variables.
// Only secrets (API keys, signing secrets) belong in the environment.
export type Network = "mainnet" | "testnet";

/** Walrus Memory hosted relayer (Walrus Foundation). Testnet and Mainnet are separate. */
export const memwalRelayerUrl = (n: Network) => (n === "mainnet" ? "https://relayer.memory.walrus.xyz" : "https://relayer.dev.memwal.ai");
/** Dashboard where a Walrus Memory account ID and delegate key are created. */
export const memwalDashboardUrl = (n: Network) => (n === "mainnet" ? "https://memory.walrus.xyz" : "https://dev.memwal.ai");
export const walrusAggregatorUrl = (n: Network) => (n === "mainnet" ? "https://aggregator.walrus-mainnet.walrus.space" : "https://aggregator.walrus-testnet.walrus.space");
export const NEBIUS_BASE_URL = "https://api.tokenfactory.nebius.com/v1/";
/** Nebius model for urge labelling and reordering. */
export const NEBIUS_MODEL = "Qwen/Qwen3-30B-A3B-Instruct-2507";
/** Model used through the Neon AI Gateway when no Nebius key is set. */
export const NEON_AI_MODEL = "claude-haiku-5-5";
export const tatumGrpcUrl = (n: Network) => `https://sui-${n}-grpc.gateway.tatum.io`;
