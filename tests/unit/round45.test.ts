/**
 * Round 45 (27 Oct 2026) — owner: "header logo update kro ok and remaining bug fix kro".
 *
 * Owner ne naya **gold-emblem logo** (transparent, 2172×724) aur naya **clean
 * Diwali banner** (1672×941) diya. Is round me:
 *
 *  1. header/sab jagah naya logo (poora lockup, koi crop nahi),
 *  2. naya banner desktop + tablet (wahi 1672×941 frame) aur mobile portrait,
 *  3. `tablet` ke liye 3-up mockup sheet (`_unused-3up-sheet.png`) kabhi use na ho,
 *  4. favicon: root `/favicon.ico` (pehle 404 tha) + crown mark jo 16px par dikhta hai,
 *  5. manifest ka splash background cream (pehle kaala tha),
 *  6. footer ka saal hydration-safe.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import sharp from "sharp";

const root = path.join(process.cwd());
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));
const pngSize = (file: string) => {
  const buffer = fs.readFileSync(path.join(root, file));
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file}: PNG nahi hai`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
};

const LOCKUPS = {
  desktop: { file: "apps/web/public/images/brand/logo-desktop.png", height: 190 },
  tablet: { file: "apps/web/public/images/brand/logo-tablet.png", height: 164 },
  mobile: { file: "apps/web/public/images/brand/logo-mobile.png", height: 138 },
} as const;

test("R45-1: teeno header lockup naye gold logo (2.70:1) ke hain, koi crop nahi", async () => {
  const ratios: number[] = [];
  for (const [name, { file, height }] of Object.entries(LOCKUPS)) {
    assert.ok(exists(file), `${name} lockup missing`);
    const meta = await sharp(path.join(root, file)).metadata();
    assert.equal(meta.height, height, `${name} height`);
    ratios.push((meta.width ?? 0) / (meta.height ?? 1));
  }
  for (const ratio of ratios) {
    assert.ok(Math.abs(ratio - 2.7) < 0.08, `ratio ${ratio.toFixed(2)} — naya lockup 2.70:1 hai`);
  }
  // source wahi owner ka file hai (koi naya artwork/redraw nahi)
  assert.ok(exists("assets/source/logo-gold.png"), "owner ka gold logo source missing");
});

test("R45-2: hero banner asli owner poster se — desktop/tablet 1672×941, mobile 941×1672", async () => {
  const site = read("apps/web/src/config/site.ts");
  const expected = {
    desktop: { width: 1672, height: 941 },
    tablet: { width: 1672, height: 941 },
    mobile: { width: 941, height: 1672 },
  };
  for (const [name, size] of Object.entries(expected)) {
    const meta = await sharp(path.join(root, `apps/web/public/images/banners/banner-${name}.webp`)).metadata();
    assert.equal(meta.width, size.width, `${name} banner width`);
    assert.equal(meta.height, size.height, `${name} banner height`);
    assert.match(site, new RegExp(`${name}: \\{ width: ${size.width}, height: ${size.height} \\}`));
  }
  // 3-up mockup sheet kabhi source na bane
  const script = read("scripts/brand/build-hero-banners.mjs");
  assert.doesNotMatch(script, /banner-tablet\.png/, "3-up sheet source nahi honi chahiye");
  assert.match(script, /banner-desktop\.png/, "tablet bhi wahi clean banner use karta hai");
});

test("R45-3: root `/favicon.ico` maujood hai aur asli ICO hai (pehle 404 tha)", () => {
  const file = "apps/web/src/app/favicon.ico";
  assert.ok(exists(file), "app/favicon.ico missing — /favicon.ico 404 dega");
  const buffer = fs.readFileSync(path.join(root, file));
  assert.equal(buffer.readUInt16LE(0), 0, "ICO reserved");
  assert.equal(buffer.readUInt16LE(2), 1, "ICO type = icon");
  const count = buffer.readUInt16LE(4);
  assert.ok(count >= 2, `ICO me kam se kam 2 sizes (32+48), mile ${count}`);
  // entries me 32 aur 48 dono hon
  const sizes: number[] = [];
  for (let index = 0; index < count; index += 1) sizes.push(buffer.readUInt8(6 + index * 16));
  assert.ok(sizes.includes(32) && sizes.includes(48), `ICO sizes: ${sizes.join(",")}`);

  const layout = read("apps/web/src/app/layout.tsx");
  assert.match(layout, /assetUrl\("\/favicon\.ico"\)/, "favicon.ico page par declare hona chahiye");
});

test("R45-4: favicon mark square hai aur crown tile ko bhar raha hai (16px par dikhe)", async () => {
  for (const size of [128, 180, 192, 512]) {
    const meta = await sharp(path.join(root, `apps/web/public/images/brand/logo-mark-${size}.png`)).metadata();
    assert.equal(meta.width, size, `mark ${size} width`);
    assert.equal(meta.height, size, `mark ${size} height`);
  }
  // ink (non-white) pixels tile ke kam se kam 55% width aur 20% height me hone chahiye
  const { data, info } = await sharp(path.join(root, "apps/web/public/images/brand/logo-mark-128.png"))
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  let minX = info.width;
  let maxX = 0;
  let minY = info.height;
  let maxY = 0;
  for (let y = 0; y < info.height; y += 1) {
    for (let x = 0; x < info.width; x += 1) {
      const i = (y * info.width + x) * 3;
      if (data[i] < 240 || data[i + 1] < 235 || data[i + 2] < 230) {
        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);
      }
    }
  }
  const widthShare = (maxX - minX + 1) / info.width;
  const heightShare = (maxY - minY + 1) / info.height;
  assert.ok(widthShare > 0.55, `crown tile ki width ka sirf ${Math.round(widthShare * 100)}% hai`);
  assert.ok(heightShare > 0.2, `crown tile ki height ka sirf ${Math.round(heightShare * 100)}% hai`);
});

test("R45-5: manifest splash cream hai (kaala nahi) aur icons base path ke saath", () => {
  const manifest = read("apps/web/src/app/manifest.ts");
  assert.match(manifest, /background_color: "#fdfaf4"/, "splash background cream hona chahiye");
  assert.doesNotMatch(manifest, /background_color: "#000000"/, "kaala splash hata do");
  assert.match(manifest, /logo-mark-192\.png/, "192 icon");
  assert.match(manifest, /logo-mark-512\.png/, "512 icon");
});

test("R45-6: footer ka saal hydration-safe hai + brand version bump", () => {
  const footer = read("apps/web/src/components/site-footer.tsx");
  assert.match(footer, /suppressHydrationWarning[^>]*>© \{new Date\(\)\.getFullYear\(\)\}/, "saal client/server par alag ho sakta hai");
  assert.match(read("apps/web/src/config/site.ts"), /export const BRAND_V = "\?v=4"/, "naya logo = naya version");
});

test("R45-7: cache-busting version lagne ke baad headline assets v=4 maangte hain", () => {
  const site = read("apps/web/src/config/site.ts");
  for (const key of ["desktop", "tablet", "mobile", "fluid"]) {
    assert.ok(site.includes(`logo-${key}.png` + "${BRAND_V}"), `${key} par version`);
  }
  // header ka intrinsic size naye lockup ke hisaab se
  assert.match(read("apps/web/src/components/brand-mark.tsx"), /width=\{374\}\s*\n?\s*height=\{138\}/);
});
