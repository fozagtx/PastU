import { handle, json } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { assemblePastYou, resolveAttemptForPastYou } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

/** ?attempt=<attemptId> optional; defaults to the latest open attempt. */
export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  const attempt = await resolveAttemptForPastYou(id, new URL(req.url).searchParams.get("attempt"));
  return json(await assemblePastYou(await getMemoryStore(address), promise, attempt));
});
