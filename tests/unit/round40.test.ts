/**
 * Round 40 (27 Oct 2026) — owner ke 6 points, seedhe unke shabdon me:
 *
 *  1. "Payment settings abhi load nahi ho rahi… page refresh kariye" — **ye line
 *     customer ko kabhi na dikhe**; aisi cheezein hide rahni chahiye.
 *  2. "logo vgara fix kro"
 *  3. "header fix kro"
 *  4. "GitHub page ke action ke liye button dena" (Actions se deploy)
 *  5. "ye Vercel par karna hai"
 *  6. "sheet link kar do, data backend se load hona chahiye, koi bhi scam na kar paye"
 *
 * Guards neeche source-level hain: koi future patch in cheezon ko wapas bigaade
 * to test fail hoga.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { hitRateLimit, resetRateLimits } from "../../apps/web/src/lib/rate-limit";

const root = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
/** comment hata kar sirf wo text dekho jo user ko dikhta hai */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const exists = (file: string) => fs.existsSync(path.join(root, file));

/* ------------------------------------------------------------------ 1. payment copy */

test("R40-1: customer ko koi technical payment line nahi (sirf skeleton, phir seedhi baat)", () => {
  const upi = stripComments(read("apps/web/src/components/upi-payment.tsx"));
  const step = stripComments(read("apps/web/src/components/checkout-payment-step.tsx"));
  for (const file of [upi, step]) {
    assert.doesNotMatch(file, /refresh kariye/i, "refresh karne ko nahi kehte");
    assert.doesNotMatch(file, /load nahi ho rahi/i, "technical load-error copy nahi");
    assert.doesNotMatch(file, /sheet se aati hai/i, "sheet ka zikr customer ko nahi");
    assert.doesNotMatch(file, /settings load/i, "settings ka zikr customer ko nahi");
  }
  // galat payee par upi:// link kabhi nahi banta
  assert.ok(upi.indexOf("!payeeVpa") < upi.indexOf('data-testid="upi-open"'));
});

/* ------------------------------------------------------------------ 2. logo */

test("R40-2: logo per-device height + asli file ratio (stretch/crop nahi)", () => {
  const css = read("apps/web/src/app/globals.css");
  const lockup = read("apps/web/src/components/brand-lockup.tsx");
  // teen breakpoints ke liye teen heights (R43: naye lockup ke saath 44 → 52 → 58)
  assert.match(css, /\.brand-lockup img \{[^}]*height: 44px/);
  assert.match(css, /min-width: 768px\)[^@]*\.brand-lockup img \{[^}]*height: 52px/);
  assert.match(css, /min-width: 1024px\)[^@]*\.brand-lockup img \{[^}]*height: 58px/);
  assert.match(css, /\.brand-lockup img \{[^}]*object-fit: contain/, "kabhi stretch nahi");
  // width/height attrs asli file ke hain (mobile 310×138, fluid 458×400)
  assert.match(lockup, /width=\{310\}\s*\n?\s*height=\{138\}/);
  assert.match(lockup, /width=\{458\}\s*\n?\s*height=\{400\}/);
});

/* ------------------------------------------------------------------ 3. header */

test("R40-3: header me ek hi announcement strip (duplicate nahi) + koi purani date nahi", () => {
  const layout = read("apps/web/src/app/layout.tsx");
  const header = read("apps/web/src/components/site-header.tsx");
  const headerUi = stripComments(header);
  assert.doesNotMatch(layout, /<AnnouncementBar/, "layout alag strip render nahi karta");
  assert.match(header, /defaultAnnouncements/, "strip header ke andar hai");
  assert.doesNotMatch(headerUi, /Diwali|order by 4 Nov/i, "purani seasonal copy nahi");
  assert.doesNotMatch(read("apps/web/src/lib/store-settings.ts"), /Diwali/, "default settings me bhi nahi");
  // strip khud rotate karta hai + nav child pages par bhi active
  assert.match(header, /setBannerIndex\(\(current\) => \(current \+ 1\) % announcements\.length\)/);
  assert.match(header, /pathname\.startsWith\(`\$\{link\.href\}\/`\)/);
});

/* ------------------------------------------------------------------ 4 + 5. deploy */

test("R40-4/5: Vercel config + GitHub Actions button path maujood hai", () => {
  for (const app of ["apps/web", "apps/admin"]) {
    assert.ok(exists(`${app}/vercel.json`), `${app}/vercel.json`);
    const json = JSON.parse(read(`${app}/vercel.json`)) as { framework?: string };
    assert.equal(json.framework, "nextjs");
  }
  const deploy = read(".github/workflows/deploy.yml");
  assert.match(deploy, /workflow_dispatch/, "GitHub UI se button");
  assert.match(deploy, /npx vercel deploy --prod/, "Vercel deploy");
  assert.match(deploy, /npm run test:all/, "deploy se pehle tests (gate)");
  assert.ok(exists("docs/09-devops/vercel-deploy.md"), "deploy steps doc");
  assert.match(read("README.md"), /vercel\.com\/button/, "README me deploy button");
  // Pages workflow isi branch par chale (purana branch naam nahi)
  const pages = read(".github/workflows/pages.yml");
  assert.doesNotMatch(pages, /arena\/f713eef1/, "purana branch naam nahi");
});

/* ------------------------------------------------------------------ 6. scam-proofing */

test("R40-6: public write APIs rate-limited hain (bot se spam/fake orders nahi)", () => {
  for (const file of ["orders", "contact", "newsletter"]) {
    const route = read(`apps/web/src/app/api/${file}/route.ts`);
    assert.match(route, /enforceRateLimit/, `${file} route par limit`);
  }
  const claim = read("apps/web/src/app/api/payments/claim/route.ts");
  assert.match(claim, /RATE_LIMITS\.payments/, "IP par limit");
  assert.match(claim, /hitRateLimit\(`order:/, "per-order attempts limit (last-4 guessing)");
});

test("R40-6b: rate limiter window ke andar block karta hai, baad me khud khul jaata hai", () => {
  resetRateLimits();
  const rule = { name: "test", limit: 2, windowMs: 1_000 };
  const t0 = 1_700_000_000_000;
  assert.equal(hitRateLimit("1.2.3.4", rule, t0).ok, true);
  assert.equal(hitRateLimit("1.2.3.4", rule, t0 + 10).ok, true);
  const blocked = hitRateLimit("1.2.3.4", rule, t0 + 20);
  assert.equal(blocked.ok, false);
  if (!blocked.ok) assert.ok(blocked.retryAfterSeconds >= 1);
  // dusra IP alag bucket
  assert.equal(hitRateLimit("5.6.7.8", rule, t0 + 20).ok, true);
  // window cross hone par reset
  assert.equal(hitRateLimit("1.2.3.4", rule, t0 + 1_001).ok, true);
  resetRateLimits();
});

test("R40-6c: amount/price client se trust nahi hota (server recompute)", () => {
  const orders = read("apps/web/src/lib/orders.ts");
  assert.match(orders, /recompute|recalculated|server price|price.*server/i, "server-side price recompute");
  const schema = read("packages/validation/index.ts");
  // client ka total optional hai / ignore hota hai — sirf line item handle+qty chalti hai
  assert.match(schema, /createOrderSchema/, "shared schema");
});

/* ------------------------------------------------------------------ 7. sheet */

test("R40-7: sheet id code me hardcoded nahi — sirf env (SHEET_EXPECTED_ID)", () => {
  const lib = read("apps/web/src/lib/google-sheets.ts");
  assert.match(lib, /SHEET_EXPECTED_ID/);
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (["node_modules", ".next", ".git", "dist", "build", ".data"].includes(entry.name)) continue;
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(rel);
        continue;
      }
      if (!/\.(ts|tsx|mjs|gs|json)$/.test(entry.name)) continue;
      if (rel.startsWith(path.join("tests"))) continue;
      const text = fs.readFileSync(path.join(root, rel), "utf8");
      if (/1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo/.test(text)) offenders.push(rel);
    }
  };
  walk("apps");
  walk("packages");
  walk("scripts");
  assert.deepEqual(offenders, [], `sheet id code me mila: ${offenders.join(", ")}`);
});
