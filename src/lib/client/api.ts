import type {
  AttemptBody, AttemptResp, AuthBody, AuthResp, CreatePromiseBody, CreatePromiseResp, DecisionBody, DecisionResp, MemoryItemDTO, OutcomeBody, OutcomeResp,
  PastYouDTO, PromiseDetailDTO, Reason,
} from "../types";

/** Single place to adjust endpoint paths. */
export const ROUTES = {
  auth: () => `/api/auth`,
  promises: () => `/api/promises`,
  promise: (id: string) => `/api/promises/${enc(id)}`,
  reasons: (id: string) => `/api/promises/${enc(id)}/reasons`,
  attempts: (id: string) => `/api/promises/${enc(id)}/attempts`,
  pastYou: (id: string, a: string) => `/api/promises/${enc(id)}/past-you?attempt=${enc(a)}`,
  decision: (a: string) => `/api/attempts/${enc(a)}/decision`,
  outcome: (a: string) => `/api/attempts/${enc(a)}/outcome`,
  memories: (id: string) => `/api/promises/${enc(id)}/memories`,
  account: () => `/api/account`,
};
const enc = encodeURIComponent;

export class ApiError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

async function call<T>(method: string, url: string, body?: unknown): Promise<T> {
  const res = await fetch(url, {
    method, credentials: "same-origin",
    headers: body !== undefined ? { "content-type": "application/json" } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  let data: unknown = null;
  const text = await res.text();
  try { data = text ? JSON.parse(text) : null; } catch { /* non-json */ }
  if (!res.ok) {
    const msg = (data && typeof data === "object" && "error" in data && typeof (data as { error: unknown }).error === "string")
      ? (data as { error: string }).error : `Request failed (${res.status})`;
    throw new ApiError(res.status, msg);
  }
  return data as T;
}

export const api = {
  auth: (b: AuthBody) => call<AuthResp>("POST", ROUTES.auth(), b),
  createPromise: async (b: CreatePromiseBody) => (await call<CreatePromiseResp>("POST", ROUTES.promises(), b)).promise,
  getPromise: (id: string) => call<PromiseDetailDTO>("GET", ROUTES.promise(id)),
  addReason: (id: string, text: string) => call<Reason>("POST", ROUTES.reasons(id), { text, kind: "promise" }),
  startAttempt: (id: string, b: AttemptBody) => call<AttemptResp>("POST", ROUTES.attempts(id), b),
  getPastYou: (id: string, a: string) => call<PastYouDTO>("GET", ROUTES.pastYou(id, a)),
  decide: (_id: string, a: string, b: DecisionBody) => call<DecisionResp>("POST", ROUTES.decision(a), b),
  outcome: (_id: string, a: string, b: OutcomeBody) => call<OutcomeResp>("POST", ROUTES.outcome(a), b),
  listMemories: (id: string) => call<MemoryItemDTO[]>("GET", ROUTES.memories(id)),
  /** Revokes Past You's delegate key for this account (all memories, not one). */
  revokeAccess: () => call<{ ok: boolean }>("DELETE", ROUTES.account()),
};
