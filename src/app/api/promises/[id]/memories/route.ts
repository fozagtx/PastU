import { handle, json } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { listMemories } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = requireOwnsPromise(req, id);
  return json(await listMemories(getMemoryStore(address), promise.namespace));
});
