import { COIN_DECIMALS } from "./config";

export function toBaseUnits(human: string | number): bigint {
  const s = String(human).trim();
  if (!/^\d*\.?\d*$/.test(s) || s === "" || s === ".") throw new Error("Enter a valid amount.");
  const [whole, frac = ""] = s.split(".");
  const padded = (frac + "0".repeat(COIN_DECIMALS)).slice(0, COIN_DECIMALS);
  return BigInt(whole || "0") * 10n ** BigInt(COIN_DECIMALS) + BigInt(padded || "0");
}

export function fromBaseUnits(v: bigint | number | string, maxFrac = 4): string {
  const n = BigInt(v);
  const base = 10n ** BigInt(COIN_DECIMALS);
  const whole = n / base;
  const frac = (n % base).toString().padStart(COIN_DECIMALS, "0").slice(0, maxFrac).replace(/0+$/, "");
  return frac ? `${whole}.${frac}` : `${whole}`;
}

export function fmtDate(iso: string | number | Date): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" });
}
export function fmtDateTime(ms: number): string {
  return new Date(ms).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function fmtDuration(ms: number): string {
  if (ms <= 0) return "0s";
  const s = Math.ceil(ms / 1000);
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  if (d) return `${d}d ${h}h ${m}m`;
  if (h) return `${h}h ${String(m).padStart(2, "0")}m ${String(sec).padStart(2, "0")}s`;
  if (m) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

export function shortId(id: string, n = 6): string {
  return id.length > n * 2 + 2 ? `${id.slice(0, n + 2)}…${id.slice(-n)}` : id;
}

export const triggerLabel: Record<string, string> = {
  loss: "a loss", payday: "payday", stress: "stress", boredom: "boredom", social: "something social", emergency: "an emergency", other: "something else",
};
