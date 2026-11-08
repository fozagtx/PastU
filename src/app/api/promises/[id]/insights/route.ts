import { handle, json } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { buildInsights } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** Dashboard data: saving reasons beside every attempt, plus Tatum findings. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  return json(await buildInsights(await getMemoryStore(address), promise));
});
