#!/usr/bin/env node
/**
 * Postgres migrate.
 *
 *   DATABASE_URL=postgres://… npm run db:migrate
 *
 * - Pehli baar: `database/schema.sql` (poora design schema) apply hota hai.
 * - Uske baad `database/migrations/*.sql` order se chalti hain, har ek ek baar
 *   (`schema_migrations` table me record).
 * - DATABASE_URL nahi hai to script chup-chaap skip karti hai (local dev/tests
 *   JSON store par chalte hain), `--require` ke saath fail hoti hai.
 */
import fs from "node:fs";
import path from "node:path";
import pg from "pg";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const DATABASE_URL = process.env.DATABASE_URL ?? "";
const required = process.argv.includes("--require");

if (!DATABASE_URL) {
  console.log("[db:migrate] DATABASE_URL set nahi hai — skip (local JSON store).");
  process.exit(required ? 1 : 0);
}

const client = new pg.Client({
  connectionString: DATABASE_URL,
  ssl: /localhost|127\.0\.0\.1/.test(DATABASE_URL) ? undefined : { rejectUnauthorized: false },
});

const files = fs
  .readdirSync(path.join(ROOT, "database/migrations"))
  .filter((name) => name.endsWith(".sql"))
  .sort();

try {
  await client.connect();

  // Do services ek saath build ho sakti hain — advisory lock se double-run rukta hai.
  await client.query("select pg_advisory_lock(727272727)");

  const { rows: existing } = await client.query(
    "select to_regclass('public.orders') is not null as has_orders",
  );

  if (!existing[0].has_orders) {
    console.log("[db:migrate] schema.sql apply ho raha hai (pehli baar)…");
    const schema = fs.readFileSync(path.join(ROOT, "database/schema.sql"), "utf8");
    await client.query("begin");
    try {
      await client.query(schema);
      await client.query("commit");
      console.log("[db:migrate] schema.sql done");
    } catch (error) {
      await client.query("rollback");
      throw error;
    }
  }

  await client.query(
    `create table if not exists schema_migrations (
       id         text primary key,
       applied_at timestamptz not null default now()
     )`,
  );

  const { rows } = await client.query("select id from schema_migrations");
  const applied = new Set(rows.map((row) => row.id));

  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = fs.readFileSync(path.join(ROOT, "database/migrations", file), "utf8");
    console.log(`[db:migrate] ${file}`);
    // Har migration apne statements ke saath chalti hai (enum add value ko
    // transaction ke andar use nahi kiya ja sakta).
    await client.query(sql);
    await client.query("insert into schema_migrations (id) values ($1)", [file]);
  }

  const { rows: counts } = await client.query(
    "select (select count(*) from orders)::int as orders, (select count(*) from invoices)::int as invoices",
  );
  console.log(`[db:migrate] ready — orders: ${counts[0].orders}, invoices: ${counts[0].invoices}`);
} catch (error) {
  console.error("[db:migrate] failed:", error.message);
  process.exitCode = 1;
} finally {
  await client.end().catch(() => undefined);
}
