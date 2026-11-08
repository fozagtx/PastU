import { handle, json } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { getVault, listBalances, tatumConfigured } from "../../../../../lib/server/tatum";
import { isFakeMemory } from "../../../../../lib/server/memory";
import type { ChainDTO } from "../../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

export const GET = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  if (!tatumConfigured()) {
    const out: ChainDTO = { vault: null, balances: [], source: isFakeMemory() ? "mock" : "unavailable", error: "TATUM_API_KEY not configured" };
    return json(out);
  }
  try {
    const [vault, balances] = await Promise.all([
      promise.current_vault_id ? getVault(promise.current_vault_id) : Promise.resolve(null),
      listBalances(address),
    ]);
    return json({ vault, balances, source: "tatum" } satisfies ChainDTO);
  } catch (e) {
    return json({ vault: null, balances: [], source: "unavailable", error: "Chain data unavailable" } satisfies ChainDTO);
  }
});
