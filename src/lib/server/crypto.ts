import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import { env } from "./env";

const key = () => createHash("sha256").update(env.delegateKeySecret).digest();

/** AES-256-GCM. Output: base64(iv[12] | tag[16] | ciphertext). */
export function encryptSecret(plain: string, secretKey: Buffer = key()): string {
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", secretKey, iv);
  const ct = Buffer.concat([c.update(plain, "utf8"), c.final()]);
  return Buffer.concat([iv, c.getAuthTag(), ct]).toString("base64");
}

export function decryptSecret(blob: string, secretKey: Buffer = key()): string {
  const raw = Buffer.from(blob, "base64");
  if (raw.length < 29) throw new Error("ciphertext too short");
  const d = createDecipheriv("aes-256-gcm", secretKey, raw.subarray(0, 12));
  d.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([d.update(raw.subarray(28)), d.final()]).toString("utf8");
}

export function hmac(data: string, secretStr: string = env.sessionSecret): string {
  return createHmac("sha256", secretStr).update(data).digest("base64url");
}

export function safeEqual(a: string, b: string): boolean {
  const x = Buffer.from(a), y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
