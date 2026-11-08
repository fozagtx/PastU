import { z } from "zod";
import { handle, json, parseBody } from "../../../../../lib/server/http";
import { requireOwnsAttempt } from "../../../../../lib/server/session";
import { recordDecision } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";
import type { DecisionResp } from "../../../../../lib/types";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
const Body = z.object({
  result: z.enum(["held", "exited"]), exitTx: z.string().min(20).max(100).optional(),
  withdrawReason: z.string().trim().max(1200).optional(), plan: z.string().trim().max(300).optional(),
});

export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise, attempt } = await requireOwnsAttempt(req, id);
  const b = await parseBody(req, Body);
  const r = await recordDecision(await getMemoryStore(address), promise, attempt, b.result, b.exitTx, { withdrawReason: b.withdrawReason, plan: b.plan });
  return json({ ok: true, result: b.result, ...r } satisfies DecisionResp);
});
