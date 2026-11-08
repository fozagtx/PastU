import { getDb, type PromiseRow } from "./db";
import { hmac, safeEqual } from "./crypto";
import { HttpError } from "./http";

export const COOKIE = "pastyou_session";
export const SESSION_TTL_S = 7 * 24 * 3600;

export function mintSession(address: string, nowMs = Date.now()): { token: string; expiresAt: number } {
  const expiresAt = nowMs + SESSION_TTL_S * 1000;
  const payload = Buffer.from(JSON.stringify({ a: address, e: expiresAt })).toString("base64url");
  return { token: `${payload}.${hmac(payload)}`, expiresAt };
}

export function verifySession(token: string | undefined, nowMs = Date.now()): string | null {
  if (!token) return null;
  const [payload, sig] = token.split(".");
  if (!payload || !sig || !safeEqual(sig, hmac(payload))) return null;
  try {
    const { a, e } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { a: string; e: number };
    return typeof a === "string" && typeof e === "number" && e > nowMs ? a : null;
  } catch { return null; }
}

function cookieFrom(req: Request, name: string): string | undefined {
  const h = req.headers.get("cookie");
  if (!h) return undefined;
  for (const part of h.split(";")) {
    const i = part.indexOf("=");
    if (i > 0 && part.slice(0, i).trim() === name) return decodeURIComponent(part.slice(i + 1).trim());
  }
  return undefined;
}

/** Returns the signed-in Sui address or throws 401. */
export function requireSession(req: Request): string {
  const a = verifySession(cookieFrom(req, COOKIE));
  if (!a) throw new HttpError(401, "Not signed in");
  return a;
}

/** 404 (not 403) for other people's promises so ids don't leak. */
export async function requireOwnsPromise(req: Request, promiseId: string): Promise<{ address: string; promise: PromiseRow }> {
  const address = requireSession(req);
  const promise = await getDb().get<PromiseRow>("SELECT * FROM promises WHERE id = ?", [promiseId]);
  if (!promise || promise.owner !== address) throw new HttpError(404, "Promise not found");
  return { address, promise };
}

export function sessionCookieHeader(token: string): string {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${SESSION_TTL_S}${secure}`;
}
export const clearCookieHeader = () => `${COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;

import type { AttemptRow } from "./db";
export async function requireOwnsAttempt(req: Request, attemptId: string): Promise<{ address: string; promise: PromiseRow; attempt: AttemptRow }> {
  const address = requireSession(req);
  const db = getDb();
  const attempt = await db.get<AttemptRow>("SELECT * FROM attempts WHERE id = ?", [attemptId]);
  const promise = attempt && (await db.get<PromiseRow>("SELECT * FROM promises WHERE id = ?", [attempt.promise_id]));
  if (!attempt || !promise || promise.owner !== address) throw new HttpError(404, "Attempt not found");
  return { address, promise, attempt };
}
