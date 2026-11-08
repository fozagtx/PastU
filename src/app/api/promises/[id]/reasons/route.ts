import { z } from "zod";
import { handle, json, parseBody } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { addReason } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ text: z.string().trim().min(1).max(2000), kind: z.enum(["promise", "checkin"]).default("promise") });

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = requireOwnsPromise(req, id);
  const body = await parseBody(req, Body);
  return json(await addReason(getMemoryStore(address), promise.namespace, body.text, body.kind), 201);
});
