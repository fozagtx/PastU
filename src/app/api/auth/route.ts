import { z } from "zod";
import { verifyPersonalMessageSignature } from "@mysten/sui/verify";
import { SuiGrpcClient } from "@mysten/sui/grpc";
import { env } from "../../../lib/server/env";
import type { AuthResp } from "../../../lib/types";
import { handle, HttpError, json, parseBody } from "../../../lib/server/http";
import { clearCookieHeader, mintSession, sessionCookieHeader } from "../../../lib/server/session";
import { upsertUser } from "../../../lib/server/accounts";

export const runtime = "nodejs";
const Body = z.object({ address: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/), message: z.string().min(1).max(2000), signature: z.string().min(1).max(2000) });
const MAX_AGE_MS = 10 * 60 * 1000;

// zkLogin (e.g. Slush with Google) and passkey signatures are verified against the network, so the verifier needs a client.
let suiClient: SuiGrpcClient | undefined;
const client = () => (suiClient ??= new SuiGrpcClient({ network: env.network, baseUrl: `https://fullnode.${env.network}.sui.io:443` }));

export const POST = handle(async (req: Request) => {
  const body = await parseBody(req, Body);
  // Optional replay guard: if the message carries "Issued: <ISO date>", it must be recent.
  const issued = /Issued:\s*(\S+)/.exec(body.message)?.[1];
  if (issued) {
    const t = Date.parse(issued);
    if (!Number.isFinite(t) || Math.abs(Date.now() - t) > MAX_AGE_MS) throw new HttpError(401, "Sign-in message expired");
  }
  try {
    await verifyPersonalMessageSignature(new TextEncoder().encode(body.message), body.signature, { address: body.address, client: client() });
  } catch (e) {
    console.error("auth: signature verification failed", { address: body.address, scheme: body.signature.slice(0, 4), error: (e as Error).message });
    throw new HttpError(401, "Invalid signature");
  }
  await upsertUser(body.address);
  const { token, expiresAt } = mintSession(body.address);
  const res = json({ address: body.address, expiresAt: new Date(expiresAt).toISOString() } satisfies AuthResp);
  res.headers.append("set-cookie", sessionCookieHeader(token));
  return res;
});

export const DELETE = handle(async () => {
  const res = json({ ok: true });
  res.headers.append("set-cookie", clearCookieHeader());
  return res;
});
