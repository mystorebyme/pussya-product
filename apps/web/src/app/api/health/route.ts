import { catalogMeta } from "@/lib/store";
import { dbEnabled, ensureSchema, query } from "@/lib/db";
import { isCloudflareWorkers, isEphemeralStorage } from "@/lib/fs-runtime";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Health + DB check.
 *
 * `db: "up"` tabhi jab Postgres se `select 1` chala ho. Schema bootstrap bhi
 * yahin trigger hota hai (Vercel par koi migrate step nahi hota), isliye pehla
 * health call naye DB ko taiyaar kar deta hai.
 */
export async function GET() {
  let db: "off" | "up" | "error" = "off";
  let dbError: string | null = null;
  if (dbEnabled()) {
    try {
      await ensureSchema();
      await query("select 1");
      db = "up";
    } catch (error) {
      db = "error";
      dbError = error instanceof Error ? error.message.slice(0, 180) : "unknown error";
    }
  }

  return Response.json(
    {
      data: {
        status: db === "error" ? "degraded" : "ok",
        service: "noor-web",
        // deployment identity — CI isse "mera build live hai?" check karta hai
        commit: (process.env.VERCEL_GIT_COMMIT_SHA ?? "local").slice(0, 7),
        catalogBuiltAt: catalogMeta.builtAt,
        products: catalogMeta.productCount,
        // orders ka backend: postgres (production) ya json (local dev)
        ordersStore: dbEnabled() ? "postgres" : "json",
        db,
        dbError,
        /**
         * R34 — Cloudflare Workers check. Workers par file system read-only hai,
         * isliye durable data **Postgres** me hi jaana chahiye. `storage` =
         * "memory" ka matlab: orders sirf us isolate me hain (preview only).
         */
        runtime: isCloudflareWorkers() ? "cloudflare-workers" : "node",
        storage: dbEnabled() ? "postgres" : isEphemeralStorage() ? "memory" : "file",
        durable: dbEnabled() || !isEphemeralStorage(),
        time: new Date().toISOString(),
      },
    },
    { status: 200, headers: { "cache-control": "no-store" } },
  );
}
