/**
 * R43 guards — owner: "header me jo logo dikh rahi hai wo fix karo / proper view dikhe".
 *
 * Bug tha: `build-responsive-assets.mjs` wordmark ko image ki height ke **55%** se
 * crop karta tha, isliye NOOR ke letters ka upar ka hissa (N/O ke curve) kat jaata
 * tha — header me adhoora logo. Ab crop ki top row image se detect hoti hai.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

const ROOT = process.cwd();

/** PNG ka width×height (dependency-free) */
function pngSize(file: string) {
  const buffer = fs.readFileSync(path.join(ROOT, file));
  assert.equal(buffer.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${file}: PNG nahi hai`);
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

test("R43-1: header lockup ka poora NOOR + ETHNIC WEAR band hai (kata hua nahi)", () => {
  const { width, height } = pngSize("apps/web/public/images/brand/logo-desktop.png");
  const ratio = width / height;
  // NOOR + ETHNIC WEAR ka natural ratio ~2.2–2.4 — patti (strip) ya adhoora crop nahi
  assert.ok(ratio > 2.0 && ratio < 2.6, `ratio ${ratio.toFixed(2)} (expected ~2.25)`);
  assert.ok(height >= 180, `desktop lockup ki height ${height}px — 66px display ke liye kam se kam 180px chahiye`);
  assert.ok(width >= 400, `desktop lockup ki width ${width}px`);
});

test("R43-2: teeno device lockup ek hi ratio ke hain (koi stretch nahi)", () => {
  const sizes = ["logo-mobile.png", "logo-tablet.png", "logo-desktop.png"].map((name) =>
    pngSize(`apps/web/public/images/brand/${name}`),
  );
  const ratios = sizes.map((size) => size.width / size.height);
  for (const ratio of ratios) {
    assert.ok(Math.abs(ratio - ratios[0]) < 0.02, `ratio mismatch: ${ratios.map((r) => r.toFixed(2)).join(" · ")}`);
  }
});

test("R43-3: crop script me purana 0.55 hardcode nahi (letters katt-te the)", () => {
  const source = fs.readFileSync(path.join(ROOT, "scripts/brand/build-responsive-assets.mjs"), "utf8");
  assert.ok(!/H \* 0\.55|height \* 0\.55/.test(source), "0.55 crop wapas aa gaya");
  assert.ok(source.includes("detectWordmarkBand"), "wordmark band detect hona chahiye");
});

test("R43-4: header logo bada hai par header bar me fit hota hai", () => {
  const css = fs.readFileSync(path.join(ROOT, "apps/web/src/app/globals.css"), "utf8");
  const heights = [...css.matchAll(/\.brand-lockup img \{[\s\S]*?height: (\d+)px/g)].map((m) => Number(m[1]));
  assert.deepEqual(heights.slice(0, 3), [44, 52, 58], `logo heights: ${heights.join(" → ")}`);

  const header = fs.readFileSync(path.join(ROOT, "apps/web/src/components/site-header.tsx"), "utf8");
  const bar = header.match(/grid h-\[(\d+)px\][^"]*sm:h-\[(\d+)px\][^"]*lg:h-\[(\d+)px\]/);
  assert.ok(bar, "header bar ki heights milni chahiye");
  const [, mobile, tablet, desktop] = bar!.map(Number);
  // logo (46/56/66) + thoda padding bar me fit ho, warna logo chipak jaata hai
  assert.ok(mobile >= 44 + 12, `mobile bar ${mobile}px chhota hai`);
  assert.ok(tablet >= 52 + 14, `tablet bar ${tablet}px chhota hai`);
  assert.ok(desktop >= 58 + 10, `desktop bar ${desktop}px chhota hai`);
});

test("R43-5: logo URL par cache-bust version hai (purana kata logo cache se na aaye)", () => {
  const site = fs.readFileSync(path.join(ROOT, "apps/web/src/config/site.ts"), "utf8");
  assert.match(site, /const BRAND_V = "\?v=\d+"/);
  for (const key of ["desktop", "tablet", "mobile", "fluid"]) {
    assert.match(
      site,
      new RegExp(`${key}: \`\\$\\{ASSET_BASE\\}/images/brand/logo-${key}\\.png\\$\\{BRAND_V\\}\``),
      `${key} asset par version missing hai`,
    );
  }
});

test("R43-6: favicon/PWA mark maujood hai aur square hai", () => {
  for (const size of [128, 192, 512]) {
    const image = pngSize(`apps/web/public/images/brand/logo-mark-${size}.png`);
    assert.equal(image.width, image.height, `logo-mark-${size}.png square nahi hai`);
  }
});
