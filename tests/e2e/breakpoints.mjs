/**
 * Breakpoint verifier — bina browser ke, served HTML/CSS se.
 *
 *   BASE_URL=http://127.0.0.1:3100 node tests/e2e/breakpoints.mjs
 *
 * Kaise: page ka HTML + compiled CSS padh kar har requested viewport ke liye
 * decide karte hain ki kaunsa `<source media="…">` match hoga (browser ka rule
 * "pehla matching source jeetta hai"), aur us asset ka asli pixel size nikalte hain.
 * Isse ye pakka hota hai ki 320px par mobile file, 768px par tablet, 1024px+ par
 * desktop file aayegi — aur koi viewport range khaali nahi chhoot rahi.
 *
 * Note: sandbox me Chromium available nahi hai (Playwright download blocked),
 * isliye real screenshot-based visual diff yahan nahi hota; ye checks markup +
 * asset dimensions par hain. Manual browser check ke liye: `npm run dev`.
 */
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const PUBLIC = path.resolve(import.meta.dirname, "../../apps/web/public");
const BASE_PATH = process.env.PAGES_BASE_PATH ?? "";

const VIEWPORTS = [
  { name: "iPhone SE · portrait", w: 320, h: 568, expect: "mobile" },
  { name: "Android small · portrait", w: 360, h: 800, expect: "mobile" },
  { name: "iPhone 12/13 · portrait", w: 390, h: 844, expect: "mobile" },
  { name: "iPhone 14 Pro Max", w: 430, h: 932, expect: "mobile" },
  { name: "iPad mini · portrait", w: 768, h: 1024, expect: "tablet" },
  { name: "iPad Air · portrait", w: 820, h: 1180, expect: "tablet" },
  { name: "iPad landscape / small laptop", w: 1024, h: 768, expect: "desktop" },
  { name: "Laptop", w: 1280, h: 800, expect: "desktop" },
  { name: "Laptop 1366", w: 1366, h: 768, expect: "desktop" },
  { name: "Desktop", w: 1440, h: 900, expect: "desktop" },
  { name: "Full HD", w: 1920, h: 1080, expect: "desktop" },
  // intermediate widths (resize ke dauraan koi gap na ho)
  { name: "intermediate 480", w: 480, h: 800, expect: "mobile" },
  { name: "intermediate 640", w: 640, h: 900, expect: "mobile" },
  { name: "intermediate 767 (last mobile px)", w: 767, h: 900, expect: "mobile" },
  { name: "intermediate 900", w: 900, h: 1000, expect: "tablet" },
  { name: "intermediate 1023 (last tablet px)", w: 1023, h: 900, expect: "tablet" },
  { name: "intermediate 1100", w: 1100, h: 800, expect: "desktop" },
  { name: "intermediate 1600", w: 1600, h: 900, expect: "desktop" },
];

let pass = 0;
const failures = [];
const check = (name, ok, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
};

const html = await (await fetch(`${BASE}/`)).text();

/** ek `<picture>` block (hero / brand) nikaalna */
function pictureBlock(marker) {
  const start = html.indexOf(marker);
  if (start === -1) return "";
  const end = html.indexOf("</picture>", start);
  return html.slice(start, end + "</picture>".length);
}

const hero = pictureBlock('data-testid="hero-banner"');
const brand = pictureBlock("brand-lockup");

/** `<source media="(min-width:Xpx)">` + default `<img src>` parse */
function parsePicture(block) {
  const sources = [...block.matchAll(/<source[^>]*media="\(min-width:(\d+)px\)"[^>]*srcSet="([^"]+)"/g)].map((m) => ({
    min: Number(m[1]),
    src: m[2],
  }));
  const img = block.match(/<img[^>]*src="([^"]+)"/)?.[1] ?? "";
  const width = Number(block.match(/<img[^>]*width="(\d+)"/)?.[1] ?? 0);
  const height = Number(block.match(/<img[^>]*height="(\d+)"/)?.[1] ?? 0);
  return { sources: sources.sort((a, b) => b.min - a.min), img, width, height };
}

const heroPic = parsePicture(hero);
const brandPic = parsePicture(brand);

console.log(`\nbreakpoints → ${BASE}\n`);
console.log(`  hero sources: ${heroPic.sources.map((s) => `${s.min}px→${s.src.split("/").pop()}`).join(", ")} · default ${heroPic.img.split("/").pop()}`);
console.log(`  brand sources: ${brandPic.sources.map((s) => `${s.min}px→${s.src.split("/").pop()}`).join(", ")} · default ${brandPic.img.split("/").pop()}\n`);

/** browser jaisa: pehla matching (sabse badi min-width) source jeetta hai */
function pick(pic, width) {
  for (const source of pic.sources) if (width >= source.min) return source.src;
  return pic.img;
}

const label = (src) => (src.includes("banner-") || src.includes("logo-") ? src.split("/").pop() : src);

/** aspect ratio helper */
const ratio = (w, h) => (w && h ? w / h : 0);

for (const viewport of VIEWPORTS) {
  const heroSrc = pick(heroPic, viewport.w);
  const brandSrc = pick(brandPic, viewport.w);
  const kind = heroSrc.includes("banner-mobile") ? "mobile" : heroSrc.includes("banner-tablet") ? "tablet" : "desktop";
  check(
    `${String(viewport.w).padStart(4)}×${viewport.h} ${viewport.name} → hero ${label(heroSrc)}`,
    kind === viewport.expect,
    `expected ${viewport.expect}`,
  );
  const brandKind = brandSrc.includes("logo-mobile") ? "mobile" : brandSrc.includes("logo-tablet") ? "tablet" : "desktop";
  check(
    `${String(viewport.w).padStart(4)}×${viewport.h} → logo ${label(brandSrc)}`,
    brandKind === viewport.expect,
    `expected ${viewport.expect}`,
  );
}

/* asset ke asli pixel size vs breakpoint (sharp/retina ke liye kaafi resolution?) */
const sizes = {};
for (const src of new Set([heroPic.img, ...heroPic.sources.map((s) => s.src), brandPic.img, ...brandPic.sources.map((s) => s.src)])) {
  const rel = src.replace(BASE_PATH, "").replace(/^\//, "");
  const file = path.join(PUBLIC, rel);
  try {
    const buffer = await fs.readFile(file);
    if (buffer.subarray(0, 4).toString() === "RIFF") {
      const chunk = buffer.subarray(12, 16).toString();
      if (chunk === "VP8X") sizes[src] = { w: 1 + buffer.readUIntLE(24, 3), h: 1 + buffer.readUIntLE(27, 3) };
      else if (chunk === "VP8L") {
        const bits = buffer.readUInt32LE(21);
        sizes[src] = { w: (bits & 0x3fff) + 1, h: ((bits >> 14) & 0x3fff) + 1 };
      } else sizes[src] = { w: buffer.readUInt16LE(26) & 0x3fff, h: buffer.readUInt16LE(28) & 0x3fff };
    } else if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
      sizes[src] = { w: buffer.readUInt32BE(16), h: buffer.readUInt32BE(20) };
    }
  } catch {
    sizes[src] = { w: 0, h: 0 };
  }
  check(`asset exists: ${label(src)}`, sizes[src].w > 0, "missing/unreadable");
}

/* hero ratio: har device asset ka ratio us breakpoint ke box se match kare (crop-free) */
const boxRatio = { mobile: 860 / 1290, tablet: 4 / 3, desktop: 1779 / 594 };
for (const [kind, expected] of Object.entries(boxRatio)) {
  const src = Object.keys(sizes).find((key) => key.includes(`banner-${kind}`));
  if (!src) continue;
  const actual = ratio(sizes[src].w, sizes[src].h);
  check(
    `${kind} banner ratio ${actual.toFixed(3)} matches CSS box ${expected.toFixed(3)} (no stretch/crop)`,
    Math.abs(actual - expected) < 0.02,
  );
}

/* retina: 2× screens ke liye asset kaafi bada hona chahiye */
const mobileAsset = sizes[heroPic.img];
check(
  "mobile banner ≥ 2× of a 430px phone (860px wide)",
  (mobileAsset?.w ?? 0) >= 860,
  `${mobileAsset?.w}px`,
);
const tabletAsset = sizes[heroPic.sources.find((s) => s.min === 768)?.src ?? ""];
check("tablet banner ≥ 1200px wide (retina iPad)", (tabletAsset?.w ?? 0) >= 1200, `${tabletAsset?.w}px`);
const desktopAsset = sizes[heroPic.sources.find((s) => s.min === 1024)?.src ?? ""];
// wide source se hero ke dono baked carousel arrows crop kar diye (1779×594) — asli
// asset ka width hi maximum hai, isliye retina laptop (1440 @1.2×) ke liye kaafi hai
check("desktop banner ≥ 1779px wide (full source width)", (desktopAsset?.w ?? 0) >= 1779, `${desktopAsset?.w}px`);

console.log(`\nbreakpoints: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  failures.forEach((failure) => console.log(`  ✗ ${failure}`));
  process.exitCode = 1;
}
