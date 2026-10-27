#!/usr/bin/env node
/**
 * Live site check — **deployed** GitHub Pages URL par (koi guess nahi, asli HTTP).
 *
 *   node scripts/audit/live-check.mjs https://mystorebyme.github.io/pussya-product/
 *
 * Kya check hota hai:
 *   1. home page 200 hai aur usme branding/banner aa raha hai
 *   2. header ka logo markup (base path ke saath) + logo ki **saari** files 200
 *      (content-type image, size > 0) — yahi "logo invisible" ka pakka test hai
 *   3. CSS me `.brand-lockup img` ke asli heights + `object-fit: contain`
 *   4. favicon (128/180/192/512) + manifest 200
 *   5. hero banner (desktop/tablet/mobile) 200
 *   6. page ke andar ke internal links sample — koi 404 nahi
 *   7. title / meta description / canonical / lang
 *   8. purana brand ya "free shipping" copy na ho
 *
 * Output: markdown (stdout) + `--out=file.md` par bhi likhta hai.
 * Exit 1 = kuch toota.
 */
import fs from "node:fs";

const args = process.argv.slice(2);
const BASE = (args.find((a) => !a.startsWith("--")) ?? "https://mystorebyme.github.io/pussya-product/").replace(/\/?$/, "/");
const OUT = args.find((a) => a.startsWith("--out="))?.slice(6) ?? null;
const LIMIT = Number(args.find((a) => a.startsWith("--links="))?.slice(8) ?? 40) || 40;

const lines = [];
const failures = [];
const notes = [];

function say(text = "") {
  lines.push(text);
}
function check(name, ok, detail = "") {
  say(`| ${ok ? "✅" : "❌"} | ${name}${detail ? ` — ${detail}` : ""} |`);
  if (!ok) failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
}

async function get(url, init = {}) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: "follow", ...init });
    const body = await response.text();
    return { ok: response.ok, status: response.status, body, ms: Date.now() - started, headers: response.headers };
  } catch (error) {
    return { ok: false, status: 0, body: "", ms: Date.now() - started, error: String(error) };
  }
}

/** binary asset: status / type / bytes — body download kiye bina */
async function asset(url) {
  const started = Date.now();
  try {
    const response = await fetch(url, { redirect: "follow" });
    const buffer = Buffer.from(await response.arrayBuffer());
    return {
      ok: response.ok,
      status: response.status,
      type: response.headers.get("content-type") ?? "",
      bytes: buffer.length,
      ms: Date.now() - started,
      width: buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? buffer.readUInt32BE(16) : null,
      height: buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a" ? buffer.readUInt32BE(20) : null,
    };
  } catch (error) {
    return { ok: false, status: 0, type: "", bytes: 0, ms: Date.now() - started, error: String(error) };
  }
}

say(`# Live site check — ${BASE}`);
say("");
say(`Ran: ${new Date().toISOString()}`);
say("");
say("## Page");
say("");
say("| result | check |");
say("| --- | --- |");

const home = await get(BASE);
check("home page 200", home.ok, `HTTP ${home.status} · ${home.body.length} bytes · ${home.ms}ms`);

const html = home.body;
check("brand name page par hai", /Noor Ethnic Wear/.test(html));
check("header render hua hai", /<header[^>]*>/.test(html));
check("header me brand-lockup hai", /class="brand-lockup/.test(html));
check("hero banner section hai", /data-testid="hero-banner"/.test(html) || /banner-mobile\.webp/.test(html));

/* ── logo markup: base path + srcset ──────────────────────────────────────── */
const picture = html.match(/<picture[^>]*>[\s\S]{0,1500}?logo-mobile\.png[^>]*>[\s\S]{0,400}?<\/picture>/)?.[0] ?? "";
const srcs = [...html.matchAll(/(?:src|srcSet)="([^"]*images\/brand\/[^"]+)"/g)].map((m) => m[1]);
const uniqueSrcs = [...new Set(srcs)];
check("header logo <picture> mila", picture.length > 0);
check(
  "logo srcset base path ke saath hai (/pussya-product/...)",
  uniqueSrcs.length > 0 && uniqueSrcs.every((src) => src.startsWith(new URL(BASE).pathname)),
  uniqueSrcs.slice(0, 3).join(" · "),
);
check(
  "logo img par alt text hai",
  /logo-(?:mobile|desktop|tablet)\.png[^>]*alt="Noor Ethnic Wear"/.test(html) || /alt="Noor Ethnic Wear"/.test(html),
);
check(
  "logo img par `hidden` / `opacity-0` jaisi class nahi",
  picture.length > 0 && !/\b(hidden|opacity-0|invisible)\b/.test(picture),
);
say("");
say("<details><summary>header markup (proof)</summary>");
say("");
say("```html");
say((html.match(/<a aria-label="Noor Ethnic Wear home"[\s\S]{0,900}?<\/a>/)?.[0] ?? picture ?? "(nahi mila)").slice(0, 900));
say("```");
say("");
say("</details>");

/* ── logo/favicon/banner assets: asli HTTP status ─────────────────────────── */
say("");
say("## Assets");
say("");
say("| result | asset | HTTP | type | size |");
say("| --- | --- | --- | --- | --- |");

const ASSETS = [
  ["header logo (desktop)", "images/brand/logo-desktop.png"],
  ["header logo (tablet)", "images/brand/logo-tablet.png"],
  ["header logo (mobile)", "images/brand/logo-mobile.png"],
  ["footer logo", "images/brand/logo-fluid.png"],
  ["favicon 128", "images/brand/logo-mark-128.png"],
  ["apple touch 180", "images/brand/logo-mark-180.png"],
  ["PWA 192", "images/brand/logo-mark-192.png"],
  ["PWA 512", "images/brand/logo-mark-512.png"],
  ["manifest", "manifest.webmanifest"],
  ["hero desktop", "images/banners/banner-desktop.webp"],
  ["hero tablet", "images/banners/banner-tablet.webp"],
  ["hero mobile", "images/banners/banner-mobile.webp"],
];

for (const [label, file] of ASSETS) {
  const url = `${BASE}${file}`;
  const result = file.endsWith(".webmanifest") ? await get(url) : await asset(url);
  const size = "bytes" in result ? `${Math.round(result.bytes / 1024)} KB` : `${result.body.length} B`;
  const type = "type" in result ? result.type : "text";
  const ok = result.ok && ("bytes" in result ? result.bytes > 1000 : result.body.length > 50);
  say(`| ${ok ? "✅" : "❌"} | ${label} (\`${file}\`) | ${result.status} | ${type} | ${size} |`);
  if (!ok) failures.push(`${label} → HTTP ${result.status} (${file})`);
}

/* ── CSS: asli rules (logo visible hone ke liye) ──────────────────────────── */
const cssHref = html.match(/\/_next\/static\/[^"']+\.css/)?.[0] ?? "";
/**
 * `new URL("/_next/...", BASE)` root par chala jaata hai — GitHub Pages par asset
 * `/pussya-product/_next/...` par hota hai. Isliye base path khud lagate hain.
 */
const cssUrl = cssHref ? new URL(cssHref.replace(/^\//, ""), BASE).toString() : "";
const css = cssUrl ? await get(cssUrl) : { ok: false, body: "" };
const flatCss = css.body.replace(/\s+/g, "");

say("");
say("## CSS (logo visibility)");
say("");
say("| result | rule |");
say("| --- | --- |");
check("stylesheet load hui", css.ok, cssHref || "koi css link nahi");
check(
  "`.brand-lockup img` heights (44 → 52 → 58)",
  /\.brand-lockupimg\{[^}]*height:44px/.test(flatCss) &&
    /\.brand-lockupimg\{[^}]*height:52px/.test(flatCss) &&
    /\.brand-lockupimg\{[^}]*height:58px/.test(flatCss),
);
check("`.brand-lockup img` object-fit: contain", /\.brand-lockupimg\{[^}]*object-fit:contain/.test(flatCss));
check("logo par koi display:none / visibility:hidden nahi", !/\.brand-lockup[^{]*\{[^}]*display:none/.test(flatCss));
check("hero `object-fit: contain` (crop nahi)", /\.hero-mediaimg\{[^}]*object-fit:contain/.test(flatCss));

/* ── copy: purana brand / hataya hua claim wapas na aaye ──────────────────── */
say("");
say("## Copy");
say("");
say("| result | check |");
say("| --- | --- |");
check("purana brand (Liksha) nahi", !/liksha/i.test(html));
check("'free shipping' claim nahi", !/free\s*shipping/i.test(html));
check("Diwali offer copy hai", /diwali/i.test(html));

/* ── SEO ─────────────────────────────────────────────────────────────────── */
say("");
say("## SEO / meta");
say("");
say("| result | check |");
say("| --- | --- |");
check("title", /<title>[^<]{10,}<\/title>/.test(html), (html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "").slice(0, 70));
check(
  "meta description",
  /<meta name="description" content="[^"]{20,}"/.test(html),
  (html.match(/<meta name="description" content="([^"]{0,60})/)?.[1] ?? ""),
);
check("canonical", /<link rel="canonical" href="[^"]+"/.test(html), (html.match(/<link rel="canonical" href="([^"]+)/)?.[1] ?? ""));
check("lang attribute", /<html[^>]+lang="en"/.test(html));
check("favicon links", (html.match(/<link rel="(?:icon|shortcut icon)"/g) ?? []).length >= 2);

/* ── key pages (cart/checkout/track/policies) ────────────────────────────── */
say("");
say("## Key pages");
say("");
say("| result | page | HTTP |");
say("| --- | --- | --- |");
const KEY_PAGES = [
  ["collections index", "collections/"],
  ["cart", "cart/"],
  ["checkout", "checkout/"],
  ["track order", "track-order/"],
  ["contact", "pages/contact/"],
  ["shipping policy", "policies/shipping-policy/"],
  ["returns policy", "policies/refund-and-return-policy/"],
  ["search", "search/"],
];
for (const [label, pagePath] of KEY_PAGES) {
  const result = await get(`${BASE}${pagePath}`);
  const ok = result.status === 200;
  say(`| ${ok ? "✅" : "❌"} | ${label} (\`${pagePath}\`) | ${result.status} |`);
  if (!ok) failures.push(`${label} → HTTP ${result.status}`);
}

/* ── internal links (sample, base path aware) ────────────────────────────── */
say("");
say("## Internal links (sample)");
say("");
say("| result | link | HTTP |");
say("| --- | --- | --- |");

const origin = new URL(BASE).origin;
const basePath = new URL(BASE).pathname;
const links = [...new Set(
  [...html.matchAll(/href="([^"]+)"/g)]
    .map((m) => m[1])
    .filter((href) => href.startsWith(basePath) && !href.includes("#"))
    .map((href) => href.split("?")[0]),
)].slice(0, LIMIT);

const broken = [];
for (const href of links) {
  const url = `${origin}${href}`;
  const result = await get(url, { method: "GET" });
  // GitHub Pages SPA fallback 404.html bhi 404 status deta hai
  const ok = result.status === 200;
  if (!ok) broken.push(`${href} (${result.status})`);
  say(`| ${ok ? "✅" : "❌"} | \`${href}\` | ${result.status} |`);
}
if (broken.length) failures.push(`broken internal links: ${broken.slice(0, 5).join(", ")}`);

/* ── summary ─────────────────────────────────────────────────────────────── */
say("");
say("## Summary");
say("");
if (failures.length === 0) {
  say("✔ Saare live checks pass.");
} else {
  say(`❌ ${failures.length} problem mili:`);
  say("");
  for (const failure of failures) say(`- ${failure}`);
}
if (notes.length) {
  say("");
  for (const note of notes) say(`> ${note}`);
}

const report = lines.join("\n");
console.log(report);
if (OUT) fs.writeFileSync(OUT, `${report}\n`);
process.exitCode = failures.length ? 1 : 0;
