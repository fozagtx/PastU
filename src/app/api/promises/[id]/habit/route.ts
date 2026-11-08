import { z } from "zod";
import { handle, HttpError, json, parseBody } from "../../../../../lib/server/http";
import { requireOwnsPromise } from "../../../../../lib/server/session";
import { getDb } from "../../../../../lib/server/db";
import { recordHabitCheck } from "../../../../../lib/server/service";
import { getMemoryStore } from "../../../../../lib/server/accounts";
import { checkHabitDigest } from "../../../../../lib/server/tatum";

export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };

const Set = z.object({ weeklyAmount: z.number().positive(), weekday: z.number().int().min(0).max(6) });
const Check = z.object({ week: z.number().int().min(1).max(520), digest: z.string().min(20).max(100), note: z.string().trim().max(1000).optional() });

/** Configure the weekly habit. */
export const PUT = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  await requireOwnsPromise(req, id);
  const b = await parseBody(req, Set);
  await getDb().run(`INSERT INTO habits(id, promise_id, weekly_amount, weekday) VALUES (?,?,?,?)
    ON CONFLICT(promise_id) DO UPDATE SET weekly_amount = excluded.weekly_amount, weekday = excluded.weekday`,
    [`h-${id}`, id, b.weeklyAmount, b.weekday]);
  return json({ ok: true, ...b });
});

/** Record a weekly check from a deposit digest (best effort via Tatum). */
export const POST = handle(async (req: Request, ctx: Ctx) => {
  const { id } = await ctx.params;
  const { address, promise } = await requireOwnsPromise(req, id);
  const b = await parseBody(req, Check);
  const habit = await getDb().get<{ weekly_amount: number }>("SELECT weekly_amount FROM habits WHERE promise_id = ?", [id]);
  if (!habit) throw new HttpError(409, "Set a weekly habit first (PUT)");
  const result = await checkHabitDigest(address, b.digest, promise.coin_type, habit.weekly_amount);
  const w = await recordHabitCheck(await getMemoryStore(address), promise, b.week, result, b.note);
  return json({ ok: true, week: b.week, result, blobId: w.blobId });
});
