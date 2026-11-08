import { handle, json } from "../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../lib/server/session";
import { listReasons, toPromiseDTO } from "../../../../lib/server/service";
import { getMemoryStore } from "../../../../lib/server/accounts";
import type { PromiseDetailDTO } from "../../../../lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  const reasons = await listReasons(await getMemoryStore(address), promise.namespace);
  return json({ ...(await toPromiseDTO(promise)), reasons } satisfies PromiseDetailDTO);
});
