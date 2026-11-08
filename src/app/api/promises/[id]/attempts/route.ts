import { z } from "zod";
import { handle, json, parseBody } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { createAttempt } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ urge: z.string().trim().min(1).max(2000) });

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  const body = await parseBody(req, Body);
  return json(await createAttempt(await getMemoryStore(address), promise, body.urge), 201);
});
