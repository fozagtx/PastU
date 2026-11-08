import { z } from "zod";
import { handle, json, parseBody } from "../../../lib/server/http";
import { requireSession } from "../../../lib/server/session";
import { deleteAccountKey, ensureAccount } from "../../../lib/server/accounts";

export const runtime = "nodejs";
const Body = z.object({ accountId: z.string().regex(/^0x[0-9a-fA-F]{1,64}$/).optional() }).default({});

export const POST = handle(async (req: Request) => {
  const address = requireSession(req);
  const text = await req.text();
  const body = text.trim() ? await parseBody(new Request(req.url, { method: "POST", body: text }), Body) : {};
  return json(await ensureAccount(address, body.accountId));
});

export const DELETE = handle(async (req: Request) => {
  await deleteAccountKey(requireSession(req));
  return json({ ok: true });
});
