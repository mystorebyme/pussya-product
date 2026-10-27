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

/**
 * 2. wordmark = "NOOR" + "ETHNIC WEAR" band.
 *
 * R43 (owner: "header me logo theek dikh nahi raha"): pehle crop H ke **55%** se
 * shuru hota tha, jo NOOR ke letters ka upar ka hissa (N/O ke curve) kaat deta
 * tha — header me adhoora logo dikhta tha. Ab wordmark ki asli top row image se
 * hi detect hoti hai (ink profile), isliye letters kabhi cut nahi hote.
 */
const wordmarkBox = await detectWordmarkBand(trimmed, W, H);
const wordmarkRaw = await sharp(trimmed)
  .extract(wordmarkBox)
  .trim({ threshold: 8 })
  .png()
  .toBuffer();
/**
 * Upar ka kinara halka fade: emblem me figure/dupatta letters se upar tak jaata
 * hai, isliye tight crop par upar "kata hua kapda" dikhta tha. Header me ye fade
 * white bar me ghul jaata hai — dikhta hai jaise design ka hissa ho, kata hua nahi.
 */
const wordmark = await fadeTopEdge(wordmarkRaw);

async function fadeTopEdge(input) {
  const meta = await sharp(input).metadata();
  const fadeHeight = Math.max(6, Math.round(meta.height * 0.18));
  const mask = Buffer.from(
    `<svg width="${meta.width}" height="${meta.height}" xmlns="http://www.w3.org/2000/svg">
       <defs>
         <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1">
           <stop offset="0" stop-color="#fff" stop-opacity="0"/>
           <stop offset="${(fadeHeight / meta.height).toFixed(3)}" stop-color="#fff" stop-opacity="1"/>
         </linearGradient>
       </defs>
       <rect width="100%" height="100%" fill="url(#fade)"/>
     </svg>`,
  );
  return sharp(input)
    .ensureAlpha()
    .composite([{ input: mask, blend: "dest-in" }])
    .png()
    .toBuffer();
}

/**
 * Row-wise ink profile se "NOOR" ka top dhoondhta hai: jahan row ki ink width
 * pehli baar poori width ke 22% se upar jaati hai (arch/figure ke patle hisse
 * isse neeche rehte hain, letters nahi).
 */
async function detectWordmarkBand(input, width, height) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const channels = info.channels;
  const ink = (y, fromX, toX) => {
    let count = 0;
    for (let x = fromX; x < toX; x += 1) {
      const i = (y * width + x) * channels;
      if (data[i + 3] > 10 && (data[i] < 238 || data[i + 1] < 238 || data[i + 2] < 238)) count += 1;
    }
    return count;
  };

  /**
   * NOOR ka top: letters ke tips **left/right taraf** hote hain (beech me figure
   * hai), isliye top sirf kinare wale hisson se detect karte hain — warna crop me
   * upar figure ki gardan/necklace ka kata hua tukda aa jaata tha.
   */
  const leftEdge = Math.round(width * 0.15);
  const rightEdge = Math.round(width * 0.85);
  let top = Math.round(height * 0.4);
  for (let y = Math.round(height * 0.35); y < height; y += 1) {
    const sideInk = ink(y, 0, leftEdge) + ink(y, rightEdge, width);
    if (sideInk >= 8 && ink(y + 1, 0, leftEdge) + ink(y + 1, rightEdge, width) >= 8) {
      top = Math.max(0, y - 4);
      break;
    }
  }

  /**
   * Band ka neeche ka kanta: NOOR ke baad ek chhota gap aata hai, phir "ETHNIC
   * WEAR" ki patli line, phir gap — aur uske baad bottom ka crown (jo bahut
   * chaura hai). Isliye pehle gap ko skip karke ETHNIC line tak jaate hain aur
   * **uske baad** wale gap par band rokte hain. Isse na letters kutte hain na
   * neeche ka crown ghus aata hai.
   */
  const x0 = Math.round(width * 0.12);
  const x1 = Math.round(width * 0.88);
  const isGap = (y) => ink(y, x0, x1) < 60 && ink(y + 1, x0, x1) < 60 && ink(y + 2, x0, x1) < 60;
  let bottom = height;
  let y = top + Math.round(height * 0.2);
  // 1) NOOR ke baad ka pehla gap chhod do
  while (y < height - 4 && !isGap(y)) y += 1;
  // 2) ETHNIC WEAR line shuru hone tak aage badho
  while (y < height - 4 && ink(y, x0, x1) < 100) y += 1;
  // 3) ETHNIC line ke baad ka gap = band ka end
  while (y < height - 4 && !isGap(y)) y += 1;
  bottom = Math.min(height, y + 10);

  return { left: 0, top, width, height: Math.max(40, bottom - top) };
}

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

await fs.writeFile(path.join(BRAND, "logo-desktop.png"), await horizontal(190));
await fs.writeFile(path.join(BRAND, "logo-tablet.png"), await horizontal(164));
await fs.writeFile(path.join(BRAND, "logo-mobile.png"), await horizontal(138));

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
