/**
 * R34 — Cloudflare Workers compatibility guards.
 *
 * Ye tests un 4 cheezon ko pin karte hain jinhone workerd par storefront toda tha
 * (aur jo dobara na tootein):
 *   1. `fs-runtime` — Workers par FS read-only hai; likhna memory me jaana chahiye.
 *   2. Policies — runtime par markdown padhne ke bajaye build-time bundle use ho.
 *   3. Invoice logo — Workers par disk na hone par bhi wahi logo PDF me jaaye.
 *   4. Koi bhi web lib wapas seedha `node:fs` import na kare (Workers par crash).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

test("fs-runtime: Node par asli fs jaisa hi behave karta hai", async () => {
  const { default: runtimeFs, isCloudflareWorkers, isEphemeralStorage } = await import(
    "../../apps/web/src/lib/fs-runtime.ts"
  );
  assert.equal(isCloudflareWorkers(), false, "Node par Workers detection false");
  assert.equal(isEphemeralStorage(), false, "Node par storage durable hai");

  const dir = fs.mkdtempSync(path.join("/tmp", "r34-fs-"));
  const file = path.join(dir, "orders.json");
  runtimeFs.mkdirSync(dir, { recursive: true });
  assert.equal(runtimeFs.existsSync(file), false);
  runtimeFs.writeFileSync(file, '{"orders":[]}');
  assert.equal(runtimeFs.existsSync(file), true);
  assert.equal(runtimeFs.readFileSync(file, "utf8"), '{"orders":[]}', "utf8 encoding par string");
  assert.ok(Buffer.isBuffer(runtimeFs.readFileSync(file)), "encoding ke bina Buffer");
  const renamed = path.join(dir, "orders.next.json");
  runtimeFs.renameSync(file, renamed);
  assert.equal(runtimeFs.existsSync(renamed), true);
  fs.rmSync(dir, { recursive: true, force: true });
});

test("fs-runtime: likhna fail ho (Workers jaisa) to memory fallback, crash nahi", async () => {
  const { default: runtimeFs, isEphemeralStorage, resetEphemeralStorage } = await import(
    "../../apps/web/src/lib/fs-runtime.ts"
  );
  resetEphemeralStorage();
  // Regular file ke andar path → mkdir/write dono fail (ENOTDIR/EPERM) — workerd jaisa
  const blocker = path.join(fs.mkdtempSync(path.join("/tmp", "r34-ro-")), "blocker");
  fs.writeFileSync(blocker, "x");
  const file = path.join(blocker, "data", "orders.json");

  runtimeFs.mkdirSync(path.dirname(file), { recursive: true });
  runtimeFs.writeFileSync(file, "fallback");
  assert.equal(runtimeFs.readFileSync(file, "utf8"), "fallback");
  assert.equal(runtimeFs.existsSync(file), true);
  assert.equal(isEphemeralStorage(), true, "memory me likha to ephemeral true hona chahiye");

  runtimeFs.renameSync(file, `${file}.tmp`);
  assert.equal(runtimeFs.readFileSync(`${file}.tmp`, "utf8"), "fallback");
  resetEphemeralStorage();
  assert.equal(isEphemeralStorage(), false);
  fs.rmSync(path.dirname(blocker), { recursive: true, force: true });
});

test("web libs Workers-safe fs shim hi use karti hain (raw node:fs imports nahi)", () => {
  const libDir = path.join(root, "apps/web/src/lib");
  const offenders: string[] = [];
  for (const entry of fs.readdirSync(libDir)) {
    if (!entry.endsWith(".ts")) continue;
    const code = fs.readFileSync(path.join(libDir, entry), "utf8");
    if (/from\s+"node:fs"/.test(code) || /from\s+"fs"/.test(code)) {
      // sirf shim khud asli fs use kar sakta hai
      if (entry !== "fs-runtime.ts") offenders.push(entry);
    }
  }
  assert.deepEqual(offenders, [], "ye libs @/lib/fs-runtime use karein (Workers par FS read-only)");
});

test("policies: generated bundle source markdown ke saath sync hai (runtime fs nahi)", async () => {
  const { policyMarkdown } = await import("../../apps/web/src/content/policies.generated.ts");
  const dir = path.join(root, "apps/web/src/content/policies");
  const files = fs.readdirSync(dir).filter((file) => file.endsWith(".md"));
  assert.ok(files.length >= 4, "chaaron policies maujood hain");
  for (const file of files) {
    const slug = file.replace(/\.md$/, "");
    const markdown = fs.readFileSync(path.join(dir, file), "utf8").trim();
    assert.ok(policyMarkdown[slug], `${slug} generated bundle me hona chahiye`);
    assert.equal(
      policyMarkdown[slug]!.trim(),
      markdown,
      `${slug} stale hai — \`npm run policies:build\` chalaayein`,
    );
  }
});

test("invoice logo: build-time embedded PNG valid hai aur source file se match karta hai", async () => {
  const { INVOICE_LOGO_PNG_BASE64 } = await import("../../apps/web/src/content/invoice-logo.generated.ts");
  const source = fs.readFileSync(path.join(root, "apps/web/public/images/brand/logo-mark-512.png"));
  const embedded = Buffer.from(INVOICE_LOGO_PNG_BASE64, "base64");
  assert.ok(embedded.length > 1000, "embedded logo khaali nahi");
  // PNG signature — warna pdfkit image embed fail karega (invoice par logo gayab)
  assert.deepEqual([...embedded.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47]);
  assert.equal(embedded.length, source.length, "logo badla hai — `npm run assets:invoice-logo` chalaayein");
  assert.ok(embedded.equals(source), "embedded logo source PNG ke barabar hona chahiye");
});

test("app/ pages aur routes me seedha node:fs import nahi (Workers par crash)", () => {
  const pagesDir = path.join(root, "apps/web/src/app");
  const offenders: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const abs = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(abs);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        const code = fs.readFileSync(abs, "utf8");
        if (/from\s+"node:fs/.test(code)) offenders.push(path.relative(root, abs));
      }
    }
  };
  walk(pagesDir);
  assert.deepEqual(offenders, [], "page/route files fs shim ya generated content use karein");
});

test("Cloudflare config: worker entry, nodejs_compat aur secrets declared hain", async () => {
  const configFile = path.join(root, "apps/web/cloudflare.config.ts");
  const code = fs.readFileSync(configFile, "utf8");
  assert.match(code, /entrypoint:\s*"vinext\/server\/fetch-handler"/);
  assert.match(code, /compatibilityFlags:\s*\["nodejs_compat"\]/);
  // Workers par orders durable rakhne ka ek hi rasta — Postgres
  assert.match(code, /"DATABASE_URL"/, "DATABASE_URL secret declare hona chahiye");
  assert.match(code, /"ADMIN_API_TOKEN"/, "admin token secret declare hona chahiye");
  assert.doesNotMatch(code, /sk_live|password|postgres:\/\//i, "config me koi secret value nahi");
});

test("vinext config: pdfkit Workers-compat patch maujood hai (invoice PDF)", () => {
  const code = fs.readFileSync(path.join(root, "apps/web/vite.config.ts"), "utf8");
  assert.match(code, /pdfkit\.node\.mjs/, "node ESM entry (import.meta.url) use hona chahiye");
  assert.match(code, /#standard-fonts/, "standard fonts static imports me badle jaate hain");
  assert.match(code, /worker\.invalid/, "PDF/A ICC URL absolute hona chahiye");
});
