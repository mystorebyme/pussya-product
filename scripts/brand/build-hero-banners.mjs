#!/usr/bin/env node
/**
 * Hero banners — owner ke **apne logo** se banaye gaye (koi doosre brand ka banner nahi).
 *
 * Rule: koi stock photo nahi, koi doosri site ka asset nahi. Sirf:
 *   • cream/gold background (brand palette),
 *   • logo ka illustration panel (aapke logo ka hi hissa),
 *   • wordmark + tagline text.
 *
 * Owner apne product photos dena chahe to bas `assets/source/hero-*.png` rakh kar
 * is script ko dobara chala dein — file names wahi rehte hain.
 *
 * Owner ke diye hue asli Diwali posters (`assets/source/banners/`) mile to **wahi**
 * use hote hain — sirf PNG → WebP conversion hota hai, **koi crop nahi, koi stretch
 * nahi** (poster ka poora frame, uska text/logo intact rehta hai). Na mile to niche
 * wala generated fallback chalta hai.
 *
 * Output (apps/web/public/images/banners/):
 *   banner-desktop.webp  1536×1024  (≥1024px, full frame)
 *   banner-tablet.webp   1448×1086  (768–1023px, full frame)
 *   banner-mobile.webp    941×1672  (<768px, portrait full frame)
 *   banner-fluid.webp    desktop ka fluid copy (flexible containers)
 *
 * Run: node scripts/brand/build-hero-banners.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const SRC = path.join(ROOT, "assets/source/logo-original.png");
const OUT = path.join(ROOT, "apps/web/public/images/banners");
const BRAND = path.join(ROOT, "apps/web/public/images/brand");

const CREAM = "#fdf8f0";
const MAROON = "#6b1220";
const GOLD = "#c9a449";

await fs.mkdir(OUT, { recursive: true });

/* ─────────── 1. owner ke asli posters (preferred) ───────────
   Har breakpoint ki apni file — tablet/mobile par desktop banner crop karne se
   logo aur "SHOP NOW" kat jaate the, isliye alag art use hoti hai. */
const OWNER_DIR = path.join(ROOT, "assets/source/banners");
const OWNER = [
  { name: "banner-desktop", src: "banner-desktop.png" },
  { name: "banner-tablet", src: "banner-tablet.png" },
  { name: "banner-mobile", src: "banner-mobile.png" },
];

async function fromOwnerBanners() {
  const found = [];
  for (const entry of OWNER) {
    const file = path.join(OWNER_DIR, entry.src);
    try {
      await fs.access(file);
    } catch {
      return null; // ek bhi missing → fallback (aadha-adhoor set kabhi nahi)
    }
    found.push({ ...entry, file });
  }
  const sizes = {};
  for (const entry of found) {
    const meta = await sharp(entry.file).metadata();
    // native size hi rakhte hain — upscale se poster blurry hota hai
    const webp = await sharp(entry.file)
      .webp({ quality: 84, effort: 5 })
      .toBuffer();
    await fs.writeFile(path.join(OUT, `${entry.name}.webp`), webp);
    sizes[entry.name] = { width: meta.width, height: meta.height };
  }
  // fluid fallback = desktop ka hi frame (aspect ratio kabhi nahi badalta)
  await fs.copyFile(path.join(OUT, "banner-desktop.webp"), path.join(OUT, "banner-fluid.webp"));
  return sizes;
}

const ownerSizes = await fromOwnerBanners();
if (ownerSizes) {
  console.log("hero banners ✔ (owner posters)", JSON.stringify(ownerSizes));
  process.exit(0);
}

const trimmed = await sharp(SRC).flatten({ background: "#ffffff" }).trim({ threshold: 8 }).png().toBuffer();
const { width: W, height: H } = await sharp(trimmed).metadata();

/** logo ka illustration hissa (arch + figure) — banner ka right panel */
const figure = await sharp(trimmed)
  .extract({
    left: Math.round(W * 0.18),
    top: 0,
    width: Math.round(W * 0.64),
    height: Math.round(H * 0.44),
  })
  .trim({ threshold: 8 })
  .flatten({ background: "#ffffff" })
  .png()
  .toBuffer();

/** wordmark (NOOR + ETHNIC WEAR) — banner ka headline */
const wordmark = await sharp(trimmed)
  .extract({ left: 0, top: Math.round(H * 0.55), width: W, height: H - Math.round(H * 0.55) })
  .trim({ threshold: 8 })
  .png()
  .toBuffer();

/** letterspaced small text (tagline) — SVG se, koi font dependency nahi */
function text(text, { size, color = MAROON, spacing = 8, weight = 400, width, height }) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <text x="50%" y="50%" text-anchor="middle" dominant-baseline="middle"
      font-family="Georgia, 'Times New Roman', serif" font-size="${size}" font-weight="${weight}"
      letter-spacing="${spacing}" fill="${color}">${text}</text>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** gold hairline (ornament) */
function rule(width) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="14">
    <line x1="0" y1="7" x2="${Math.round(width * 0.4)}" y2="7" stroke="${GOLD}" stroke-width="1.4"/>
    <line x1="${Math.round(width * 0.6)}" y1="7" x2="${width}" y2="7" stroke="${GOLD}" stroke-width="1.4"/>
    <circle cx="${width / 2}" cy="7" r="4" fill="${GOLD}"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

/** cream background with a soft gold halo */
function background(width, height) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
    <defs>
      <radialGradient id="glow" cx="50%" cy="42%" r="62%">
        <stop offset="0%" stop-color="#fffdf9"/>
        <stop offset="100%" stop-color="${CREAM}"/>
      </radialGradient>
    </defs>
    <rect width="${width}" height="${height}" fill="url(#glow)"/>
    <rect x="18" y="18" width="${width - 36}" height="${height - 36}" fill="none" stroke="${GOLD}" stroke-width="1.2" opacity="0.55"/>
    <rect x="28" y="28" width="${width - 56}" height="${height - 56}" fill="none" stroke="${GOLD}" stroke-width="0.6" opacity="0.4"/>
  </svg>`;
  return sharp(Buffer.from(svg)).png().toBuffer();
}

const TAGLINE = "ETHNIC WEAR FOR WEDDINGS &amp; FESTIVALS";
const SUBLINE = "ANARKALI  ·  LEHENGA CHOLI  ·  SUIT SETS";

/**
 * Ek banner banao — sab kuch vertically stack + center.
 * White-background assets `multiply` se mila jaate hain, isliye cream background
 * par unka safed box nahi dikhta (koi cut-out jhanjhat nahi).
 */
async function banner(width, height, { figureHeight, wordmarkWidth, tagSize, subSize }) {
  const fig = await sharp(figure).resize({ height: figureHeight, fit: "inside" }).png().toBuffer();
  const figMeta = await sharp(fig).metadata();
  const wm = await sharp(wordmark).resize({ width: wordmarkWidth, fit: "inside" }).png().toBuffer();
  const wmMeta = await sharp(wm).metadata();
  const tag = await text(TAGLINE, { size: tagSize, spacing: Math.round(tagSize * 0.28), width, height: tagSize * 2 });
  const sub = await text(SUBLINE, { size: subSize, color: "#7b6a55", spacing: Math.round(subSize * 0.22), width, height: subSize * 2 });
  const ruleW = Math.min(520, Math.round(width * 0.42));
  const line = await rule(ruleW);

  const gapAfterFigure = 4;
  const gapAfterWordmark = 10;
  const gapAfterTag = 8;
  const gapAfterLine = 12;
  const blockH =
    figMeta.height + gapAfterFigure + wmMeta.height + gapAfterWordmark + tagSize * 2 + gapAfterTag + 14 + gapAfterLine + subSize * 2;

  let y = Math.max(26, Math.round((height - blockH) / 2));
  const layers = [];
  layers.push({ input: fig, top: y, left: Math.round((width - figMeta.width) / 2), blend: "multiply" });
  y += figMeta.height + gapAfterFigure;
  layers.push({ input: wm, top: y, left: Math.round((width - wmMeta.width) / 2), blend: "multiply" });
  y += wmMeta.height + gapAfterWordmark;
  layers.push({ input: tag, top: y, left: 0 });
  y += tagSize * 2 + gapAfterTag;
  layers.push({ input: line, top: y, left: Math.round((width - ruleW) / 2) });
  y += 14 + gapAfterLine;
  layers.push({ input: sub, top: y, left: 0 });

  return sharp(await background(width, height)).composite(layers).webp({ quality: 90 }).toBuffer();
}

/** mobile: same stack, par portrait canvas me bada aur saaf */
async function mobileBanner(width, height) {
  const fig = await sharp(figure).resize({ height: Math.round(height * 0.3), fit: "inside" }).png().toBuffer();
  const figMeta = await sharp(fig).metadata();
  const wm = await sharp(wordmark).resize({ width: Math.round(width * 0.8), fit: "inside" }).png().toBuffer();
  const wmMeta = await sharp(wm).metadata();
  const tag = await text(TAGLINE, { size: 21, spacing: 5, width, height: 44 });
  const sub = await text(SUBLINE, { size: 13, color: "#7b6a55", spacing: 3, width, height: 32 });
  const ruleW = Math.round(width * 0.58);
  const line = await rule(ruleW);

  const blockH = figMeta.height + 6 + wmMeta.height + 18 + 44 + 10 + 14 + 16 + 32;
  let y = Math.max(40, Math.round((height - blockH) / 2) - Math.round(height * 0.04));
  const layers = [];
  layers.push({ input: fig, top: y, left: Math.round((width - figMeta.width) / 2), blend: "multiply" });
  y += figMeta.height + 6;
  layers.push({ input: wm, top: y, left: Math.round((width - wmMeta.width) / 2), blend: "multiply" });
  y += wmMeta.height + 18;
  layers.push({ input: tag, top: y, left: 0 });
  y += 44 + 10;
  layers.push({ input: line, top: y, left: Math.round((width - ruleW) / 2) });
  y += 14 + 16;
  layers.push({ input: sub, top: y, left: 0 });

  return sharp(await background(width, height)).composite(layers).webp({ quality: 90 }).toBuffer();
}

await fs.writeFile(path.join(OUT, "banner-desktop.webp"), await banner(1779, 594, { figureHeight: 210, wordmarkWidth: 430, tagSize: 22, subSize: 14 }));
await fs.writeFile(path.join(OUT, "banner-fluid.webp"), await banner(1600, 534, { figureHeight: 190, wordmarkWidth: 380, tagSize: 20, subSize: 13 }));
await fs.writeFile(path.join(OUT, "banner-tablet.webp"), await banner(1200, 900, { figureHeight: 300, wordmarkWidth: 520, tagSize: 24, subSize: 15 }));
await fs.writeFile(path.join(OUT, "banner-mobile.webp"), await mobileBanner(860, 1290));

console.log("hero banners ✔");
