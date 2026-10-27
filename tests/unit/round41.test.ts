/**
 * Round 41 (27 Oct 2026) — owner ne teen Diwali posters diye aur teen saaf rules:
 *
 *  1. Desktop par **wahi desktop banner**, poori width, kuch crop nahi.
 *  2. Tablet par **alag tablet banner** (responsive, crop nahi).
 *  3. Mobile par **dedicated portrait banner** — logo + "UP TO 75% OFF" bada,
 *     "SHOP NOW" readable, stretch/cut nahi.
 *  4. "Free Shipping" **poori site se hata do** (teeno messages me repeat hua).
 *
 * Ye guards assets, config, CSS aur copy — chaaron ko check karte hain.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

const root = path.join(__dirname, "..", "..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");

const BANNERS = {
  desktop: "apps/web/public/images/banners/banner-desktop.webp",
  tablet: "apps/web/public/images/banners/banner-tablet.webp",
  mobile: "apps/web/public/images/banners/banner-mobile.webp",
} as const;

/* ------------------------------------------------------------- assets */

test("R41-1: teeno banner files maujood hain aur teeno alag art hain", async () => {
  const digests = new Map<string, string>();
  for (const [name, file] of Object.entries(BANNERS)) {
    assert.ok(exists(file), `${name} banner missing`);
    const buffer = fs.readFileSync(path.join(root, file));
    assert.ok(buffer.length > 20_000, `${name} banner suspiciously small`);
    digests.set(name, buffer.subarray(0, 4096).toString("base64"));
  }
  assert.equal(new Set(digests.values()).size, 3, "desktop/tablet/mobile alag files honi chahiye");
});

test("R41-2: banner ki asli dimensions config se match karti hain (crop/stretch nahi)", async () => {
  const config = read("apps/web/src/config/site.ts");
  const sizes = {
    desktop: { width: 1536, height: 1024 },
    tablet: { width: 1448, height: 1086 },
    mobile: { width: 941, height: 1672 },
  };
  for (const [name, expected] of Object.entries(sizes)) {
    const meta = await sharp(path.join(root, BANNERS[name as keyof typeof BANNERS])).metadata();
    assert.equal(meta.width, expected.width, `${name} width`);
    assert.equal(meta.height, expected.height, `${name} height`);
    assert.match(
      config,
      new RegExp(`${name}: \\{ width: ${expected.width}, height: ${expected.height} \\}`),
      `${name} size config me`,
    );
  }
  // mobile portrait hi rahe (kabhi landscape na ho jaye)
  const mobile = await sharp(path.join(root, BANNERS.mobile)).metadata();
  assert.ok((mobile.height ?? 0) > (mobile.width ?? 0), "mobile banner portrait hai");
  // desktop/tablet landscape
  for (const name of ["desktop", "tablet"] as const) {
    const meta = await sharp(path.join(root, BANNERS[name])).metadata();
    assert.ok((meta.width ?? 0) > (meta.height ?? 0), `${name} landscape hai`);
  }
});

test("R41-3: banner build script owner ke posters se banata hai (koi crop nahi)", () => {
  const script = read("scripts/brand/build-hero-banners.mjs");
  assert.match(script, /assets\/source\/banners/);
  assert.match(script, /fromOwnerBanners/, "owner posters ka path pehle try hota hai");
  // crop/extract/resize-to-box jaisi koi cheez owner branch me nahi honi chahiye
  const ownerBranch = script.slice(script.indexOf("async function fromOwnerBanners"), script.indexOf("const ownerSizes"));
  assert.doesNotMatch(ownerBranch, /\.extract\(/, "crop nahi hota");
  assert.doesNotMatch(ownerBranch, /\.resize\(/, "upscale/downscale force nahi hota");
  for (const file of ["banner-desktop.png", "banner-tablet.png", "banner-mobile.png"]) {
    assert.ok(exists(`assets/source/banners/${file}`), `source ${file}`);
  }
});

/* ------------------------------------------------------------- hero markup */

test("R41-4: hero par device-wise <picture> + exact aspect-ratio (crop nahi)", () => {
  const page = read("apps/web/src/app/page.tsx");
  const css = read("apps/web/src/app/globals.css");

  // teen breakpoints, teen files
  assert.match(page, /media="\(min-width:1024px\)" srcSet=\{heroBanners\.desktop\}/);
  assert.match(page, /media="\(min-width:768px\)" srcSet=\{heroBanners\.tablet\}/);
  assert.match(page, /src=\{heroBanners\.mobile\}/);

  // CSS ratios = asli file ratios
  assert.match(css, /\.hero-media \{[\s\S]*?aspect-ratio: 941 \/ 1672;/);
  assert.match(css, /@media \(min-width: 768px\)[\s\S]*?aspect-ratio: 1448 \/ 1086;/);
  assert.match(css, /@media \(min-width: 1024px\)[\s\S]*?aspect-ratio: 1536 \/ 1024;/);

  // `cover` crop karta hai — hero par kabhi nahi
  const heroCss = css.slice(css.indexOf("/* ---------- home hero"), css.indexOf("/* ----------", css.indexOf("/* ---------- home hero") + 10));
  assert.match(heroCss, /object-fit: contain/, "contain = poora poster dikhta hai");
  assert.doesNotMatch(heroCss, /object-fit: cover/, "cover text/logo kaat deta hai");

  // desktop par poori width
  assert.match(page, /max-w-\[1920px\]/, "desktop hero full width");
});

test("R41-5: hero par ab 75% claim hai (purana 70% nahi)", () => {
  const page = stripComments(read("apps/web/src/app/page.tsx"));
  assert.match(page, /75%/, "hero H1/aria par 75%");
  assert.doesNotMatch(page, /70% Off/, "purana 70% claim nahi");
});

/* ------------------------------------------------------------- free shipping */

test("R41-6: 'Free Shipping' poore storefront se hata hua hai", () => {
  const files: string[] = [];
  const walk = (dir: string) => {
    for (const entry of fs.readdirSync(path.join(root, dir), { withFileTypes: true })) {
      if (entry.name === "node_modules" || entry.name.startsWith(".")) continue;
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(rel);
      else if (/\.(tsx|md)$/.test(entry.name)) files.push(rel);
    }
  };
  walk("apps/web/src");

  const offenders: string[] = [];
  for (const file of files) {
    const text = stripComments(read(file));
    // sirf dikhne wali copy (identifier `freeShipping` / key `free_shipping` chalti hai)
    if (/free[\s-]shipping/i.test(text)) offenders.push(file);
  }
  assert.deepEqual(offenders, [], `free shipping copy mili: ${offenders.join(", ")}`);

  // cart summary me "Shipping ₹0" jaisa jhootha row bhi nahi
  const cart = read("apps/web/src/app/cart/page.tsx");
  assert.doesNotMatch(cart, /label="Shipping"/);
  // shipping policy me bhi claim nahi
  assert.doesNotMatch(read("apps/web/src/content/policies/shipping-policy.md"), /free shipping/i);
});
