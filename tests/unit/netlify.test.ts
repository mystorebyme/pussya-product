/**
 * Netlify shift ke guards — jo cheezein deploy ke waqt hi pata chalti hain
 * (build path, CORS, serverless detection) wo pehle hi test se pakad lein.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { corsHeaders } from "../../apps/web/src/lib/cors";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const exists = (relative: string) => fs.existsSync(path.join(process.cwd(), relative));

test("netlify: storefront ka netlify.toml maujood hai aur sahi build karta hai", () => {
  assert.ok(exists("apps/web/netlify.toml"), "apps/web/netlify.toml hona chahiye");
  const toml = read("apps/web/netlify.toml");
  // base directory repo root hi rehta hai (npm workspaces yahin resolve hote hain)
  assert.match(toml, /command = "npm run build --workspace @noor\/web"/);
  assert.match(toml, /publish = "apps\/web\/\.next"/);
  assert.match(toml, /package = "@netlify\/plugin-nextjs"/);
  assert.match(toml, /NODE_VERSION = "22"/);
});

test("netlify: admin ka netlify.toml maujood hai (doosri site)", () => {
  assert.ok(exists("apps/admin/netlify.toml"), "apps/admin/netlify.toml hona chahiye");
  const toml = read("apps/admin/netlify.toml");
  assert.match(toml, /command = "npm run build --workspace @noor\/admin"/);
  assert.match(toml, /publish = "apps\/admin\/\.next"/);
  assert.match(toml, /package = "@netlify\/plugin-nextjs"/);
  assert.match(toml, /X-Robots-Tag = "noindex, nofollow"/);
});

test("cors: netlify.app origins (production + deploy preview) allowed, baaki nahi", () => {
  const allow = (origin: string) =>
    corsHeaders(new Request("https://noor.test/api/orders", { headers: { origin } }))[
      "Access-Control-Allow-Origin"
    ];
  assert.equal(allow("https://noor-clothing.netlify.app"), "https://noor-clothing.netlify.app");
  assert.equal(
    allow("https://deploy-preview-7--noor-clothing.netlify.app"),
    "https://deploy-preview-7--noor-clothing.netlify.app",
  );
  // GitHub Pages preview (jahan se bhi checkout hota hai)
  assert.equal(allow("https://mystorebyme.github.io"), "https://mystorebyme.github.io");
  assert.equal(allow("https://evil.example.com"), undefined);
});

test("serverless detection: Netlify (Lambda) par bhi pool chhota + data /tmp me", () => {
  const db = read("apps/web/src/lib/db.ts");
  assert.match(db, /AWS_LAMBDA_FUNCTION_NAME/);
  assert.match(db, /process\.env\.NETLIFY/);
  const dataDir = read("apps/web/src/lib/data-dir.ts");
  assert.match(dataDir, /AWS_LAMBDA_FUNCTION_NAME/);
  assert.match(dataDir, /os\.tmpdir\(\)/);
});

test(".env.example saaf hai — koi gateway/email nahi, DB maujood", () => {
  const env = read(".env.example");
  assert.ok(!/^RAZORPAY/m.test(env), "Razorpay (third-party gateway) nahi hona chahiye");
  assert.ok(!/gmail|noorclothing@gmail/i.test(env), "support email kahin nahi");
  assert.match(env, /^DATABASE_URL=/m);
  assert.match(env, /^GOOGLE_SHEETS_WEBAPP_URL=/m);
  assert.match(env, /^STORE_UPI_ID=/m);
});

test("GitHub Pages preview live store URL repo variable se leta hai (Netlify switch easy)", () => {
  const workflow = read(".github/workflows/pages.yml");
  assert.match(workflow, /vars\.STORE_API_URL/);
});

test("CSP me koi third-party gateway nahi (sirf apni site)", () => {
  const config = read("apps/web/next.config.ts");
  assert.ok(!/razorpay/i.test(config), "CSP me razorpay nahi hona chahiye");
  assert.match(config, /frame-src 'none'/);
});

test("Netlify shift guide maujood hai — domain ke exact records ke saath", () => {
  const guide = read("docs/00-overview/netlify-shift-guide.md");
  assert.match(guide, /75\.2\.60\.5/); // apex A record
  assert.match(guide, /www/); // CNAME www
  assert.match(guide, /STORE_API_URL/);
  assert.match(guide, /apps\/web/);
  assert.match(guide, /apps\/admin/);
});

test("Netlify env templates maujood hain (2 sites, copy-paste import ke liye)", () => {
  const web = read("infra/netlify/web.env.example");
  for (const key of [
    "NEXT_PUBLIC_SITE_URL",
    "STORE_UPI_ID",
    "STORE_UPI_NAME",
    "ADMIN_API_TOKEN",
    "GOOGLE_SHEETS_WEBAPP_URL",
    "GOOGLE_SHEETS_TOKEN",
    "DATABASE_URL",
    "UPI_RETURN_SECRET",
    "OTP_TOKEN_SECRET",
  ]) {
    assert.match(web, new RegExp(`^${key}=`, "m"), `${key} web template me hona chahiye`);
  }
  const admin = read("infra/netlify/admin.env.example");
  for (const key of [
    "ADMIN_EMAIL",
    "ADMIN_PASSWORD",
    "ADMIN_SESSION_SECRET",
    "ADMIN_API_TOKEN",
    "STORE_API_URL",
    "NEXT_PUBLIC_STORE_URL",
    "NEXT_PUBLIC_STOREFRONT_URL",
  ]) {
    assert.match(admin, new RegExp(`^${key}=`, "m"), `${key} admin template me hona chahiye`);
  }
  // koi asli secret template me nahi hona chahiye
  assert.ok(!/adhakadgourav|eyJ2IjoidjIi/.test(web + admin), "template me secret nahi");
});
