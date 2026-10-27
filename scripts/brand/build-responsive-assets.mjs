#!/usr/bin/env node
/**
 * Responsive brand assets — **owner ke diye hue logo** se (koi redraw nahi).
 *
 * R45 (owner ne naya gold-emblem logo bheja, transparent PNG):
 *   input : assets/source/logo-gold.png   (2172×724, alpha)
 *   output: apps/web/public/images/brand/
 *     logo-desktop.png        header lockup, ≥1024px  (height 190)
 *     logo-tablet.png         header lockup, 768–1023 (height 164)
 *     logo-mobile.png         header lockup, <768     (height 138)
 *     logo-fluid.png          footer / invoice        (height 400)
 *     logo-mark-{128,180,192,512}.png  crown emblem, square (favicon / PWA / Apple)
 *     ../../og-image.jpg      social card
 *
 * Pehle wala script purane logo (arch + lady figure) ki height ke 55% par crop
 * karta tha — letters kat jaate the. Naye logo me **poora lockup** hi hai (NOOR +
 * crown + ETHNIC WEAR), isliye crop ki zaroorat hi nahi: sirf white/transparent
 * border trim + resize.
 *
 * Run: node scripts/brand/build-responsive-assets.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "assets/source/logo-gold.png");
const FALLBACK_SRC = path.join(ROOT, "assets/source/logo-original.png");
const OUT = path.join(ROOT, "apps/web/public/images");
const APP = path.join(ROOT, "apps/web/src/app");
const BRAND = path.join(OUT, "brand");

await fs.mkdir(BRAND, { recursive: true });

const source = (await fs.stat(SRC).catch(() => null)) ? SRC : FALLBACK_SRC;
if (!(await fs.stat(source).catch(() => null))) {
  console.error(`logo source nahi mila: ${SRC}\nAssets/source me owner ka transparent logo rakhein.`);
  process.exit(1);
}

/** 1. transparent/border trim — poora lockup (crown + NOOR + ETHNIC WEAR) */
const trimmed = await sharp(source).trim({ threshold: 1 }).png().toBuffer();
const { width: W, height: H } = await sharp(trimmed).metadata();

/* ────────────────────────────── header lockups ───────────────────────────── */

/** horizontal lockup — di gayi height par, aspect ratio bilkul same (no stretch) */
async function lockup(height) {
  return sharp(trimmed)
    .resize({ height, fit: "contain", withoutEnlargement: false })
    .png({ compressionLevel: 9, adaptiveFiltering: true })
    .toBuffer();
}

await fs.writeFile(path.join(BRAND, "logo-desktop.png"), await lockup(190));
await fs.writeFile(path.join(BRAND, "logo-tablet.png"), await lockup(164));
await fs.writeFile(path.join(BRAND, "logo-mobile.png"), await lockup(138));
await fs.writeFile(path.join(BRAND, "logo-fluid.png"), await lockup(400));

/* ─────────────────────────────── square mark ─────────────────────────────
 * Favicon/app icon me poora wordmark daalne par 16px par kuch padha nahi jaata.
 * Isliye logo ke **crown emblem** ka hi crop (top-center) use karte hain — wahi
 * owner ke design ka hissa hai, koi naya symbol nahi.
 * ───────────────────────────────────────────────────────────────────────────*/
const crown = await detectCrown(trimmed, W, H);
const crownImage = await sharp(trimmed).extract(crown).png().toBuffer();

/**
 * Square icons: crown ko **poori width** par baithate hain — 78% inset se 16px
 * tab par kuch bacha hi nahi tha. White tile, kyunki favicon light UI par dikhta hai.
 */
for (const size of [128, 180, 192, 512]) {
  const inner = await sharp(crownImage)
    .resize({ width: Math.round(size * 0.92), height: Math.round(size * 0.92), fit: "inside" })
    .png()
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: inner, gravity: "center" }])
    .png({ compressionLevel: 9 })
    .toFile(path.join(BRAND, `logo-mark-${size}.png`));
}

/* ─────────────────────────── favicon.ico (root) ────────────────────────────
 * Browsers (aur kuch crawlers/social bots) `/favicon.ico` **seedha** maangte hain.
 * R45: wo path 404 tha. ICO container me PNG entries daal dete hain (32+48) —
 * wahi crown mark, koi naya artwork nahi.
 * ───────────────────────────────────────────────────────────────────────────*/
/** square white tile + crown (wahi jo logo-mark me hai), diye gaye size par */
async function crownTile(size) {
  const inner = await sharp(crownImage)
    .resize({ width: Math.round(size * 0.92), height: Math.round(size * 0.92), fit: "inside" })
    .png()
    .toBuffer();
  return sharp({ create: { width: size, height: size, channels: 4, background: { r: 255, g: 255, b: 255, alpha: 1 } } })
    .composite([{ input: inner, gravity: "center" }])
    .png()
    .toBuffer();
}

async function buildIco(sizes) {
  const images = [];
  for (const size of sizes) images.push({ size, png: await crownTile(size) });

  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(images.length, 4);

  const entries = [];
  let offset = 6 + images.length * 16;
  for (const image of images) {
    const entry = Buffer.alloc(16);
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 0); // width
    entry.writeUInt8(image.size >= 256 ? 0 : image.size, 1); // height
    entry.writeUInt8(0, 2); // palette
    entry.writeUInt8(0, 3); // reserved
    entry.writeUInt16LE(1, 4); // colour planes
    entry.writeUInt16LE(32, 6); // bits per pixel
    entry.writeUInt32LE(image.png.length, 8);
    entry.writeUInt32LE(offset, 12);
    offset += image.png.length;
    entries.push(entry);
  }
  return Buffer.concat([header, ...entries, ...images.map((image) => image.png)]);
}

// browsers 16/32/48 par maangte hain — ico me wahi (128/192 PNG icons alag se hain)
const faviconIco = await buildIco([48, 32]);
await fs.writeFile(path.join(APP, "favicon.ico"), faviconIco);

/**
 * Crown = lockup ka sabse upar wala **gold** emblem (crimson NOOR letters ke
 * theek upar). Detection, koi fixed 0.4/0.26 andaza nahi:
 *   1. upar ki 22% patti (letters ka upar ka hissa isse bahar rehta hai),
 *   2. us patti me sirf **gold** pixels (`g > 80` aur `g > b + 25`) — crimson
 *      letters isse alag ho jaate hain,
 *   3. column runs ko merge karke **beech wala** cluster = crown + side dots,
 *   4. height = 23.5% (crown ke neeche letters ka kinara nahi aata).
 */
async function detectCrown(input, width, height) {
  const bandHeight = Math.max(40, Math.round(height * 0.22));
  const { data } = await sharp(input)
    .extract({ left: 0, top: 0, width, height: bandHeight })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const isGold = (x, y) => {
    const i = (y * width + x) * 4;
    return data[i + 3] > 40 && data[i + 1] > 80 && data[i + 1] > data[i + 2] + 25;
  };

  const columns = new Array(width).fill(0);
  for (let y = 0; y < bandHeight; y += 1) {
    for (let x = 0; x < width; x += 1) if (isGold(x, y)) columns[x] += 1;
  }

  const runs = [];
  let runStart = null;
  for (let x = 0; x < width; x += 1) {
    const ink = columns[x] > 1;
    if (ink && runStart === null) runStart = x;
    if (!ink && runStart !== null) {
      runs.push({ start: runStart, end: x - 1 });
      runStart = null;
    }
  }
  if (runStart !== null) runs.push({ start: runStart, end: width - 1 });

  // monochrome logo / koi gold nahi → beech ka 40% (safe default)
  if (!runs.length) {
    return { left: Math.round(width * 0.3), top: 0, width: Math.round(width * 0.4), height: Math.round(height * 0.27) };
  }

  // side dots aur leaves ke beech ka chhota gap merge
  const merged = [];
  for (const run of runs) {
    const last = merged[merged.length - 1];
    if (last && run.start - last.end <= Math.round(width * 0.025)) last.end = run.end;
    else merged.push({ ...run });
  }

  const centre = width / 2;
  const cluster =
    merged.find((run) => run.start <= centre && run.end >= centre) ??
    merged.reduce((best, run) => (run.end - run.start > best.end - best.start ? run : best), merged[0]);

  const pad = Math.round(width * 0.02);
  const left = Math.max(0, cluster.start - pad);
  const right = Math.min(width, cluster.end + pad);
  return { left, top: 0, width: right - left, height: Math.round(height * 0.235) };
}

/* ─────────────────────────────── social card ─────────────────────────────── */
const ogLogo = await sharp(trimmed).resize({ height: 420, fit: "contain" }).png().toBuffer();
await sharp({ create: { width: 1200, height: 630, channels: 3, background: "#fdfaf4" } })
  .composite([{ input: ogLogo, gravity: "center" }])
  .jpeg({ quality: 92 })
  .toFile(path.join(OUT, "og-image.jpg"));

console.log("favicon.ico ✔", `${faviconIco.length} bytes`);
console.log("brand assets ✔  (source", `${W}×${H})`, "· crown", `${crown.width}×${crown.height}`);
