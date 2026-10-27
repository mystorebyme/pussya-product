#!/usr/bin/env node
/**
 * Responsive brand assets — **owner ke diye hue ek hi logo** se.
 *
 * Rule: koi redraw nahi, koi naya letter-shape nahi. Sirf trim / crop / resize.
 *
 * Input (repo me committed):
 *   assets/source/logo-original.png   ← owner ka official Noor Ethnic Wear logo
 *
 * Output (apps/web/public/images/):
 *   brand/logo-desktop.png   horizontal lockup (wordmark + ETHNIC WEAR), ≥1024px
 *   brand/logo-tablet.png    wahi, 768–1023px
 *   brand/logo-mobile.png    wahi, <768px (sabse compact)
 *   brand/logo-fluid.png     poora logo (arch + figure + wordmark) — footer/invoice
 *   brand/logo-mark-{128,192,512}.png  arch mark (favicon, PWA, admin, invoice)
 *   images/og-image.jpg      1200×630 social card
 *
 * Run: node scripts/brand/build-responsive-assets.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "assets/source/logo-original.png");
const OUT = path.join(ROOT, "apps/web/public/images");
const BRAND = path.join(OUT, "brand");

/** logo ka background safed hai — isi se sab files ka base banta hai */
const PAPER = { r: 255, g: 255, b: 255, alpha: 1 };

await fs.mkdir(BRAND, { recursive: true });

/** 1. safed border trim — poora logo */
const trimmed = await sharp(SRC)
  .flatten({ background: "#ffffff" })
  .trim({ threshold: 8 })
  .png()
  .toBuffer();
const { width: W, height: H } = await sharp(trimmed).metadata();

/** 2. wordmark = neeche ka hissa (NOOR + ETHNIC WEAR + ornament line) */
const wordmark = await sharp(trimmed)
  .extract({ left: 0, top: Math.round(H * 0.55), width: W, height: H - Math.round(H * 0.55) })
  .trim({ threshold: 8 })
  .png()
  .toBuffer();

/**
 * 3. mark = poora logo white square me (favicon / PWA / invoice) — koi crop nahi,
 *    isliye figure ya letter kabhi aadhe nahi dikhte.
 */
const markSource = trimmed;

/** horizontal lockup — di gayi height par, white background bana kar */
async function horizontal(height) {
  return sharp(wordmark)
    .resize({ height, fit: "contain", background: PAPER })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer();
}

await fs.writeFile(path.join(BRAND, "logo-desktop.png"), await horizontal(150));
await fs.writeFile(path.join(BRAND, "logo-tablet.png"), await horizontal(130));
await fs.writeFile(path.join(BRAND, "logo-mobile.png"), await horizontal(112));

/** stacked / fluid — poora logo (footer, invoice, koi bhi container) */
await fs.writeFile(
  path.join(BRAND, "logo-fluid.png"),
  await sharp(trimmed)
    .resize({ height: 400, fit: "contain", background: PAPER })
    .flatten({ background: "#ffffff" })
    .png({ compressionLevel: 9 })
    .toBuffer(),
);

/** square mark — arch ko white square me center (favicon/PWA/admin/invoice) */
for (const size of [128, 192, 512]) {
  const inner = Math.round(size * 0.86);
  const scaled = await sharp(markSource).resize({ width: inner, height: inner, fit: "inside" }).png().toBuffer();
  await sharp({ create: { width: size, height: size, channels: 3, background: "#ffffff" } })
    .composite([{ input: scaled, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND, `logo-mark-${size}.png`));
}

/** social card 1200×630 */
const ogLogo = await sharp(trimmed).resize({ height: 430, fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#fdfaf4" } })
  .composite([{ input: ogLogo, gravity: "center" }])
  .jpeg({ quality: 92 })
  .toFile(path.join(OUT, "og-image.jpg"));

console.log("brand assets ✔  (source", `${W}×${H})`);
