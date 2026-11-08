// Public (browser-visible) configuration. Everything here comes from NEXT_PUBLIC_* env vars.
export const NETWORK = (process.env.NEXT_PUBLIC_SUI_NETWORK || "testnet") as "mainnet" | "testnet" | "devnet" | "localnet";
export const VAULT_PACKAGE_ID = process.env.NEXT_PUBLIC_VAULT_PACKAGE_ID || "";
export const COIN_TYPE = process.env.NEXT_PUBLIC_COIN_TYPE || "0x2::sui::SUI";
export const COIN_SYMBOL = process.env.NEXT_PUBLIC_COIN_SYMBOL || (COIN_TYPE === "0x2::sui::SUI" ? "SUI" : "COIN");
export const COIN_DECIMALS = Number(process.env.NEXT_PUBLIC_COIN_DECIMALS || 9);
/** Max total in one vault, in human units (e.g. 10 = 10 SUI). Demo-grade safety cap. */
export const DEPOSIT_CAP = Number(process.env.NEXT_PUBLIC_DEPOSIT_CAP || 10);
export const WALRUS_AGGREGATOR = process.env.NEXT_PUBLIC_WALRUS_AGGREGATOR || "https://aggregator.walrus-mainnet.walrus.space";
export const EXPLORER_TX = (digest: string) => `https://suiscan.xyz/${NETWORK}/tx/${digest}`;
export const walrusBlobUrl = (blobId: string) => `${WALRUS_AGGREGATOR}/v1/blobs/${encodeURIComponent(blobId)}`;
export const CLOCK_ID = "0x6";
