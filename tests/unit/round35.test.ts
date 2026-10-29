/**
 * R35 guards — "sheet me UPI badla, site par nahi badla" + Cloudflare deploy.
 *
 * Owner (26 Oct 2026):
 *   1. Sheet se jo bhi dikhta hai (UPI ID, payee name, WhatsApp, announcement) wo
 *      sheet badalte hi **turant** site par badalna chahiye — redeploy ke bina.
 *   2. Cloudflare Worker deploy fail ho raha tha:
 *      `✘ Could not detect a directory containing static files` — kyunki build
 *      `npx wrangler deploy` repo root par chala raha tha (wahan wrangler config
 *      hai hi nahi; storefront vinext se `apps/web` me banta hai).
 *
 * Behaviour (asli read/cache/SWR) `tests/sheets/settings-realtime.test.ts` naapta hai;
 * ye file UI + route + config ke guards pin karti hai.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

/* ───────────────────── sheet read layer (timeout + cache) ───────────────────── */

test("R35: Apps Script read timeout 4s hai (900ms par read hamesha timeout hota tha)", () => {
  const sheets = read("apps/web/src/lib/google-sheets.ts");
  assert.match(sheets, /SHEET_READ_TIMEOUT_MS", 4_000/, "env-tunable default 4s");
  assert.doesNotMatch(sheets, /READ_TIMEOUT_MS = 900/, "purana 900ms timeout wapas na aaye");
  assert.match(sheets, /SHEET_SETTINGS_TTL_MS", 2_000/, "R37: settings TTL 2s (owner: instant means instant)");
});

test("R35: read fail ho to last good value rehti hai (cache null nahi hota)", () => {
  const sheets = read("apps/web/src/lib/google-sheets.ts");
  assert.match(sheets, /function failRead/, "failRead helper");
  assert.match(sheets, /const previous = cache\?\.value \?\? null/, "purani value sambhaal kar rakhi jaati hai");
  assert.match(sheets, /revalidateInBackground/, "stale-while-revalidate");
  // cache-buster: beech ka proxy/CDN purani value na de
  assert.match(sheets, /searchParams\.set\("_ts"/, "har read me cache-buster param");
});

test("R35: Workers par last good value edge cache me rehti hai (cold isolate default par na jaaye)", () => {
  const sheets = read("apps/web/src/lib/google-sheets.ts");
  assert.match(sheets, /edgeRead/, "edge cache read");
  assert.match(sheets, /edgeWrite/, "edge cache write");
  assert.match(sheets, /caches\?: \{ default\?: Cache \}/, "Cache API feature-detect (Node par no-op)");
});

/* ───────────────────── payment page (paisa yahan hai) ───────────────────── */

test("R35: getStoreSettingsFast 350ms par default UPI nahi de deta", () => {
  const settings = read("apps/web/src/lib/store-settings.ts");
  assert.match(settings, /getStoreSettingsFast\(budgetMs = 3_000\)/, "budget 350ms → 3s");
  assert.doesNotMatch(settings, /getStoreSettingsFast\(budgetMs = 350\)/);
  // cache ho to purani **sahi** value, hardcoded default nahi
  const fast = settings.slice(settings.indexOf("export async function getStoreSettingsFast"));
  const head = fast.slice(0, fast.indexOf("const slow"));
  assert.match(head, /if \(cache\) \{[\s\S]*return cache\.value;/, "cache hai to wahi value jaati hai");
  assert.match(settings, /revalidateInBackground\(\);\s*\n\s*return cache\.value;/, "stale + background refresh");
});

test("R35: payment page ka UPI card sheet se live update hota hai (reload ke bina)", () => {
  const upi = read("apps/web/src/components/upi-payment.tsx");
  assert.match(upi, /useStoreSettingsState/, "live settings context use hota hai");
  assert.match(upi, /refresh\(\{ fresh: true \}\)/, "page khulte hi fresh read");
  assert.match(upi, /normaliseUpiId\(liveSettings\.upiId\)/, "sheet ka UPI validate karke use hota hai");
  // QR / display / copy / WhatsApp text — sab live VPA se banein, server prop se nahi
  assert.match(upi, /vpa: payeeVpa/, "UPI intent live VPA se");
  assert.match(upi, /writeText\(payeeVpa\)/, "copy button live VPA copy karta hai");
  assert.match(upi, /\{payeeVpa\}/, "screen par live VPA dikhta hai");
  assert.doesNotMatch(upi, /vpa: upiId/, "server-rendered prop par atka nahi");
});

test("R35: settings provider fresh=1 support karta hai aur 15s me poll karta hai", () => {
  const provider = read("apps/web/src/components/store-settings-provider.tsx");
  assert.match(provider, /\/api\/settings\?fresh=1/, "fresh mode");
  assert.match(provider, /POLL_MS = 3_000/, "R37: poll 3s (instant)");
  assert.match(provider, /setLive\(true\)/, "live flag (defaults vs sheet ka farq)");
});

test("R35: /api/settings fresh=1 par sheet se abhi padhta hai, aur secret leak nahi karta", () => {
  const route = read("apps/web/src/app/api/settings/route.ts");
  assert.match(route, /searchParams\.get\("fresh"\)/, "fresh param");
  assert.match(route, /getStoreSettings\(\{ fresh: true \}\)/, "fresh path");
  assert.match(route, /getStoreSettingsFast\(\)/, "normal path stale-while-revalidate");
  assert.match(route, /"cache-control": "no-store"/, "CDN/browser cache nahi");
  assert.match(route, /meta: \{/, "owner ke liye read diagnostics");
  // sheet ka URL/token public API me kabhi nahi jaata
  assert.doesNotMatch(route, /GOOGLE_SHEETS_WEBAPP_URL|GOOGLE_SHEETS_TOKEN/, "koi secret nahi");
  assert.doesNotMatch(route, /supportEmail/, "owner rule: support email public nahi");
});

test("R35: admin sheet screen read path ka sach dikhata hai (source / age / error)", () => {
  const route = read("apps/web/src/app/api/admin/sheet/route.ts");
  assert.match(route, /storeSettingsInfo/, "live diagnostics");
  assert.match(route, /liveRead/, "liveRead key");

  const page = read("apps/admin/src/app/(admin)/sheet/page.tsx");
  assert.match(page, /sheet-live-read/, "admin panel me live read notice");
  assert.match(page, /liveRead\?\.source === "apps-script"/, "Apps Script vs CSV vs fail alag dikhta hai");
  assert.match(page, /Publish to web/, "CSV fallback par warning (Google ~5 min cache karta hai)");
  assert.doesNotMatch(page, /15 second me website/, "purana 15s copy nahi");
});

/* ───────────────────── legacy payment routes bhi sheet ka UPI use karein ───────────────────── */

test("R35: manual UPI intent/QR sheet settings se banta hai (env ka purana VPA nahi)", () => {
  const payments = read("apps/web/src/lib/payments.ts");
  assert.match(payments, /ManualUpiTarget/, "target type");
  assert.match(payments, /manualUpiUri\(amountPaise: number, orderNumber: string, target\?: ManualUpiTarget\)/);
  assert.match(payments, /target\?\.vpa\?\.trim\(\) \|\| process\.env\.STORE_UPI_ID/, "sheet pehle, env fallback");

  for (const route of ["apps/web/src/app/api/payments/route.ts", "apps/web/src/app/api/payments/intent/route.ts"]) {
    const source = read(route);
    assert.match(source, /getStoreSettingsFast/, `${route} sheet settings padhta hai`);
    assert.match(source, /vpa: settings\.upiId/, `${route} live UPI bhejta hai`);
  }
});

/* ───────────────────── Cloudflare Worker deploy ───────────────────── */

test("R35: Cloudflare deploy ek command se hota hai (apps/web se, root par wrangler config nahi)", () => {
  assert.ok(fs.existsSync(path.join(process.cwd(), "scripts/deploy-cloudflare.sh")), "deploy script hai");
  const script = read("scripts/deploy-cloudflare.sh");
  assert.match(script, /set -euo pipefail/, "fail-fast");
  // Workers Builds apna token khud lagata hai — isliye missing token par script ruk-ti nahi
  assert.doesNotMatch(script, /exit 1/, "token missing par hard fail nahi (Workers Builds khud auth karta hai)");
  assert.match(script, /WORKER_NAME/, "worker naam dikhata hai");
  assert.match(script, /npm run deploy:vinext --workspace @noor\/web/, "vinext deploy (apps/web cwd)");
  assert.match(script, /CLOUDFLARE_API_TOKEN/, "credentials env se, repo me nahi");
  assert.match(script, /npm ci/, "deps repo root se install hote hain (workspaces)");

  const pkg = JSON.parse(read("package.json")) as { scripts: Record<string, string> };
  assert.equal(pkg.scripts["deploy:worker"], "bash scripts/deploy-cloudflare.sh");
  assert.match(pkg.scripts["test:all"] ?? "", /test:sheets/, "sheet realtime suite test:all me hai");

  // root par wrangler config nahi — isliye `npx wrangler deploy` (repo root) fail hota tha
  for (const file of ["wrangler.toml", "wrangler.json", "wrangler.jsonc"]) {
    assert.ok(!fs.existsSync(path.join(process.cwd(), file)), `${file} root par nahi hona chahiye`);
  }
  const workerConfig = read("apps/web/cloudflare.config.ts");
  assert.match(workerConfig, /noor-storefront/, "worker ka default naam");
  // owner ka Cloudflare worker pehle se `designer` naam se hai — naam env se override ho
  // warna deploy ek naya worker bana deta aur `designer` (domain/routes) stale reh jaata
  assert.match(workerConfig, /process\.env\.WORKER_NAME/, "WORKER_NAME override");
  assert.match(workerConfig, /vinext\/server\/fetch-handler/, "vinext entrypoint");
  // sheet → site real-time knobs Workers par declared hon (process.env sirf declared vars padhta hai)
  assert.match(workerConfig, /SHEET_READ_TIMEOUT_MS: bindings\.text\("4000"\)/);
  assert.match(workerConfig, /SHEET_SETTINGS_TTL_MS: bindings\.text\("2000"\)/);
  assert.match(workerConfig, /SHEET_TRACKING_TTL_MS: bindings\.text\("2000"\)/);
});

test("R35: GitHub Actions se Worker deploy (manual) — secrets repo me nahi", () => {
  const workflow = read(".github/workflows/cloudflare-worker.yml");
  assert.match(workflow, /workflow_dispatch/, "manual trigger (production DNS abhi Vercel par)");
  assert.match(workflow, /secrets\.CLOUDFLARE_API_TOKEN/, "token secrets se");
  assert.match(workflow, /scripts\/deploy-cloudflare\.sh/, "wahi script jo dashboard me chalti hai");
  assert.match(workflow, /npm ci/, "monorepo install root par");
  assert.doesNotMatch(workflow, /npx wrangler deploy/, "root par wrangler deploy nahi (wahi purani galti)");
});

test("R35: docs me Workers Builds ki sahi settings likhi hain", () => {
  const doc = read("docs/09-devops/cloudflare-workers.md");
  assert.match(doc, /Could not detect a directory containing static files/, "error + wajah documented");
  assert.match(doc, /npm run deploy:vinext --workspace @noor\/web|scripts\/deploy-cloudflare\.sh/, "deploy command");
  assert.match(doc, /bash scripts\/deploy-cloudflare\.sh/, "dashboard me yahi command");
  assert.match(doc, /WORKER_NAME/, "existing worker (`designer`) par deploy karne ka tarika");
  assert.match(doc, /NODE_VERSION/, "Node 22 build variable");
});
