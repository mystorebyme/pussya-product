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

/**
 * Kaunsa URL check karna hai? Owner ne Pages par custom domain
 * (`noorethnicwear.store`) lagaya hai — us haalat me GitHub `*.github.io/<repo>/`
 * par 403 deta hai. Isliye pehle diya gaya URL, phir custom domain, phir
 * github.io — jo pehla zinda (200 + brand) mile wahi use hota hai.
 */
const CANDIDATES = [
  args.find((a) => !a.startsWith("--")),
  process.env.LIVE_BASE_URL,
  "https://noorethnicwear.store/",
  "http://noorethnicwear.store/",
  "https://mystorebyme.github.io/pussya-product/",
]
  .filter((value) => typeof value === "string" && value.trim())
  .map((value) => value.trim().replace(/\/?$/, "/"))
  .filter((value, index, list) => list.indexOf(value) === index);

let BASE = await pickBase();

async function pickBase() {
  for (const candidate of CANDIDATES) {
    const probe = await get(candidate);
    if (probe.ok && /noor ethnic wear/i.test(probe.body)) return candidate;
  }
  return CANDIDATES[0];
}
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

/** JSON POST (Apps Script) — CORS preflight se bachne ke liye text/plain */
async function post(url, payload) {
  try {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify(payload),
      redirect: "follow",
    });
    const text = await response.text();
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {}
    return { ok: response.ok, status: response.status, json, text };
  } catch (error) {
    return { ok: false, status: 0, json: null, text: String(error) };
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
if (CANDIDATES.length > 1) say(`\n> URLs tried (first live one wins): ${CANDIDATES.join(" · ")}`);
say("");
say(`Ran: ${new Date().toISOString()}`);
say("");
say("## Page");
say("");
say("| result | check |");
say("| --- | --- |");

const home = await get(BASE);
check("home page 200", home.ok, `HTTP ${home.status} · ${home.body.length} bytes · ${home.ms}ms`);

let html = home.body;

/**
 * Base path HTML se hi pata kar lo.
 *
 * Site do tarah se deploy ho sakti hai:
 *   - custom domain root      → assets `/_next/…`
 *   - project page subpath    → assets `/pussya-product/_next/…`
 * Agar checks galat prefix par chalein to sab asset 404 dikhta hai (jhoothi
 * failure). Isliye page ke pehle asset URL se prefix nikaal kar BASE ko
 * usi prefix par set kar dete hain.
 */
{
  const detected = html.match(/(?:src|href)="([^"]*?)_next\/static\//)?.[1] ?? null;
  if (detected !== null) {
    const current = new URL(BASE).pathname.replace(/\/$/, "");
    const prefix = detected.replace(/\/$/, "");
    if (prefix !== current) {
      BASE = `${new URL(BASE).origin}${prefix}/`;
      notes.push(`base path HTML se detect hua: "${prefix || "/"}" → checks ${BASE} par`);
    }
  }
}

/* ── deploy propagation wait ──────────────────────────────────────────────────
 * Ye workflow push ke turant baad chalta hai, par GitHub Pages naya build
 * publish karne me 1–3 minute leta hai. Purane HTML/CSS par nayi checks
 * chalane se jhooti failure aati hai (aur purana CSS chunk 404 deta hai).
 * Isliye pehle **naya deploy aane tak** rukte hain: jab tak home page ka CSS
 * R49 ka marker (`#a10d1b` = footer gradient) na de. `LIVE_WAIT_MS=0` = band.
 */
const cssHrefOf = (pageHtml) => pageHtml.match(/\/_next\/static\/[^"']+\.css/)?.[0] ?? "";
const cssUrlOf = (href) => (href ? new URL(href.replace(/^\//, ""), BASE).toString() : "");

let deployedCss = { ok: false, body: "", status: 0 };
{
  const firstHref = cssHrefOf(html);
  if (firstHref) deployedCss = await get(cssUrlOf(firstHref));

  const waitBudgetMs = Number(process.env.LIVE_WAIT_MS ?? 240_000);
  const started = Date.now();
  while (waitBudgetMs > 0 && !deployedCss.body.includes("#a10d1b")) {
    const waited = Date.now() - started;
    if (waited > waitBudgetMs) break;
    await new Promise((resolve) => setTimeout(resolve, 15_000));
    const fresh = await get(`${BASE}?deploy=${Date.now()}`);
    const href = cssHrefOf(fresh.body);
    if (fresh.ok && href) {
      html = fresh.body; // naye deploy ka HTML (links/assets isi se check honge)
      deployedCss = await get(cssUrlOf(href));
    }
    if (deployedCss.body.includes("#a10d1b")) {
      notes.push(`deploy propagation: ${Math.round((Date.now() - started) / 1000)}s wait kiya`);
      break;
    }
  }
}
check("brand name page par hai", /Noor Ethnic Wear/.test(html));
check("header render hua hai", /<header[^>]*>/.test(html));
check("header me brand-lockup hai", /class="brand-lockup/.test(html));
check("hero banner section hai", /data-testid="hero-banner"/.test(html) || /banner-mobile\.webp/.test(html));

/* ── R50: WhatsApp-first (koi payment option nahi, FAB har page par) ──────── */
check(
  "no payment UI on the storefront (no 'Pay on UPI', no UPI deep link)",
  !/Pay on UPI/.test(html) && !/upi:\/\//.test(html) && !/data-testid="upi-open"/.test(html),
);
check(
  "home par WhatsApp flow ka zikr hai (koi payment claim nahi)",
  /WhatsApp/.test(html) && !/Secure UPI|Pay online/i.test(html),
);
{
  /** href already `/pussya-product/products/…` hota hai — base path dobara na jode */
  const productHref = html.match(/href="[^"]*\/products\/[a-z0-9-]+\/?"/)?.[0]?.slice(6, -1) ?? "";
  const basePath = new URL(BASE).pathname; // `/` ya `/pussya-product/`
  const productUrl = productHref
    ? new URL(`${basePath}${productHref.replace(basePath, "").replace(/^\//, "")}`.replace(/\/+/g, "/"), BASE).toString()
    : "";
  const productPage = productUrl ? await get(productUrl) : { ok: false, body: "" };
  const fab = (pageHtml) => pageHtml.includes('data-testid="whatsapp-fab"') && /wa\.me\//.test(pageHtml);
  check("WhatsApp FAB home par (bottom-right)", fab(html));
  check("WhatsApp FAB product page par bhi", productPage.ok && fab(productPage.body));
  check("Daily Special ribbon ya maroon announcement strip hai", /data-testid="daily-special"|data-testid="announcement/.test(html) || /Order in the bag/.test(html));
}

/* ── R50b: Apps Script par naya `place_order` deploy hua hai ya nahi ─────── */
{
  const url = (process.env.SHEETS_WEBAPP_URL ?? "").trim();
  if (url) {
    /**
     * **Jaan-boojh kar khaali order** bhejte hain: naya script `no_items` ke saath
     * mana kar deta hai (kuch likha nahi jaata), purana script `unauthorized`
     * kehta hai. Isse pata chal jaata hai ki Sheet me order jayega ya nahi —
     * bina ek bhi fake row banaye.
     */
    const probe = await post(url, { action: "place_order", order: { customer: {} } });
    check(
      "Apps Script par naya order code deploy hua hai (place_order)",
      probe.json?.code === "no_items",
      probe.json?.code === "no_items"
        ? "place_order live hai — order seedha Sheet me jayega"
        : `nahi — mila: ${probe.json?.code ?? probe.json?.error ?? probe.status} · Sheet me Apps Script ka naya code paste karke Deploy → New version karein`,
    );
  } else {
    notes.push("SHEETS_WEBAPP_URL set nahi — place_order probe skip");
  }
}

/* ── R50: build ne sheet se settings li ya nahi (site par proof file) ─────── */
{
  const proof = await get(`${BASE}preview-settings.json`);
  if (proof.ok) {
    try {
      const data = JSON.parse(proof.body);
      notes.push(`build settings: ${data.attempt ?? "?"}`);
      check(
        "build ne sheet se number liya (bake hua)",
        data.whatsappSet === true,
        data.whatsappSet ? `${data.numberDigits} digits` : `nahi — ${data.attempt ?? "unknown"}`,
      );
      /**
       * R50b: order seedha browser se Apps Script par jaata hai (Sheet me row).
       * Is URL ke bina order sirf WhatsApp tak jaata hai — owner ko Sheet me
       * kuch nahi milta. Isliye ise explicitly check karte hain.
       */
      check(
        "checkout order seedha Sheet (Apps Script) me jaata hai",
        data.sheetOrderUrlSet === true,
        data.sheetOrderUrlSet ? "web app URL build me hai" : "NEXT_PUBLIC_SHEETS_WEBAPP_URL bake nahi hua",
      );
    } catch {
      check("preview-settings.json parse hui", false, proof.body.slice(0, 80));
    }
  }
}

/* ── R50: sheet ka asli number live hai? (FAB seedha chat kholta hai) ─────── */
{
  const numbers = [...html.matchAll(/wa\.me\/(\d{10,15})/g)].map((m) => m[1]).filter(Boolean);
  const unique = [...new Set(numbers)];
  check(
    "WhatsApp number sheet se live aaya (wa.me/<10+ digits>)",
    unique.length > 0,
    unique.length ? `${unique.length} link · …${unique[0].slice(-4)}` : "wa.me par number nahi mila (chat picker = sheet se number nahi aaya)",
  );
  check(
    "number ek hi hai (header/footer/FAB me mismatch nahi)",
    unique.length <= 1,
    unique.join(" · "),
  );
  const clean = (value) => value.replace(/\D/g, "").slice(-10);
  check(
    "number 10 digit ka valid Indian mobile hai",
    unique.length > 0 && /^[6-9]\d{9}$/.test(clean(unique[0])),
    unique.length ? clean(unique[0]).replace(/\d{6}$/, "XXXXXX") : "—",
  );
}

/* ── R50: checkout par WhatsApp hand-off (koi payment step nahi) ──────────── */
{
  const checkout = await get(`${BASE}checkout/`);
  check("checkout page 200", checkout.ok, `HTTP ${checkout.status}`);
  const checkoutHtml = checkout.body;
  check(
    "checkout page par WhatsApp hand-off copy hai",
    /WhatsApp/.test(checkoutHtml) && !/Pay on UPI/.test(checkoutHtml),
  );
  check(
    "checkout par koi payment step / UPI nahi",
    !checkoutHtml.includes('data-testid="checkout-payment-step"') && !/Pay on UPI/.test(checkoutHtml),
  );
  check(
    "checkout copy English hai (koi Hinglish marker nahi)",
    !/\b(kariye|kijiye|daaliye|dijiye|nahi|chahiye|jayega|aapka|aapki)\b/i.test(checkoutHtml),
  );
}

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
  ["hero fluid", "images/banners/banner-fluid.webp"],
  ["favicon.ico", "favicon.ico"],
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

/* ── per-viewport: kaunsi logo file + kya resolution kaafi hai ───────────── */
say("");
say("## Logo per viewport (browser ka `<source>` selection)");
say("");
say("| result | viewport | file | display height | file width | required |");
say("| --- | --- | --- | --- | --- | --- |");

const sources = [...(picture.matchAll(/<source media="\(min-width:(\d+)px\)"\s+srcSet="([^"]+)"/g) ?? [])]
  .map(([, minWidth, href]) => ({ min: Number(minWidth), href }))
  .sort((a, b) => b.min - a.min); // browser: pehla matching (sabse bada min-width) jeetta hai
const fallbackImg = picture.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? "";
const logoHeights = { 0: 46, 768: 54, 1024: 60 }; // R45: globals.css ke mutabik

for (const width of [320, 375, 390, 430, 768, 1024, 1366, 1440]) {
  const chosen = sources.find((source) => width >= source.min)?.href ?? fallbackImg;
  const heightForWidth = width >= 1024 ? logoHeights[1024] : width >= 768 ? logoHeights[768] : logoHeights[0];
  const file = chosen.split("?")[0];
  const url = new URL(file, BASE).toString();
  const meta = await asset(url);
  const required = heightForWidth * 2; // 2× DPR
  const ok = meta.ok && (meta.width ?? 0) >= required;
  say(
    `| ${ok ? "✅" : "❌"} | ${width}px | \`${file.split("/").pop()}\` | ${heightForWidth}px | ${meta.width ?? "?"}px | ≥ ${required}px |`,
  );
  if (!ok) failures.push(`logo @${width}px → ${file} (HTTP ${meta.status}, width ${meta.width ?? 0})`);
}

/* ── CSS: asli rules (logo visible hone ke liye) ──────────────────────────── */
const css = deployedCss;
const cssHref = cssHrefOf(html);
const flatCss = css.body.replace(/\s+/g, "");

say("");
say("## CSS (logo visibility)");
say("");
say("| result | rule |");
say("| --- | --- |");
check("stylesheet load hui", css.ok, cssHref || "koi css link nahi");
check(
  "`.brand-lockup img` heights (46 → 54 → 60)",
  /\.brand-lockupimg\{[^}]*height:46px/.test(flatCss) &&
    /\.brand-lockupimg\{[^}]*height:54px/.test(flatCss) &&
    /\.brand-lockupimg\{[^}]*height:60px/.test(flatCss),
);
check("`.brand-lockup img` object-fit: contain", /\.brand-lockupimg\{[^}]*object-fit:contain/.test(flatCss));
check("logo par koi display:none / visibility:hidden nahi", !/\.brand-lockup[^{]*\{[^}]*display:none/.test(flatCss));
check("hero `object-fit: contain` (crop nahi)", /\.hero-mediaimg\{[^}]*object-fit:contain/.test(flatCss));
/* R47: icons khud ko draw karte hain + reduced-motion par band */
check(
  "category icon animation CSS live hai",
  /\.cat-icon\.cat-icon-line\{[^}]*stroke-dashoffset:1/.test(flatCss) && flatCss.includes("prefers-reduced-motion"),
);
check(
  "smooth page transition CSS live hai",
  /\.page-enter\{[^}]*animation:/.test(flatCss) && flatCss.includes("scroll-padding-top:118px"),
);
/* R48: palette polish + PDP hover zoom CSS live hai */
check(
  "R48 palette + CTA sheen CSS live hai",
  /--noor-gold:#a67c2e/.test(flatCss) && /\.cta-sheen::?after\{/.test(flatCss) && flatCss.includes("@keyframesctaSheen"),
);
/* R49: har button me feel (hover lift + press), maroon CTA par colour+sheen,
   footer maroon gradient — sab CSS-only, isliye scroll par lag nahi */
check(
  "R49 button feel CSS live hai (hover lift + press)",
  flatCss.includes("translateY(-1.5px)") && flatCss.includes("scale(.972)"),
);
check(
  "R49 maroon CTA par gradient + gold sheen live hai",
  flatCss.includes("#9a2b2b") && /button\[class\*=["']?bg-/.test(flatCss),
);
check("R49 footer maroon gradient + gold hairline live hai", flatCss.includes("#a10d1b"));

check(
  "R48 PDP hover zoom CSS live hai (base image hat jaye)",
  /\.gallery-slide\{[^}]*transition:opacity/.test(flatCss) &&
    /\.gallery-zoom\{[^}]*transition:opacity/.test(flatCss),
);
/* R46 (owner): ek hi offer poster har device/window size par — ratio sab par same */
check(
  "hero ratio har breakpoint par ek hi (1672/941, koi portrait nahi)",
  flatCss.includes("aspect-ratio:1672/941") && !flatCss.includes("aspect-ratio:941/1672"),
);

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

/* ── favicon / brand mark (R45: root /favicon.ico 404 tha) ───────────────── */
const favicon = await asset(`${BASE}favicon.ico`);
check(
  "root `/favicon.ico` 200 hai (browser ka default request)",
  favicon.ok && /icon/i.test(favicon.type),
  `HTTP ${favicon.status} · ${favicon.type} · ${favicon.bytes} bytes`,
);
const ico = await fetch(`${BASE}favicon.ico`).then((r) => (r.ok ? r.arrayBuffer() : null)).catch(() => null);
const icoBytes = ico ? Buffer.from(ico) : Buffer.alloc(0);
check(
  "`/favicon.ico` asli ICO file hai (00 00 01 00 magic)",
  icoBytes.length > 600 && icoBytes.readUInt16LE(0) === 0 && icoBytes.readUInt16LE(2) === 1,
  icoBytes.length ? `${icoBytes.length} bytes · ${icoBytes.readUInt16LE(4)} icons` : "nahi mila",
);
check("favicon page par declare hai", /rel="shortcut icon"[^>]*favicon\.ico/.test(html) || /favicon\.ico/.test(html));

const marks = await Promise.all([128, 180, 192, 512].map((size) => asset(`${BASE}images/brand/logo-mark-${size}.png`)));
check(
  "brand mark PNGs (128/180/192/512) square + maujood",
  marks.every((mark, index) => mark.ok && mark.width === [128, 180, 192, 512][index] && mark.height === mark.width),
  marks.map((mark) => `${mark.width}×${mark.height}`).join(" · "),
);


/* ── R47: header items + size guide page ─────────────────────────────────── */
check("header menu (bars) icon", /aria-label="Open menu"/.test(html));
check("header Size guide (panel button)", /data-testid="header-size-guide"/.test(html));
check("header Our story link", /data-testid="header-our-story"/.test(html) && /\/pages\/about-us/.test(html));
check("category icons page par hain (unique)", [...new Set([...html.matchAll(/data-icon="([a-z]+)"/g)].map((m) => m[1]))].length >= 6);

/* ── R48: category circles ki images unique + size guide ka poora content ── */
const circleImages = [...html.matchAll(/data-testid="category-circle"[\s\S]{0,700}?<img src="([^"]+)"/g)].map(
  (match) => match[1].split("?")[0],
);
check(
  "7 category circles, har ek ki alag image",
  circleImages.length === 7 && new Set(circleImages).size === circleImages.length,
  `${circleImages.length} circles · ${new Set(circleImages).size} unique`,
);

const sizeGuide = await get(`${BASE}pages/size-guide/`);
const sizeGuideHtml = sizeGuide.body;
check(
  "size guide: 3 tabs (Measurements Chart / Find My Size / How to Measure)",
  ["size-tab-chart", "size-tab-find", "size-tab-how"].every((id) => sizeGuideHtml.includes(`data-testid="${id}"`)),
);
check(
  "size guide: inches/centimeters toggle",
  sizeGuideHtml.includes('data-testid="size-unit-toggle"') &&
    sizeGuideHtml.includes("Inches (in)") &&
    sizeGuideHtml.includes("Centimeters (cm)"),
);
check(
  "size guide: chart XS se XXL (front length column ke saath)",
  sizeGuideHtml.includes(">XS<") && sizeGuideHtml.includes(">XXL<") && sizeGuideHtml.includes("Front Length"),
);
check(
  "size guide: unstitched suit note (2.5 m + 2.25 m + XS to 5XL)",
  sizeGuideHtml.includes('data-testid="unstitched-note"') &&
    sizeGuideHtml.includes("2.5 m") &&
    sizeGuideHtml.includes("2.25 m") &&
    /XS to 5XL/.test(sizeGuideHtml),
);
check(
  "size guide: front length value 46 (inches) chart me",
  /data-column="frontLength"[^>]*>46</.test(sizeGuideHtml),
);

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
  ["size guide", "pages/size-guide/"],
  ["our story", "pages/about-us/"],
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
