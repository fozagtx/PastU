import { NextResponse } from "next/server";
import { ZodError, type ZodTypeAny, type z } from "zod";

export class HttpError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export function json(data: unknown, init?: number | ResponseInit) {
  return NextResponse.json(data, typeof init === "number" ? { status: init } : init);
}

export async function parseBody<S extends ZodTypeAny>(req: Request, schema: S): Promise<z.infer<S>> {
  let raw: unknown;
  try { raw = await req.json(); } catch { throw new HttpError(400, "Body must be JSON"); }
  return schema.parse(raw);
}

/** Wrap a route handler: maps HttpError/ZodError to JSON errors, hides internals. */
export function handle<A extends unknown[]>(fn: (...a: A) => Promise<Response>) {
  return async (...a: A): Promise<Response> => {
    try {
      return await fn(...a);
    } catch (e) {
      if (e instanceof HttpError) return json({ error: e.message }, e.status);
      if (e instanceof ZodError) return json({ error: "Invalid request", issues: e.issues.map((i) => ({ path: i.path.join("."), message: i.message })) }, 400);
      console.error("[api]", e);
      return json({ error: "Internal error" }, 500);
    }
  };
}
