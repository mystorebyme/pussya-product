/**
 * Responsive proof sheet — bina browser ke, asli assets + asli CSS sizes se.
 *
 *   node scripts/brand/render-proof.mjs
 *   → docs/assets/responsive-proof.png
 *
 * Kyun: sandbox me Chromium nahi chalta (Playwright download blocked), isliye
 * screenshot nahi le sakte. Ye script wahi geometry use karti hai jo CSS me hai
 * (header height 66/74/80, logo 40/50/46, hero aspect 860/1290 · 4/3 · 2043/594)
 * aur usi asset ko composite karti hai jo `<picture>` us width par chunta hai.
 * Isse overlap/overflow aankhon se check ho jaata hai — pixel geometry real hai.
 */
import fs from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

const ROOT = path.resolve(import.meta.dirname, "../..");
const IMAGES = path.join(ROOT, "apps/web/public/images");
const OUT = path.join(ROOT, "docs/assets/responsive-proof.png");

const DEVICES = [
  { label: "Mobile 320×568", w: 320, headerH: 66, logo: "brand/logo-mobile.png", banner: "banners/banner-mobile.webp", bannerRatio: 860 / 1290, icons: 2 },
  { label: "Mobile 390×844", w: 390, headerH: 66, logo: "brand/logo-mobile.png", banner: "banners/banner-mobile.webp", bannerRatio: 860 / 1290, icons: 2 },
  { label: "Mobile 430×932", w: 430, headerH: 66, logo: "brand/logo-mobile.png", banner: "banners/banner-mobile.webp", bannerRatio: 860 / 1290, icons: 2 },
  { label: "Tablet 768×1024", w: 768, headerH: 74, logo: "brand/logo-tablet.png", banner: "banners/banner-tablet.webp", bannerRatio: 4 / 3, icons: 4 },
  { label: "Tablet 820×1180", w: 820, headerH: 74, logo: "brand/logo-tablet.png", banner: "banners/banner-tablet.webp", bannerRatio: 4 / 3, icons: 4 },
  { label: "Laptop 1024×768", w: 1024, headerH: 80, logo: "brand/logo-desktop.png", banner: "banners/banner-desktop.webp", bannerRatio: 1779 / 594, icons: 4 },
  { label: "Desktop 1440×900", w: 1440, headerH: 80, logo: "brand/logo-desktop.png", banner: "banners/banner-desktop.webp", bannerRatio: 1779 / 594, icons: 4 },
  { label: "Full HD 1920×1080", w: 1920, headerH: 80, logo: "brand/logo-desktop.png", banner: "banners/banner-desktop.webp", bannerRatio: 1779 / 594, icons: 4 },
];

const LOGO_HEIGHT = { 66: 40, 74: 50, 80: 46 };
const FONT = "DejaVu Sans, Helvetica, Arial, sans-serif";

function svg(width, height, body) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${body}</svg>`,
  );
}

const panels = [];

for (const device of DEVICES) {
  const headerH = device.headerH;
  const logoH = LOGO_HEIGHT[headerH];
  const bannerH = Math.round(device.w / device.bannerRatio);
  const panelH = headerH + bannerH + 46; // + announcement strip space ke liye label

  const logo = await sharp(path.join(IMAGES, device.logo)).resize({ height: logoH }).toBuffer();
  const logoMeta = await sharp(logo).metadata();
  const logoW = logoMeta.width ?? 0;
  const banner = await sharp(path.join(IMAGES, device.banner))
    .resize({ width: device.w, height: bannerH, fit: "fill" })
    .toBuffer();

  const menuX = 12;
  const iconSize = 22;
  const iconsW = device.icons * (iconSize + 10);
  const logoX = Math.round((device.w - logoW) / 2); // mobile: centred grid
  const logoXDesktop = 24;
  const isDesktop = device.w >= 1024;
  const finalLogoX = isDesktop ? logoXDesktop : Math.max(menuX + 34, logoX);

  const composites = [
    { input: banner, top: headerH, left: 0 },
    { input: logo, top: Math.round((headerH - logoH) / 2), left: finalLogoX },
  ];

  const overlays = [];
  // announcement strip
  overlays.push(`<rect x="0" y="0" width="${device.w}" height="0" fill="none"/>`);
  // hamburger (mobile/tablet) ya nav hint (desktop)
  if (!isDesktop) {
    overlays.push(
      `<g stroke="#2f2a25" stroke-width="1.6" stroke-linecap="round">
         <path d="M${menuX + 3} ${headerH / 2 - 6}h16M${menuX + 3} ${headerH / 2}h16M${menuX + 3} ${headerH / 2 + 6}h16"/>
       </g>`,
    );
  } else {
    overlays.push(
      `<text x="${finalLogoX + logoW + 40}" y="${headerH / 2 + 4}" font-family="${FONT}" font-size="11" fill="#2f2a25" letter-spacing="1">HOME</text>
       <text x="${finalLogoX + logoW + 100}" y="${headerH / 2 + 4}" font-family="${FONT}" font-size="11" fill="#2f2a25" letter-spacing="1">SHOP</text>
       <text x="${finalLogoX + logoW + 165}" y="${headerH / 2 + 4}" font-family="${FONT}" font-size="11" fill="#2f2a25" letter-spacing="1">ANARKALI</text>
       <text x="${finalLogoX + logoW + 255}" y="${headerH / 2 + 4}" font-family="${FONT}" font-size="11" fill="#2f2a25" letter-spacing="1">LEHENGA</text>
       <text x="${finalLogoX + logoW + 345}" y="${headerH / 2 + 4}" font-family="${FONT}" font-size="11" fill="#2f2a25" letter-spacing="1">SALE</text>`,
    );
  }
  // icons (search, wishlist, cart, account) right aligned
  for (let index = 0; index < device.icons; index += 1) {
    const x = device.w - 16 - (device.icons - index) * (iconSize + 10) + 6;
    overlays.push(
      `<g stroke="#2f2a25" stroke-width="1.5" fill="none">
         <rect x="${x}" y="${headerH / 2 - 9}" width="18" height="18" rx="${index % 2 === 0 ? 3 : 9}"/>
       </g>`,
    );
  }
  // label
  overlays.push(
    `<rect x="0" y="${headerH + bannerH}" width="${device.w}" height="46" fill="#1d1a17"/>
     <text x="16" y="${headerH + bannerH + 20}" font-family="${FONT}" font-size="13" fill="#ffffff">${device.label}</text>
     <text x="16" y="${headerH + bannerH + 36}" font-family="${FONT}" font-size="11" fill="#c9bda9">logo ${logoH}px · ${path.basename(device.logo)} · hero ${path.basename(device.banner)} (${device.w}×${bannerH})</text>`,
  );

  composites.push({ input: svg(device.w, panelH, overlays.join("")), top: 0, left: 0 });

  const panel = await sharp({
    create: { width: device.w, height: panelH, channels: 4, background: "#ffffff" },
  })
    .composite(composites)
    .png()
    .toBuffer();

  panels.push({ ...device, panel, panelH });
  console.log(`  ${device.label}: logo ${logoW}×${logoH} @ x${finalLogoX} · hero ${device.w}×${bannerH}`);
}

/* sheet layout — mobiles ek row, tablets ek row, desktops ek ke neeche ek */
const padding = 24;
const ROWS = [
  ["Mobile 320×568", "Mobile 390×844", "Mobile 430×932"],
  ["Tablet 768×1024", "Tablet 820×1180"],
  ["Laptop 1024×768"],
  ["Desktop 1440×900"],
  ["Full HD 1920×1080"],
];

const sheetW = 1980;
const layers = [];
let top = padding;
for (const row of ROWS) {
  const rowPanels = row.map((label) => panels.find((panel) => panel.label === label)).filter(Boolean);
  const rowH = Math.max(...rowPanels.map((panel) => panel.panelH));
  let left = padding;
  for (const panel of rowPanels) {
    layers.push({ input: panel.panel, top, left });
    left += panel.w + 18;
  }
  top += rowH + padding;
}

await fs.mkdir(path.dirname(OUT), { recursive: true });
await sharp({ create: { width: sheetW, height: top, channels: 4, background: "#f4efe8" } })
  .composite(layers)
  .png({ compressionLevel: 9 })
  .toFile(OUT);

console.log(`\nproof sheet: ${OUT}`);
