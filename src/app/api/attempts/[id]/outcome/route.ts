import { z } from "zod";
import { handle, json, parseBody } from "../../../../../lib/server/http";
import { requireOwnsAttempt } from "../../../../../lib/server/session";
import { recordOutcome } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";
import type { OutcomeResp } from "../../../../../lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({ felt: z.enum(["regret", "fine"]) });

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise, attempt } = await requireOwnsAttempt(req, id);
  const b = await parseBody(req, Body);
  const r = await recordOutcome(await getMemoryStore(address), promise, attempt, b.felt);
  return json({ ok: true, ...r } satisfies OutcomeResp);
});
