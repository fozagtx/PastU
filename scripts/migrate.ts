// Applies db/schema.sql over the DIRECT (unpooled) connection. Usage: `npm run migrate`.
import fs from "node:fs";
import path from "node:path";
import { Client } from "pg";

(async () => {
  const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
  if (!url) { console.log("SKIP migrate: no DATABASE_URL_UNPOOLED or DATABASE_URL"); return; }
  const c = new Client({ connectionString: url });
  await c.connect();
  try {
    await c.query(fs.readFileSync(path.join(process.cwd(), "db", "schema.sql"), "utf8"));
    const t = await c.query("SELECT table_name FROM information_schema.tables WHERE table_schema='public' ORDER BY 1");
    console.log("migrated; tables:", t.rows.map((r) => r.table_name).join(", "));
  } finally { await c.end(); }
})().catch((e) => { console.error("migrate failed:", e.message); process.exit(1); });
