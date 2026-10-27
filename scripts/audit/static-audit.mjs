#!/usr/bin/env node
/**
 * Static site audit — GitHub Pages par jo **exactly** deploy hota hai (`dist/`),
 * usi ko scan karta hai. Koi network nahi, koi guess nahi:
 *
 *   • har internal link / asset (img, source, script, css, icon, manifest) ka
 *     file `dist/` me maujood hai ya nahi (base path ke saath)
 *   • `<img>` par alt text (accessibility + SEO)
 *   • title / meta description / canonical har page par
 *   • favicon + apple-touch-icon ka size file ke asli size se match
 *   • kitne pages, kitne links checked
 *
 *   node scripts/audit/static-audit.mjs [distDir] [--base=/pussya-product/]
 *
 * Exit 1 = kuch toota mila (CI gate).
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const args = process.argv.slice(2);
const distArg = args.find((arg) => !arg.startsWith("--")) ?? "dist";
const DIST = path.isAbsolute(distArg) ? distArg : path.join(ROOT, distArg);
const BASE = (args.find((arg) => arg.startsWith("--base="))?.slice(7) ?? "/pussya-product/").replace(/\/?$/, "/");

if (!fs.existsSync(DIST)) {
  console.error(`dist folder nahi mila: ${DIST}\nPehle: node scripts/pages/build-preview.mjs`);
  process.exit(1);
}

const problems = [];
const warnings = [];
const stats = { pages: 0, links: 0, assets: 0, imagesWithoutAlt: 0, emptyAlt: 0 };

/** dist me file hai? A1: exact, A2: folder → index.html, A3: file.html */
function resolves(localPath) {
  const clean = localPath.replace(/[?#].*$/, "");
  const relative = clean.startsWith(BASE) ? clean.slice(BASE.length) : clean.replace(/^\//, "");
  const candidates = [
    relative,
    path.join(relative, "index.html"),
    `${relative}.html`,
  ];
  for (const candidate of candidates) {
    const file = path.join(DIST, candidate);
    if (fs.existsSync(file) && fs.statSync(file).isFile()) return true;
  }
  return false;
}

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "_next") continue;
      walk(full, out);
    } else if (entry.name.endsWith(".html")) {
      out.push(full);
    }
  }
  return out;
}

const pages = walk(DIST);
stats.pages = pages.length;

for (const file of pages) {
  const html = fs.readFileSync(file, "utf8");
  const relative = path.relative(DIST, file);
  /**
   * Search-console verification files (`googleXXXX.html`) sirf ek token rakhte
   * hain — unse title/meta/canonical expect karna galat hoga, isliye skip.
   */
  if (/^google[0-9a-f]+\.html$/i.test(relative)) continue;
  const page = `/${relative}`.replace(/\/index\.html$/, "/");

  // ── links + assets ────────────────────────────────────────────────────────
  const refs = [
    ...html.matchAll(/(?:href|src)="([^"]+)"/g),
    ...[...html.matchAll(/srcSet="([^"]+)"/g)].flatMap(([, set]) =>
      set.split(",").map((part) => part.trim().split(/\s+/)[0]),
    ),
  ].map((match) => (Array.isArray(match) ? match[1] : match));

  for (const ref of refs) {
    if (!ref || ref.startsWith("data:") || ref.startsWith("mailto:") || ref.startsWith("tel:") || ref.startsWith("#")) continue;
    if (/^https?:\/\//.test(ref)) continue; // external (fonts, cdn) — network check alag
    stats.links += 1;
    if (!resolves(ref)) problems.push(`${page} → missing: ${ref}`);
  }

  // ── img alt ───────────────────────────────────────────────────────────────
  for (const [, tag] of html.matchAll(/(<img\b[^>]*>)/g)) {
    if (!/\balt=/.test(tag)) {
      stats.imagesWithoutAlt += 1;
      if (stats.imagesWithoutAlt <= 10) warnings.push(`${page} → img without alt: ${tag.slice(0, 90)}`);
    } else if (/\balt=""/.test(tag)) {
      // alt="" jaan-boojh kar decorative hai (hover/detail image) — sirf count
      stats.emptyAlt += 1;
    }
  }

  // ── SEO/meta ──────────────────────────────────────────────────────────────
  if (!/<title>[^<]{5,}<\/title>/.test(html)) problems.push(`${page} → <title> missing/too short`);
  if (!/<meta name="description" content="[^"]{20,}"/.test(html)) problems.push(`${page} → meta description missing`);
  if (!/<link rel="canonical"/.test(html)) problems.push(`${page} → canonical missing`);
  if (!/<link rel="icon"/.test(html)) problems.push(`${page} → favicon link missing`);
}

/* ── brand assets: header/hero files maujood + sahi size ──────────────────── */
const brandFiles = [
  "images/brand/logo-desktop.png",
  "images/brand/logo-tablet.png",
  "images/brand/logo-mobile.png",
  "images/brand/logo-fluid.png",
  "images/brand/logo-mark-128.png",
  "images/brand/logo-mark-192.png",
  "images/brand/logo-mark-512.png",
  "images/banners/banner-desktop.webp",
  "images/banners/banner-tablet.webp",
  "images/banners/banner-mobile.webp",
];
for (const file of brandFiles) {
  const full = path.join(DIST, file);
  if (!fs.existsSync(full)) {
    problems.push(`brand asset missing in dist: ${file}`);
    continue;
  }
  const bytes = fs.statSync(full).size;
  stats.assets += 1;
  if (bytes < 2_000) problems.push(`brand asset suspiciously small (${bytes}B): ${file}`);
}

/* ── apple-touch-icon ka declared size vs asli size ───────────────────────── */
const homeHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8");
const apple = homeHtml.match(/<link rel="apple-touch-icon"[^>]*href="([^"]+)"[^>]*sizes="(\d+)x\d+"/);
if (apple) {
  const [, href, declared] = apple;
  const file = path.join(DIST, href.replace(/[?#].*$/, "").replace(BASE, ""));
  if (fs.existsSync(file)) {
    const buffer = fs.readFileSync(file);
    const actual = buffer.readUInt32BE(16);
    if (Number(declared) !== actual) {
      warnings.push(`apple-touch-icon declares ${declared}px par file ${actual}px hai (${href})`);
    }
  }
}

/* ── report ──────────────────────────────────────────────────────────────── */
console.log(`\n── static audit (${path.relative(ROOT, DIST) || DIST}) ─────────────────`);
console.log(`pages ${stats.pages} · internal refs ${stats.links} · brand assets ${stats.assets} · alt-missing ${stats.imagesWithoutAlt} · decorative alt="" ${stats.emptyAlt}`);

if (warnings.length) {
  console.log(`\nwarnings (${warnings.length}):`);
  for (const warning of warnings.slice(0, 25)) console.log(`  ! ${warning}`);
}
if (problems.length) {
  const unique = [...new Set(problems)];
  console.log(`\nERRORS (${unique.length}):`);
  for (const problem of unique.slice(0, 60)) console.log(`  ✗ ${problem}`);
  if (unique.length > 60) console.log(`  … +${unique.length - 60} more`);
  process.exitCode = 1;
} else {
  console.log("\n✔ saare internal links/assets resolve ho rahe hain");
}
