#!/usr/bin/env node
/**
 * Invoice masthead logo → base64 TS module.
 *
 * Kyun: Next/Vercel par `public/images/brand/logo-mark-512.png` disk se padha ja
 * sakta hai, par Cloudflare Workers me file system read-only hai (R34). Isliye
 * wahi exact logo build-time par base64 me bundle kar dete hain — invoice par
 * bhi wahi brand mark dikhta hai, koi network call nahi.
 *
 * Regenerate jab bhi logo asset badle:
 *   npm run assets:invoice-logo      (ya: node scripts/build-invoice-logo.mjs)
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const source = join(root, "apps/web/public/images/brand/logo-mark-512.png");
const target = join(root, "apps/web/src/content/invoice-logo.generated.ts");

if (!existsSync(source)) {
  console.error(`invoice logo — source missing: ${source}`);
  process.exit(1);
}

const base64 = readFileSync(source).toString("base64");
mkdirSync(dirname(target), { recursive: true });
writeFileSync(
  target,
  `// AUTO-GENERATED — do not edit. \`npm run assets:invoice-logo\` (scripts/build-invoice-logo.mjs)
// Source: apps/web/public/images/brand/logo-mark-512.png
/** GST invoice masthead ka brand logo (base64 PNG) — Workers par bhi kaam karta hai. */
export const INVOICE_LOGO_PNG_BASE64 = "${base64}";
`,
);
console.log(`invoice logo — ${source} → ${target} (${base64.length} base64 chars)`);
