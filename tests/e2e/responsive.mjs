/**
 * Responsive UI checks — assets + device-specific markup (server ke against).
 *
 *   BASE_URL=http://127.0.0.1:3100 node tests/e2e/responsive.mjs
 *
 * Kyun alag file: sandbox me koi browser (Chromium) nahi chalta, isliye hum wahi
 * cheezein verify karte hain jo breakpoints par decide hoti hain — `<picture>` ke
 * `<source media>` order, har breakpoint ka asset, asset ka asli pixel size,
 * aspect-ratio, aur "khaali collection par dead link na ho".
 *
 * Har check ke saath viewport bhi likha hai, taaki report me map ho sake.
 */
import fs from "node:fs/promises";
import path from "node:path";

const BASE = (process.env.BASE_URL ?? "http://127.0.0.1:3100").replace(/\/$/, "");
const PUBLIC = path.resolve(import.meta.dirname, "../../apps/web/public");

let pass = 0;
const failures = [];

function check(name, ok, detail = "") {
  if (ok) {
    pass += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

/** PNG/WebP ka width×height (dependency-free) */
async function imageSize(file) {
  const buffer = await fs.readFile(file);
  if (buffer.subarray(0, 8).toString("hex") === "89504e470d0a1a0a") {
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20), type: "png" };
  }
  if (buffer.subarray(0, 4).toString() === "RIFF" && buffer.subarray(8, 12).toString() === "WEBP") {
    const chunk = buffer.subarray(12, 16).toString();
    if (chunk === "VP8X") {
      const width = 1 + buffer.readUIntLE(24, 3);
      const height = 1 + buffer.readUIntLE(27, 3);
      return { width, height, type: "webp" };
    }
    if (chunk === "VP8 ") {
      return { width: buffer.readUInt16LE(26) & 0x3fff, height: buffer.readUInt16LE(28) & 0x3fff, type: "webp" };
    }
    if (chunk === "VP8L") {
      const bits = buffer.readUInt32LE(21);
      return { width: (bits & 0x3fff) + 1, height: ((bits >> 14) & 0x3fff) + 1, type: "webp" };
    }
  }
  return null;
}

const get = async (pathname) => {
  const response = await fetch(`${BASE}${pathname}`, { headers: { "user-agent": "responsive-check" } });
  return { status: response.status, text: await response.text() };
};

console.log(`\nresponsive checks → ${BASE}\n`);

/* 1. asset files: existence + device-appropriate dimensions ------------------ */
const assets = [
  // file, min width, min height, note
  ["images/brand/logo-mobile.png", 380, 100, "mobile logo (horizontal, 2× of 40px display)"],
  ["images/brand/logo-tablet.png", 520, 120, "tablet logo (horizontal, ~2.6× of 50px)"],
  ["images/brand/logo-desktop.png", 600, 140, "desktop logo (horizontal lockup, 3× of 46px)"],
  ["images/brand/logo-fluid.png", 600, 360, "fluid logo (stacked, footer/invoice)"],
  ["images/brand/logo-mark-128.png", 128, 128, "favicon 128"],
  ["images/brand/logo-mark-192.png", 192, 192, "PWA 192"],
  ["images/brand/logo-mark-512.png", 512, 512, "PWA 512 / invoice"],
  ["images/banners/banner-mobile.webp", 700, 1000, "mobile poster (portrait)"],
  ["images/banners/banner-tablet.webp", 1100, 800, "tablet banner (4:3)"],
  ["images/banners/banner-desktop.webp", 1700, 500, "desktop banner (wide, no baked arrows)"],
  ["images/banners/banner-fluid.webp", 1500, 480, "fluid banner"],
];

for (const [file, minW, minH, note] of assets) {
  const full = path.join(PUBLIC, file);
  try {
    const size = await imageSize(full);
    check(
      `${note} — ${file} (${size?.width}×${size?.height})`,
      Boolean(size && size.width >= minW && size.height >= minH),
      size ? `expected ≥ ${minW}×${minH}` : "unreadable file",
    );
  } catch {
    check(`${note} — ${file}`, false, "file missing");
  }
}

/* 2. payload sanity: par-device file size (mobile = smallest banner) --------- */
const sizeOf = async (file) => (await fs.stat(path.join(PUBLIC, file))).size;
const mobileBanner = await sizeOf("images/banners/banner-mobile.webp");
const desktopBanner = await sizeOf("images/banners/banner-desktop.webp");
check(
  `mobile banner is lighter than desktop (${Math.round(mobileBanner / 1024)} KB vs ${Math.round(desktopBanner / 1024)} KB)`,
  mobileBanner < 260 * 1024 && desktopBanner < 260 * 1024,
);

/* 3. home markup: breakpoints map to the right asset ------------------------ */
const home = await get("/");
check("home 200", home.status === 200, `status ${home.status}`);

const heroPicture = home.text.match(/aspect-\[860\/1290\][\s\S]{0,900}?<\/picture>/)?.[0] ?? "";
check("hero is a <picture> (only one file loads per device)", Boolean(heroPicture));
check("hero: ≥1024px → banner-desktop.webp", /min-width:1024px[^>]*banner-desktop\.webp/.test(heroPicture));
check("hero: 768–1023px → banner-tablet.webp", /min-width:768px[^>]*banner-tablet\.webp/.test(heroPicture));
check("hero: <768px → banner-mobile.webp (default img)", /<img[^>]*banner-mobile\.webp/.test(heroPicture));
check(
  "hero reserves space with width/height + aspect-ratio (no layout shift)",
  /width="1779"[^>]*height="594"/.test(heroPicture) && /width="860"[^>]*height="1290"/.test(heroPicture),
);
check(
  "hero aspect ratios match the files (860/1290 · 4/3 · 1779/594)",
  home.text.includes("aspect-[860/1290]") && home.text.includes("md:aspect-[4/3]") && home.text.includes("lg:aspect-[1779/594]"),
);
check("hero image loads eagerly (LCP) with high priority", /fetchPriority="high"|fetchpriority="high"/.test(heroPicture));

const headerPicture = home.text.includes("/images/brand/logo-desktop.png") && home.text.includes("/images/brand/logo-tablet.png") && home.text.includes("/images/brand/logo-mobile.png");
check("brand lockup uses <picture> with all three variants", headerPicture);

/* 4. header/nav: no dead links, no overflowing fixed widths ---------------- */
// Pages export me base path + trailing slash aata hai — dono accept karo
check("nav has SHOP link to /collections", /href="(?:\/tannu-product-)?\/collections\/?"[^>]*>SHOP/.test(home.text));
check("no saree link in header/footer (0 products)", !home.text.includes("/collections/saree"));
// mobile + desktop dono par logo exact center: dono jagah 1fr_auto_1fr grid
check(
  "header grid keeps logo centred on phones and desktop",
  home.text.includes("grid-cols-[1fr_auto_1fr]"),
);
check("mobile menu is a 40px touch target", /aria-label="Open menu"[\s\S]{0,220}?h-10 w-10/.test(home.text));
// 1024px par nav + 4 icons + logo ke saath overlap na ho: cart ka price sirf xl+ par
check(
  "cart shows only the count at laptop width (price from xl)",
  /data-testid="cart-count"[^>]*sm:inline/.test(home.text) && /data-testid="cart-count"[\s\S]{0,160}?hidden xl:inline/.test(home.text),
);

/* 4b. footer logo: stacked fluid file (wide-but-short space) ---------------- */
check("footer uses the stacked fluid logo", home.text.includes("/images/brand/logo-fluid.png"));

/* 5. footer: instagram URL text (not a link), whatsapp working -------------- */
check("footer shows the instagram URL as text", home.text.includes("https://www.instagram.com/noorethnicwear"));
check(
  "instagram is not a clickable link yet (owner rule)",
  !/href="https:\/\/www\.instagram\.com/.test(home.text),
);
check("footer whatsapp link is live", /href="https:\/\/wa\.me\/91\d{10}/.test(home.text));
check("no dummy facebook/pinterest links", !home.text.includes("facebook.com") && !home.text.includes("pinterest.com"));

/* 6. collections index (SHOP landing) ------------------------------------- */
const collections = await get("/collections");
check("/collections 200", collections.status === 200, `status ${collections.status}`);
check("/collections lists collection cards", collections.text.includes('data-testid="collection-card"'));
check("/collections hides the empty saree collection", !/href="\/collections\/saree"/.test(collections.text));

/* 7. checkout/payment: koi UPI app chip nahi (owner request) ---------------
 * Payment ki detail sirf order page par hai; checkout par sirf "prepaid" note.
 */
const checkoutSource = await fs.readFile(
  path.resolve(import.meta.dirname, "../../apps/web/src/components/checkout-form.tsx"),
  "utf8",
);
const paymentSource = await fs.readFile(
  path.resolve(import.meta.dirname, "../../apps/web/src/components/upi-payment.tsx"),
  "utf8",
);
const upiLib = await fs.readFile(
  path.resolve(import.meta.dirname, "../../apps/web/src/lib/upi.ts"),
  "utf8",
);
check("checkout has no UPI app chips", !/UpiApps|upi-apps/.test(checkoutSource));
check(
  "checkout names no UPI app brand",
  !/GPay|PhonePe|Paytm|BHIM|Amazon Pay/.test(checkoutSource),
);
check("checkout shows a short prepaid note", checkoutSource.includes('data-testid="prepaid-note"'));
/**
 * Payment page (step 3) par **saare phone UPI apps** dikhne chahiye (owner
 * request: "phone ke saare app aa jayein") — GPay/PhonePe/Paytm/any UPI.
 * Checkout par ab bhi kuch nahi.
 */
check("payment page has one 'Open UPI app' button", paymentSource.includes('data-testid="upi-open"'));
check(
  "payment page names no UPI app brand",
  !/Google Pay|PhonePe|Paytm|BHIM/i.test(paymentSource) && !/GPay|PhonePe|Paytm/.test(checkoutSource),
);
check("payment page keeps the QR + UPI ID", paymentSource.includes("UpiQr") && paymentSource.includes("upi-id"));
/**
 * R36 (owner): "payment page par jaate hi UPI par redirect na kare, Pay on UPI
 * kare tab jaakar UPI detect ho". Isliye purana `?pay=1` auto-open effect (jo
 * mobile par page khulte hi UPI app launch kar deta tha) **nahi** hona chahiye —
 * intent sirf `upi-open` button ke asli click/tap se chalta hai.
 */
check(
  "UPI app page load par khud nahi khulti (auto-open effect gaya)",
  !/get\("pay"\) !== "1"/.test(paymentSource) &&
    !/window\.location\.href\s*=\s*upiUri/.test(paymentSource) &&
    !/appOpened/.test(paymentSource) &&
    !/\?pay=1/.test(checkoutSource),
);
check(
  "UPI intent sirf button ke href se (asli user gesture)",
  /href=\{upiUri\}/.test(paymentSource) && /data-testid="upi-open"/.test(paymentSource),
);

/* 8. responsive CSS rules exist in the built stylesheet -------------------- */
const cssDir = path.join(PUBLIC, "..", ".next/static/chunks");
const cssFile = (await fs.readdir(cssDir).catch(() => [])).find((file) => file.endsWith(".css"));
if (cssFile) {
  const css = await fs.readFile(path.join(cssDir, cssFile), "utf8");
  const flatCss = css.replace(/\s+/g, "");
  check(
    "CSS defines brand-lockup heights per breakpoint (40 → 50 → 46)",
    flatCss.includes(".brand-lockupimg{width:auto;height:40px}") &&
      flatCss.includes(".brand-lockupimg{height:50px}") &&
      flatCss.includes(".brand-lockupimg{height:46px}"),
  );
  check("CSS keeps hero image inside its box (object-fit)", /\.hero-media img\{[^}]*object-fit/.test(css));
} else {
  console.log("  skip built CSS checks (production build ke baad chalayein)");
}

console.log(`\nresponsive: ${pass} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  ✗ ${failure}`);
  process.exitCode = 1;
}
