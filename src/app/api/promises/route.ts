import { z } from "zod";
import { handle, json, parseBody } from "../../../lib/server/http";
import { requireSession } from "../../../lib/server/session";
import { getDb, type PromiseRow } from "../../../lib/server/db";
import { createPromise, toPromiseDTO } from "../../../lib/server/service";
import { getMemoryStore } from "../../../lib/server/accounts";

export const runtime = "nodejs";
const Body = z.object({
  vaultId: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/), coinType: z.string().min(3).max(300), reason: z.string().trim().min(1).max(2000),
});

export const GET = handle(async (req: Request) => {
  const address = requireSession(req);
  const rows = await getDb().all<PromiseRow>("SELECT * FROM promises WHERE owner = ? ORDER BY created_at DESC", [address]);
  return json(await Promise.all(rows.map(toPromiseDTO)));
});

export const POST = handle(async (req: Request) => {
  const address = requireSession(req);
  const body = await parseBody(req, Body);
  return json(await createPromise(await getMemoryStore(address), address, body), 201);
});
