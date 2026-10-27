import "server-only";

import { Pool, type PoolClient, type QueryResultRow } from "pg";

/**
 * Postgres connection.
 *
 * `DATABASE_URL` set hai to orders/invoices Postgres me rehte hain (Render par
 * disk permanent nahi hota, isliye yeh production mode hai). Set nahi hai to
 * local JSON store chalta hai — dev aur tests bina DB ke chal jaate hain.
 */

const DATABASE_URL = process.env.DATABASE_URL ?? "";

export function databaseUrl(): string {
  return DATABASE_URL;
}

export function dbEnabled(): boolean {
  return DATABASE_URL.length > 0;
}

let pool: Pool | null = null;

/**
 * Serverless (Vercel) par har invocation apna pool banata hai. Managed Postgres
 * ka pooler **session mode** me sirf ~15 clients deta hai — isse
 * `EMAXCONNSESSION max clients reached` aata hai aur order page / contact form /
 * UTR submit 500 dete hain (owner ko "kuch kaam nahi kar raha" dikhta hai).
 *
 * Isliye:
 *   - serverless par pool sirf **1** connection;
 *   - connection jaldi idle chhod do (1s) — doosri invocation ko jagah mile;
 *   - Supabase pooler ho aur session port (5432) par ho to **transaction mode
 *     (6543)** par switch kar dete hain (wahan limit bahut zyada hai);
 *   - `DATABASE_URL_POOLED` set karein to wahi use hoga (owner ka control).
 */
/**
 * Serverless? — Vercel **aur** Netlify dono par pool chhota rakhna padta hai.
 * Netlify par `VERCEL` nahi hota, isliye Lambda ke nishaan bhi dekhte hain
 * (Netlify Functions AWS Lambda par chalti hain).
 */
const IS_SERVERLESS = Boolean(
  process.env.VERCEL ||
    process.env.NETLIFY ||
    process.env.AWS_LAMBDA_FUNCTION_NAME ||
    process.env.LAMBDA_TASK_ROOT,
);
const POOL_MAX = Number(process.env.DB_POOL_MAX ?? (IS_SERVERLESS ? 1 : 5));

/** Pooler URL — session mode (5432) ko transaction mode (6543) me badal dete hain. */
export function pooledConnectionString(raw: string = DATABASE_URL): string {
  const override = (process.env.DATABASE_URL_POOLED ?? "").trim();
  if (override) return override;
  if (!raw) return raw;
  try {
    const url = new URL(raw);
    // Supabase: pooler.supabase.com:5432 = session mode, :6543 = transaction mode
    if (url.hostname.endsWith("pooler.supabase.com") && (url.port === "5432" || url.port === "")) {
      url.port = "6543";
      return url.toString();
    }
    return raw;
  } catch {
    return raw;
  }
}

export function getPool(): Pool {
  if (!DATABASE_URL) throw new Error("DATABASE_URL set nahi hai — Postgres mode available nahi.");
  if (!pool) {
    const connectionString = pooledConnectionString();
    pool = new Pool({
      connectionString,
      // Render/Neon/Supabase jaise managed Postgres ke liye SSL zaroori hota hai.
      ssl: /localhost|127\.0\.0\.1/.test(connectionString) ? undefined : { rejectUnauthorized: false },
      max: POOL_MAX,
      idleTimeoutMillis: IS_SERVERLESS ? 1_000 : 30_000,
      allowExitOnIdle: IS_SERVERLESS,
      connectionTimeoutMillis: 8_000,
      // purani connection chhod kar nayi lo — pooler ke stale client nahi jamte
      maxUses: IS_SERVERLESS ? 50 : Infinity,
    });
    // idle client error se process crash na ho
    pool.on("error", (error) => console.error("[db] idle client error", error.message));
  }
  return pool;
}

/** Pooler bhara ho to pool naya banao (purani connections chhod do). */
async function resetPool(): Promise<void> {
  const current = pool;
  pool = null;
  if (current) await current.end().catch(() => undefined);
}

/** Pooler ke transient errors — ek chhota retry user ko 500 se bacha leta hai. */
const TRANSIENT_DB_ERROR =
  /EMAXCONNSESSION|too many clients|ECONNRESET|ECONNREFUSED|ETIMEDOUT|timeout exceeded when trying to connect|Connection terminated/i;

async function withDbRetry<T>(run: () => Promise<T>, attempts = 5): Promise<T> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      return await run();
    } catch (error) {
      lastError = error;
      const message = error instanceof Error ? error.message : String(error);
      if (!TRANSIENT_DB_ERROR.test(message) || attempt === attempts) throw error;
      // pool bhara hai to naya pool banane se turant jagah mil jaati hai
      if (/EMAXCONNSESSION|too many clients/i.test(message)) await resetPool();
      await new Promise((resolve) => setTimeout(resolve, Math.min(2_500, 300 * attempt)));
    }
  }
  throw lastError;
}

/**
 * Schema bootstrap — serverless par (Vercel) koi `db:migrate` step nahi chalta,
 * isliye pehli DB query se pehle schema apply ho jaata hai:
 *   • advisory lock → do cold starts ek saath migrate na karein
 *   • `orders` table maujood hai to schema skip, sirf nayi migrations chalti hain
 *   • har migration `schema_migrations` me record hoti hai (idempotent)
 *
 * Local/test (JSON store) par DATABASE_URL hi nahi hota → kuch nahi hota.
 */
let schemaPromise: Promise<void> | null = null;

async function applySchema(): Promise<void> {
  const { SCHEMA_SQL, MIGRATIONS } = await import("./db-schema");
  const client = await getPool().connect();
  try {
    await client.query("select pg_advisory_lock(727272727)");
    const { rows } = await client.query<{ has_orders: boolean }>(
      "select to_regclass('public.orders') is not null as has_orders",
    );
    if (!rows[0]?.has_orders) {
      console.info("[db] schema.sql apply ho raha hai (pehli baar)…");
      await client.query("begin");
      try {
        await client.query(SCHEMA_SQL);
        await client.query("commit");
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    }
    await client.query(
      "create table if not exists schema_migrations (name text primary key, applied_at timestamptz not null default now())",
    );
    const applied = await client.query<{ name: string }>("select name from schema_migrations");
    const done = new Set(applied.rows.map((row) => row.name));
    for (const [name, sql] of Object.entries(MIGRATIONS)) {
      if (done.has(name)) continue;
      await client.query("begin");
      try {
        await client.query(sql);
        await client.query("insert into schema_migrations (name) values ($1) on conflict do nothing", [name]);
        await client.query("commit");
        console.info(`[db] migration applied: ${name}`);
      } catch (error) {
        await client.query("rollback").catch(() => undefined);
        throw error;
      }
    }
  } finally {
    await client.query("select pg_advisory_unlock(727272727)").catch(() => undefined);
    client.release();
  }
}

export async function ensureSchema(): Promise<void> {
  if (!DATABASE_URL) return;
  if (!schemaPromise) {
    schemaPromise = applySchema().catch((error) => {
      // agla request dobara try kare (thodi der ka DB outage permanent na ban jaye)
      schemaPromise = null;
      throw error;
    });
  }
  return schemaPromise;
}

export async function query<T extends QueryResultRow = QueryResultRow>(
  text: string,
  values: unknown[] = [],
): Promise<T[]> {
  await ensureSchema();
  const result = await withDbRetry(() => getPool().query<T>(text, values as never[]));
  return result.rows;
}

/** Ek transaction — sab writes ek saath commit ya rollback. */
export async function withTransaction<T>(fn: (client: PoolClient) => Promise<T>): Promise<T> {
  await ensureSchema();
  // connection milne me pooler "too many clients" deta hai — poora transaction
  // dobara chalao (rollback ho chuka hota hai, isliye safe).
  return withDbRetry(async () => {
    const client = await getPool().connect();
    try {
      await client.query("begin");
      const result = await fn(client);
      await client.query("commit");
      return result;
    } catch (error) {
      await client.query("rollback").catch(() => undefined);
      throw error;
    } finally {
      client.release();
    }
  });
}
