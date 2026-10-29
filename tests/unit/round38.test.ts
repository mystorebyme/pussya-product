/**
 * Round 38 (27 Oct 2026) — owner ke sawaal, seedhe unke shabdon me:
 *
 *  1. " ye mail id abhi vi show kr rhi hai — **code se hi remove
 *     karo** aur btao kha se fetch ho rhi thi; **jo sheet me hai wahi fetch honi
 *     chahiye**."
 *  2. "redeploy kr diya, order bhi kiya, checkout kiya — **par sheet me koi show
 *     hi nahi ho raha**; contact form ke message bhi nahi aa rahe. **DB kahan se
 *     chal raha hai?** Mujhe prkigothwal@gmail wali sheet se chalwana hai."
 *  3. "Apps Script **future-proof** banao — har line meaningful, jisko change
 *     karne ki zaroorat na pade, perfect working, instant."
 *
 * Isliye is round me:
 *  • UPI ka ek hi source: **sheet** (Settings tab `upi_id`). Code me koi payee
 *    default nahi; env `STORE_UPI_ID` sirf emergency fallback (production se
 *    hataya gaya); dono khaali → payment page honestly "load nahi ho rahi" bolta
 *    hai (galat payee par paisa jaane se kahin behtar).
 *  • Sheet pipeline ki har failure **dikhne layak** bani: script ka public
 *    `?action=health`, website ka `/api/sheet-health`, aur append par retry +
 *    last-write report. Anaath sheet chup-chaap banna band (loud error).
 *  • Token ab **Script Properties** me rehta hai (`?action=set_token` se ek baar
 *    set) — code kitni baar bhi paste ho, token nahi tootta. Public placeholder
 *    token se kuch nahi chalta.
 *
 * Ye guards source-level hain: koi future patch purana payee wapas laaye, default
 *  UPI invent kare, ya diagnostics hataaye — test turant pakad lega.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

const SKIP_DIRS = new Set(["node_modules", ".next", ".cloudflare", "dist", "build", ".git", ".turbo", "out"]);

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walk(path.join(dir, entry.name), out);
    } else if (/\.(ts|tsx|mjs|gs|json)$/.test(entry.name)) {
      out.push(path.join(dir, entry.name));
    }
  }
  return out;
}

test("R38-1: purana payee VPA apps/packages/scripts me kahin nahi bacha", () => {
  const offenders: string[] = [];
  for (const base of ["apps", "packages", "scripts"]) {
    for (const file of walk(path.join(ROOT, base))) {
      const text = fs.readFileSync(file, "utf8");
      if (/dhakadgourav/i.test(text)) offenders.push(path.relative(ROOT, file));
    }
  }
  assert.deepEqual(offenders, [], `purana payee mila: ${offenders.join(", ")}`);
});

test("R38-2: UPI ka ek hi source — sheet; code defaults khaali", () => {
  const settings = read("apps/web/src/lib/store-settings.ts");
  assert.match(settings, /upiId: process\.env\.STORE_UPI_ID \?\? ""/, "server default khaali (env-only fallback)");

  const provider = read("apps/web/src/components/store-settings-provider.tsx");
  assert.match(provider, /upiId: ""/, "browser default khaali");

  const admin = read("apps/admin/src/lib/data.ts");
  assert.match(admin, /upiId: ""/, "admin default khaali");

  // sheet merge me sheet ki value jeetti hai (R35 se), aur normalize khaali
  // upiId ko invent nahi karta — text() fallback base se aata hai jo ab "" hai.
  const gs = read("scripts/google-apps-script/noor-sheets.gs");
  assert.match(gs, /\['upi_id', ''\]/, "script Settings seed me bhi UPI khaali");
});

test("R50-3: site par payment UI nahi — sab kuch WhatsApp hand-off se", () => {
  // customer-facing code me UPI/payment screen ka koi zikr nahi
  const strip = (source: string) =>
    source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const pay = strip(read("apps/web/src/app/orders/[orderNumber]/pay/page.tsx"));
  const order = strip(read("apps/web/src/app/orders/[orderNumber]/page.tsx"));
  assert.doesNotMatch(pay, /UpiPayment|UpiQr|payment-status-watcher/);
  assert.doesNotMatch(pay, /upi:\/\//);
  assert.match(pay, /confirm-whatsapp/);
  assert.match(order, /order-whatsapp-block/);
  // technical load-error copy customer ko kabhi nahi dikhti
  assert.doesNotMatch(pay, /refresh kariye/i);
  assert.doesNotMatch(pay, /load nahi ho rahi/i);
});

test("R38-4: sheet write retry + last-write diagnostics (orders gayab nahi honge chup-chaap)", () => {
  const lib = read("apps/web/src/lib/google-sheets.ts");
  assert.match(lib, /appendSheetRowsOnce/, "single-attempt helper");
  assert.match(lib, /setTimeout\(resolve, 600\)/, "ek retry 600ms baad");
  assert.match(lib, /export function sheetWriteInfo/, "last write ka record public hai");
  assert.match(lib, /redactSheetSecrets/, "error strings se token hataya jaata hai");
  assert.match(lib, /export function expectedSheetId/, "expected sheet id env se override ho sakti hai");
  assert.match(lib, /SHEET_EXPECTED_ID/, "env override ka naam");
});

test("R38-5: /api/sheet-health — public report card, secret-safe", () => {
  const route = read("apps/web/src/app/api/sheet-health/route.ts");
  assert.match(route, /export const dynamic = "force-dynamic"/, "hamesha fresh");
  assert.match(route, /no-store/, "cache nahi hota");
  assert.match(route, /sheetWriteInfo/, "last write dikhata hai");
  assert.match(route, /expectedSheetId/, "sheet id match batata hai");
  assert.match(route, /ordersStore: dbEnabled\(\) \? "postgres" : "file"/, "DB kahan chal raha hai — saaf jawab");
  // secret kabhi response me nahi jaana chahiye
  assert.ok(!route.includes("process.env.GOOGLE_SHEETS_TOKEN"), "token route me use hi nahi hota");
  assert.ok(!route.includes("process.env.GOOGLE_SHEETS_WEBAPP_URL"), "webapp URL ka value expose nahi hota");
  assert.match(route, /HEALTH_CACHE_MS = 30_000/, "Apps Script quota bachane ke liye cache");
});

test("R38-6: script ka token Script Properties me — paste-proof, placeholder-proof", () => {
  const gs = read("scripts/google-apps-script/noor-sheets.gs");
  assert.match(gs, /var CODE_VERSION = 'r\d+-\d+';/, "version pinned (r38+ rounds)");
  assert.match(gs, /function effectiveToken_/, "token Properties se padhta hai");
  assert.match(gs, /TOKEN_PLACEHOLDER/, "public placeholder pehchana jaata hai");
  assert.match(gs, /function setToken_/, "set_token implementation");
  assert.match(gs, /action === 'set_token'/, "set_token action wired");
  assert.match(gs, /action === 'adopt'/, "adopt action (bound sheet apnao)");
  assert.match(gs, /PUBLIC_SETTING_KEYS/, "settings ka public subset");
  // settings/health/version/ping bina token chalte hain — warna token set hone
  // se pehle website ka UPI read hi nahi hoga
  assert.match(gs, /var isPublic = action === 'settings' \|\| action === 'version' \|\| action === 'ping' \|\| action === 'health'/, "public GET actions");
  assert.match(gs, /if \(!tokenOk_\(body\.token\)\)/, "doPost token-gated");
  assert.match(gs, /tokenFix_/, "har token error ke saath FIX bataya jaata hai");
});

test("R38-7: script anaath sheet chup-chaap nahi banati (orders gayab hone ki jad band)", () => {
  const gsFull = read("scripts/google-apps-script/noor-sheets.gs");
  // comments hata kar dekhein — code me create sirf createOwnSheet (explicit) me
  const gs = gsFull
    .split("\n")
    .filter((line) => !line.trim().startsWith("*") && !line.trim().startsWith("//"))
    .join("\n");
  assert.equal((gs.match(/SpreadsheetApp\.create/g) ?? []).length, 1, "create sirf createOwnSheet (explicit) me");
  assert.match(gs, /sheet_access_denied/, "book_ loud error deta hai");
  assert.equal((gs.match(/function guard_/g) ?? []).length, 1, "duplicate dead code nahi");
  assert.match(gs, /function healthReport_/, "health ek jagah se banta hai");
  assert.match(gs, /spreadsheetId: ''/, "health me sheet id (site ka selftest isi ko padhta hai)");
});

test("R50-8: CI/preview me koi payment env nahi — tests WhatsApp hand-off dekhte hain", () => {
  const payments = read("tests/e2e/payments.mjs");
  assert.match(payments, /no hardcoded payee/, "pay page par purana VPA nahi");
  assert.match(payments, /no UPI screen anywhere/, "koi UPI screen nahi");
  assert.match(payments, /data-testid="confirm-whatsapp"/, "WhatsApp CTA checked");
  const smoke = read("tests/e2e/smoke.mjs");
  assert.match(smoke, /\/api\/sheet-health/, "smoke sheet-health check karta hai");
});
