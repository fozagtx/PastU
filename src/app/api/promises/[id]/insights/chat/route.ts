import { z } from "zod";
import { handle, json, parseBody } from "../../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../../lib/server/session";
import { buildInsights } from "../../../../../../lib/server/service";
import { answerQuestion } from "../../../../../../lib/server/chat";
import { getMemoryStore } from "../../../../../../lib/server/accounts";
import type { InsightsChatResp } from "../../../../../../lib/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
type Ctx = { params: Promise<{ id: string }> };

const Message = z.object({ role: z.enum(["user", "assistant"]), content: z.string().trim().min(1).max(2000) });
const Body = z.object({ messages: z.array(Message).min(1).max(20) });

/**
 * Ask about your own words. Nebius only picks which stored quotes fit;
 * the answer is assembled server-side from verbatim quotes. No new facts are invented.
 */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  const b = await parseBody(req, Body);
  const lastUser = [...b.messages].reverse().find((m) => m.role === "user");
  if (!lastUser) return json({ error: "At least one user message is required" }, 400);

  const insights = await buildInsights(await getMemoryStore(address), promise);
  const { answer } = await answerQuestion(insights, lastUser.content);
  return json({ answer } satisfies InsightsChatResp);
});
