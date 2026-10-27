#!/usr/bin/env node
/**
 * build-catalog.mjs — live store snapshot se canonical catalogue banao.
 *
 * Inputs (repo me committed, GitHub Actions se refresh hote hain):
 *   database/seeds/live/products.json      — Shopify /products.json (288 products, full galleries)
 *   database/seeds/live/collections.json   — Shopify /collections.json
 *   database/seeds/live/membership.json    — har collection ke andar ke product handles (paginated)
 *
 * Outputs:
 *   database/seeds/catalog.json            — canonical
 *   apps/web/src/data/catalog.json         — web runtime copy
 *   apps/admin/src/data/catalog.json       — admin copy
 *
 * Rule: app ke andar data edit mat karo — yahan edit karke `npm run catalog:build` chalao.
 * Snapshot refresh: `node scripts/catalog-sync/fetch-live.mjs` (ya GitHub Actions → Catalog sync).
 */
import fs from "node:fs";
import path from "node:path";
import { normalizeSizes, canonicalSize } from "./lib/sizes.mjs";
import { applySalePricing } from "./lib/sale-pricing.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const CDN = "https://cdn.shopify.com/s/files/1/0738/8345/1696/";
const SOURCE = "https://noorethnicwear.in";
const LIVE = path.join(ROOT, "database/seeds/live");

const readJson = (p) => JSON.parse(fs.readFileSync(p, "utf8"));
const write = (p, data) => {
  fs.mkdirSync(path.dirname(path.join(ROOT, p)), { recursive: true });
  fs.writeFileSync(path.join(ROOT, p), data);
};

/** "2999.00" -> 299900 paise. float kabhi nahi. */
function paise(value) {
  if (value === null || value === undefined || value === "") return null;
  const [rupees, fraction = ""] = String(value).split(".");
  const whole = Number(rupees.replace(/[^0-9]/g, "")) || 0;
  const cents = Number(`${fraction}00`.slice(0, 2)) || 0;
  return whole * 100 + cents;
}

/** Shopify handles me emoji bhi hote hain — URL ke liye ASCII slug, original `sourceHandle` me. */
function asciiHandle(handle) {
  return String(handle)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
}

const FABRICS = [
  "vichitra silk", "rangoli silk", "banarasi silk", "fendy silk", "chinon silk", "dola silk",
  "tissue silk", "silk", "georgette", "velvet", "maslin", "muslin", "chanderi", "organza",
  "net", "cotton", "rayon", "crepe", "satin", "jacquard", "seqiun", "sequin", "brocade", "lycra",
];

const COLORS = [
  "off white", "rani pink", "sky blue", "blush pink", "sea green", "baby pink", "rani",
  "black", "white", "ivory", "red", "maroon", "wine", "pink", "green", "olive", "pista", "mint",
  "blue", "navy", "purple", "lavender", "violet", "yellow", "mustard", "orange", "peach", "rust",
  "brown", "grey", "gray", "gold", "mehandi", "aqua", "multi", "nude", "teal", "beige", "cream",
];

const titleCase = (value) => value.replace(/\b\w/g, (c) => c.toUpperCase());

/** Emoji/dingbats hata do — owner ne kaha copy me emoji nahi chahiye. */
const EMOJI =
  /[\p{Extended_Pictographic}\u{1F3FB}-\u{1F3FF}\u{1F1E6}-\u{1F1FF}\u2700-\u27BF\u2B00-\u2BFF\uFE0E\uFE0F\u200D\u20E3]/gu;
/**
 * Product titles ka polish (owner request, Round 17).
 *
 * Source store ke titles me spelling/formatting issues hain — "Slik", "Havy",
 * "Beutifull", "Plazo", duplicate words, ALL CAPS, backtick apostrophes.
 * Yahan sirf **safe** fixes hote hain (naam ka matlab nahi badalta, handle/URL
 * same rehta hai). Har sync par yahi lagta hai, isliye dobara ganda nahi hota.
 */
const TITLE_FIXES = [
  [/\bslik\b/gi, "Silk"],
  [/\bplaz{1,2}o{1,2}\b/gi, "Palazzo"],
  [/\bwaite\b/gi, "White"],
  [/\bfux\b/gi, "Fox"],
  [/\bhavy\b/gi, "Heavy"],
  [/\bdesiner\b/gi, "Designer"],
  [/\bbeutifull\b/gi, "Beautiful"],
  [/\bfrendy\b/gi, "Trendy"],
  [/\bduppta\b/gi, "Dupatta"],
  [/\bduppata\b/gi, "Dupatta"],
  [/\bpents?\b/gi, "Pant"],
  [/\bjari\b/gi, "Zari"],
  [/\bwaine\b/gi, "Wine"],
  [/\boff\s*white\b/gi, "Off White"],
  [/\bSuitSe\b/g, "Suit Set"],
];

const SMALL_WORDS = new Set(["and", "with", "for", "of", "the", "in", "to", "a", "an", "on", "by"]);

/**
 * Scraped titles me words chipke hue aate hain — "Premiumreadymadeanarkalisuitset",
 * "Trendinganarkalisuitset". Card aur Google par wo automated lagta hai, isliye
 * lambe (12+ chars) token ko known words par tod dete hain. Chhote asli words
 * ("Sunset", "Suitcase") chhune se bachne ke liye length guard hai.
 */
const GLUED_WORDS = [
  "Readymade",
  /* colour + style words bhi — "OffwhiteTrendy" jaisa junk todne ke liye */
  "Off",
  "White",
  "Black",
  "Red",
  "Pink",
  "Blue",
  "Green",
  "Maroon",
  "Yellow",
  "Purple",
  "Ivory",
  "Peach",
  "Cream",
  "Orange",
  "Wine",
  "Golden",
  "Grey",
  "Navy",
  "Sky",
  "Trendy",
  "Anarkali",
  "Trending",
  "Premium",
  "Designer",
  "Embroidered",
  "Lehenga",
  "Choli",
  "Kurta",
  "Gown",
  "Suit",
  "Set",
  "Silk",
  "Georgette",
  "Chinon",
  "Sharara",
  "Palazzo",
  "Dupatta",
  "Party",
  "Wear",
];

function unglueWords(title) {
  const sorted = [...GLUED_WORDS].sort((a, b) => b.length - a.length);
  /** token ko poora known words me tod do — warna chhod do (safe) */
  const segment = (token) => {
    const lower = token.toLowerCase();
    const failed = new Set();
    const walk = (index) => {
      if (index === lower.length) return [];
      if (failed.has(index)) return null;
      for (const word of sorted) {
        const piece = word.toLowerCase();
        if (!lower.startsWith(piece, index)) continue;
        const rest = walk(index + piece.length);
        if (rest) return [token.slice(index, index + piece.length), ...rest];
      }
      failed.add(index);
      return null;
    };
    const pieces = walk(0);
    return pieces && pieces.length > 1 ? pieces : null;
  };
  return title
    .split(" ")
    .map((token) => {
      if (token.length < 7) return token;
      const pieces = segment(token);
      if (!pieces) return token;
      return pieces.map((piece) => piece.charAt(0).toUpperCase() + piece.slice(1)).join(" ");
    })
    .join(" ");
}

function smartTitleCase(value) {
  return value
    .toLowerCase()
    .split(/\s+/)
    .map((word, index) => {
      if (!word) return word;
      if (index > 0 && SMALL_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(" ");
}

/**
 * Kuch source products ka "title" asal me supplier ki description hai
 * ("Presenting New Crunchy Silk Fabric with Embroidery Sequence Dori and Zari
 * Work Top with Dupatta Set Bell Bottom Pant Ready to Wear..."). Aise 8-10
 * products par card/Google par bhadda lagta hai. Handle ke hisaab se ek saaf
 * title — matlab wahi (fabric + kaam + product type), sirf padhne layak.
 */
const TITLE_OVERRIDES = new Map([
  ["new-design-premium-anarkali-suit-set", "Premium Cotton Anarkali Suit Set"],
  ["diyas-new-design-premium-anarkali-suit-set", "White Banarasi Silk Anarkali Suit Set"],
  [
    "presenting-new-crunchy-silk-fabric-with-embroidery-sequence-dori-and-jari-work-top-with-dupatta-set-bell-bottom-pent-ready-to-wear",
    "Crunchy Silk Embroidered Anarkali Suit Set",
  ],
  [
    "presenting-new-premium-quality-pure-romansilk-fabric-fully-flare-anarkali-with-fancy-dupapta-set-pent-ready-to-wear",
    "Pure Romansilk Flare Anarkali Suit Set",
  ],
  [
    "presenting-new-premium-quality-pure-romansilk-chanderi-fabric-fully-flare-anarkali-with-dupapta-set-pent-ready-to-wear",
    "Romansilk Chanderi Flare Anarkali Suit Set",
  ],
  ["new-arrival-premium-designer-collection-fall-in-love-with-elegance", "Premium Designer Silk Suit Set"],
  [
    "presenting-new-frendy-silk-fabric-with-embroidery-sequence-dori-and-jari-work-top-with-duppta-set-bell-bottom-pent-ready-to-wear-1",
    "Trendy Silk Embroidered Suit Set with Dupatta",
  ],
  [
    "presenting-new-crunchy-silk-fabric-with-embroidery-sequence-and-jari-work-top-with-duppta-set-bell-bottom-pent-ready-to-wear-kb-300-tealblue-offwhite-wine",
    "Wine Crunchy Silk Embroidered Gown Set",
  ],
  [
    "presenting-new-frendy-silk-fabric-with-embroidery-sequence-dori-and-jari-work-top-with-duppta-set-bell-bottom-pent-ready-to-wear",
    "Trendy Silk Zari Embroidered Suit Set",
  ],
  [
    "presenting-new-high-premium-quality-pure-fox-georgette-fabric-fully-flare-anarkali-with-koti-dupatta-set-pent-ready-to-wear-k299",
    "Fox Georgette Flare Anarkali with Koti Dupatta",
  ],
]);

/** "Presenting New ..." jaisi supplier-title ko generic taur par bhi saaf karo */
function stripSupplierTitle(title) {
  return title
    .replace(/^presenting\s+(new\s+)?/i, "")
    .replace(/^new arrival\s*\|\s*/i, "")
    .replace(/\s*[|]\s*premium designer collection.*$/i, "")
    .trim();
}

function polishTitle(value) {
  const raw = stripEmoji(value).trim();
  // ALL CAPS detect **replacements se pehle** (apostrophe fix ke baad case badal jaata hai)
  const wasAllCaps = /[A-Z]{3,}/.test(raw) && !/[a-z]/.test(raw);
  let title = raw
    // backtick/curly apostrophes → seedha quote ("Saakshi`s" → "Saakshi's")
    .replace(/[`\u2018\u2019]/g, "'")
    .replace(/\*/g, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  for (const [pattern, replacement] of TITLE_FIXES) title = title.replace(pattern, replacement);

  // apostrophe ke baad capital S ("Keshavi'S" → "Keshavi's"), stray quotes hatao
  title = title.replace(/'S\b/g, "'s").replace(/'{2,}/g, "'").replace(/\s+'/g, "'");

  // ek hi word lagatar do baar ("Anarkali Anarkali")
  const words = title.split(" ");
  const deduped = words.filter((word, index) => index === 0 || word.toLowerCase() !== words[index - 1].toLowerCase());
  title = deduped.join(" ");

  // poora CAPS title → Title Case, hyphen ke baad bhi capital ("Rang-F-Royale")
  if (wasAllCaps) {
    title = smartTitleCase(title).replace(/(^|[-\/])([a-z])/g, (_, sep, letter) => `${sep}${letter.toUpperCase()}`);
  }

  // chipke hue words ("Premiumreadymadeanarkalisuitset" → "Premium Readymade Anarkali Suit Set")
  title = unglueWords(title);

  /** Scraped junk jo title me automated lagta hai:
   *  "[3 Pis]" / "[3 PIS]" → "3 Pieces", "[Sleeves Fabric Attached]" → hata do.
   *  Trailing supplier code (6122, 6129) **chhod dete hain** — wo hi do alag
   *  designs ko alag rakhta hai (same title, alag fabric/price/photos). */
  title = title
    .replace(/\s*[\[(]\s*3\s*pi?e?c?e?s?\s*[\])]/gi, " 3 Pieces")
    .replace(/\s*[\[(]\s*sleeves?\s*fabric\s*attached\s*[\])]/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();

  // punctuation ke aage space nahi, comma ke baad space
  title = title.replace(/\s+([,.;:!?])/g, "$1").replace(/,([^\s])/g, ", $1");
  title = title.replace(/\s{2,}/g, " ").trim();

  /**
   * Kuch source "titles" asal me poora description hain (~200 chars). Card/SEO
   * me wo bhadda lagta hai — pehla natural break (" is ", ". ") tak chhota kar
   * dete hain, baaki description me pehle se maujood hai.
   */
  if (title.length > 85) {
    const cut = title.match(/^(.{12,80}?)(?: is |\. |, | - | \| )/i);
    if (cut) title = cut[1].trim();
    else title = title.slice(0, 80).replace(/[\s,;:-]+\S*$/, "").trim();
  }
  return title;
}

function stripEmoji(value) {
  return String(value ?? "")
    .replace(EMOJI, " ")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/**
 * Bade size par price zyada — cutting/stitching zyada fabric leta hai.
 * Base price (XS–L) live store ka hi rehta hai, sirf XL se upar surcharge lagta hai.
 */
export const SIZE_SURCHARGE = {
  "XL [42]": 10_000,
  "2XL [44]": 20_000,
  "3XL [46]": 30_000,
  "4XL [48]": 40_000,
  "5XL [50]": 50_000,
};

/** live store ke description me chhapa hua copyright NOTE — storefront par nahi chahiye */
const NOTE_PATTERNS = [
  /our all design(?:ed)? is registered copyright[^.]*\.?/gi,
  /copying our content[^.]*?owner[^.]*\.?/gi,
  /all rights reserved by owner[^.]*\.?/gi,
];

function detectFabric(product) {
  const haystack = `${product.title} ${product.body_html ?? ""} ${(product.tags ?? []).join(" ")}`.toLowerCase();
  for (const fabric of FABRICS) if (haystack.includes(fabric)) return titleCase(fabric);
  return "As Shown";
}

function detectColor(product) {
  const haystack = `${product.title} ${(product.tags ?? []).join(" ")}`.toLowerCase();
  for (const color of COLORS) {
    const pattern = new RegExp(`\\b${color}\\b`);
    if (pattern.test(haystack)) return titleCase(color);
  }
  return "As Shown";
}

function detectCategory(product) {
  // title sabse reliable hai (product_type me aksar "Clothing" hota hai, tags me purani lines)
  const haystack = `${product.title} ${product.product_type ?? ""} ${(product.tags ?? []).join(" ")}`.toLowerCase();
  const title = String(product.title ?? "").toLowerCase();
  const type = String(product.product_type ?? "").toLowerCase();
  const score = (needles) => needles.reduce((n, needle) => n + (title.includes(needle) ? 2 : 0) + (type.includes(needle) ? 2 : 0) + (haystack.includes(needle) ? 1 : 0), 0);
  const candidates = [
    ["saree", ["saree", "sari"]],
    ["lehnga", ["lehenga", "lehnga", "ghagra", "choli"]],
    ["gown", ["gown"]],
    ["sharara", ["sharara", "palazzo", "sharara suit"]],
    ["printed", ["printed", "print"]],
    ["anarkali", ["anarkali"]],
  ];
  const best = candidates
    .map(([name, needles]) => [name, score(needles)])
    .filter(([, value]) => value > 0)
    .sort((a, b) => b[1] - a[1])[0];
  return best ? best[0] : "other";
}

/**
 * Description: live `body_html` hi asli text hai. Sirf safe tags rakhte hain —
 * script/iframe/style/img/on* attributes hata dete hain (XSS + duplicate gallery images).
 */
function sanitizeHtml(html) {
  if (!html) return "";
  let out = String(html);
  out = out.replace(/<!--[\s\S]*?-->/g, "");
  out = out.replace(/<(script|style|iframe|noscript|form|input|object|embed)[\s\S]*?<\/\1>/gi, "");
  out = out.replace(/<(img|source|picture|video)[^>]*>/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*"[^"]*"/gi, "");
  out = out.replace(/\son[a-z]+\s*=\s*'[^']*'/gi, "");
  out = out.replace(/\s(href|src)\s*=\s*"(?!https?:|\/)[^"]*"/gi, "");
  // copyright NOTE (live description ka tail) hatao
  out = stripEmoji(out);
  // live store ke *bold* markers ko asli bold me badlo (asterisk copy gandi lagti hai)
  out = out.replace(/\*\s*([^*<>\n]{1,60}?)\s*:\s*-\s*\*/g, "<strong>$1:</strong> ");
  out = out.replace(/\*\s*([^*<>\n]{1,60}?)\s*\*\s*:?\s*-?\s*/g, "<strong>$1</strong> ");
  out = out.replace(/<strong>\s*<\/strong>/g, "");
  // bache hue decorative asterisks / bullet markers hatao
  out = out.replace(/<span>\s*\*\s*<\/span>/gi, "");
  out = out.replace(/\s*\*\s*/g, " ");
  for (let pass = 0; pass < 2; pass += 1) {
    out = out.replace(/<span>(?:\s|&nbsp;)*<\/span>/gi, "");
    out = out.replace(/<p>(?:\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, "");
  }
  out = out.replace(/(?:<br\s*\/?>\s*){3,}/gi, "<br><br>");
  out = out.replace(/  +/g, " ");
  out = out.replace(/\s*:\s*-\s*/g, ": ");
  out = out.replace(/<strong>([^<]{1,60}?)<\/strong>\s*:/g, "<strong>$1:</strong>");
  out = out.replace(/(?:<br\s*\/?>|<p[^>]*>)\s*(?:<span[^>]*>)?\s*(?:<\/span>)?\s*(?=<br|$)/gi, "");
  for (const pattern of NOTE_PATTERNS) out = out.replace(pattern, "");
  out = out.replace(/\bNOTE\b\s*[:\-]?/gi, "");
  out = out.replace(/(<br\s*\/?>\s*){2,}/gi, "<br>");
  out = out.replace(/<p>\s*(<br\s*\/?>)?\s*<\/p>/gi, "");
  const allowed = new Set(["p", "br", "b", "strong", "i", "em", "u", "ul", "ol", "li", "span", "h3", "h4", "h5", "div", "table", "tbody", "tr", "td", "th"]);
  out = out.replace(/<\/?([a-zA-Z0-9-]+)([^>]*)>/g, (match, tag, attrs) => {
    const name = tag.toLowerCase();
    if (!allowed.has(name)) return "";
    if (match.startsWith("</")) return `</${name}>`;
    const cleanAttrs = /^(span|div)$/.test(name) ? "" : "";
    return `<${name}${cleanAttrs}>`;
  });
  return out.trim();
}

function htmlToLines(html) {
  if (!html) return [];
  const withBreaks = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|div|li|h[3-5])>/gi, "\n");
  const text = withBreaks
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\u00a0/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
  return text
    .split("\n")
    .map((line) => line.replace(/[ \t]+/g, " ").trim())
    .filter((line) => line.length > 1);
}

/** primary image per size — variant.featured_image se (warna pehli image) */
function variantImage(variant, images) {
  const src = variant.featured_image?.src;
  if (src) return src.split("?")[0];
  return images[0] ?? null;
}


/**
 * Ek hi design ke alag-alag colour live store par alag products hote hain
 * ("Rani Pink Trendy Anarkali Suit Set" vs "Maroon Trendy Anarkali Suit Set").
 * Storefront par ek hi product dikhna chahiye jisme colour swatch se sab kuch badle.
 */
function splitColour(title) {
  const lower = title.toLowerCase();
  let best = null;
  for (const colour of COLORS) {
    let from = 0;
    while (true) {
      const index = lower.indexOf(colour, from);
      if (index === -1) break;
      from = index + 1;
      const before = lower[index - 1];
      const after = lower[index + colour.length];
      if (before && /[a-z0-9]/.test(before)) continue;
      if (after && /[a-z0-9]/.test(after)) continue;
      if (!best || colour.length > best.colour.length) best = { colour, index };
      break;
    }
  }
  if (!best) return null;
  const base = `${title.slice(0, best.index)} ${title.slice(best.index + best.colour.length)}`
    .replace(/\s{2,}/g, " ")
    .replace(/^[\s\-–—,]+|[\s\-–—,]+$/g, "")
    .trim();
  if (base.length < 14) return null;
  return { colour: titleCase(best.colour), base };
}

/** group key: colour ke bina title ka slug */
const groupKeyOf = (base) => base.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

/**
 * Admin panel se kiye gaye edits. Admin `database/seeds/admin/overrides.json`
 * likhta hai aur publish par build dobara chalta hai — website turant wahi dikhata hai.
 */
const OVERRIDES_FILE = path.join(ROOT, "database/seeds/admin/overrides.json");

function adminOverrides() {
  if (!fs.existsSync(OVERRIDES_FILE)) return { products: {}, collections: {}, hidden: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(OVERRIDES_FILE, "utf8"));
    return {
      products: parsed.products ?? {},
      collections: parsed.collections ?? {},
      hidden: parsed.hidden ?? [],
    };
  } catch {
    return { products: {}, collections: {}, hidden: [] };
  }
}

/** Live Trustoo sync ka rating/count — cards aur PDP wahi dikhate hain. */
function reviewRatings() {
  const ratings = new Map();
  for (const file of ["database/seeds/reviews/aggregates.json", "database/seeds/reviews/reviews.json"]) {
    const full = path.join(ROOT, file);
    if (!fs.existsSync(full)) continue;
    try {
      const parsed = JSON.parse(fs.readFileSync(full, "utf8"));
      for (const [handle, block] of Object.entries(parsed.products ?? {})) {
        const count = Number(block.count ?? 0);
        const rating = Number(block.rating ?? 0);
        if (count > 0 && rating > 0 && !ratings.has(handle)) ratings.set(handle, { rating, count });
      }
    } catch {
      /* seed missing/broken — rating 0 hi rahegi */
    }
  }
  return ratings;
}

/** extra (guest) catalogue — daily sync CI me chalta hai, seed yahan aata hai */
const EXTRA = path.join(ROOT, "database/seeds/extra");
const readExtra = (name, key) => {
  const file = path.join(EXTRA, name);
  if (!fs.existsSync(file)) return [];
  try {
    return readJson(file)[key] ?? [];
  } catch {
    return [];
  }
};

(function main() {
  const liveProducts = readJson(path.join(LIVE, "products.json")).products;
  const liveCollections = readJson(path.join(LIVE, "collections.json")).collections;
  const membership = readJson(path.join(LIVE, "membership.json")).collections;

  // extra store (thestoreofbufani) se aaye products/collections — optional seed
  const extraProducts = readExtra("products.json", "products");
  const extraCollections = readExtra("collections.json", "collections");
  const extraMembership = readExtra("membership.json", "collections");
  const extraHandles = new Set(extraProducts.map((product) => product.handle));
  const liveHandles = new Set(liveProducts.map((product) => product.handle));

  /** collection title ko compare karne ke liye normalize (NEW ARRIVAL == New Arrivals) */
  const titleKey = (value) =>
    String(value ?? "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "")
      .replace(/s$/, "");

  /**
   * Extra store ki collection titles agar noor ki kisi collection se milti hain
   * (LEHENGA CHOLI, NEW ARRIVAL, PRINTED SUIT SET…) to unhe usi collection me merge
   * karte hain — warna site par same naam ke do collections ban jaate hain.
   */
  const LIVE_TITLES = {
    "new-arrivals": "new arrivals",
    "party-wear-gown": "anarkali suit",
    "noors-choice": "noors choice",
    "lehnga-choli": "lehenga choli",
    "printed-suit-set": "printed suit set",
    "trending": "trending",
    "weddin-collection": "wedding collection",
    sale: "sale",
    saree: "saree",
  };
  const extraCollectionMap = new Map();
  for (const extra of extraCollections) {
    if (extra.handle === "frontpage") continue;
    const key = titleKey(extra.title);
    const match = Object.entries(LIVE_TITLES).find(
      ([, title]) => titleKey(title) === key || titleKey(title).startsWith(key) || key.startsWith(titleKey(title)),
    );
    if (match) extraCollectionMap.set(extra.handle, match[0]);
  }

  // handle -> collections (live membership hi source of truth)
  const collectionOf = new Map();
  for (const [collectionHandle, handles] of Object.entries(membership)) {
    for (const handle of handles) {
      if (!collectionOf.has(handle)) collectionOf.set(handle, new Set());
      collectionOf.get(handle).add(collectionHandle);
    }
  }
  for (const [collectionHandle, handles] of Object.entries(extraMembership)) {
    const mapped = extraCollectionMap.get(collectionHandle) ?? collectionHandle;
    for (const handle of handles) {
      // sirf extra store ke apne products (live store me same handle ho to noor hi)
      if (!extraHandles.has(handle) || liveHandles.has(handle)) continue;
      if (!collectionOf.has(handle)) collectionOf.set(handle, new Set());
      collectionOf.get(handle).add(mapped);
    }
  }
  if (extraProducts.length) {
    console.log(`extra catalogue: ${extraProducts.length} products, ${extraCollections.length} collections`);
  }

  const ratings = reviewRatings();
  const usedHandles = new Set();
  const products = [];
  const stats = { images: 0, sizes: new Set(), noImage: [], duplicateImages: [] };
  /** poore catalogue me ek image sirf ek product par */
  const usedImages = new Set();

  // live products pehle — same handle extra store me bhi ho to noor ka hi chalta hai
  const allSources = [
    ...liveProducts.map((product) => ({ product, fromExtraStore: false })),
    ...extraProducts.map((product) => ({ product, fromExtraStore: true })),
  ];
  for (const { product: source, fromExtraStore } of allSources) {
    if (!source.handle || !source.title) continue;
    const rawImages = (source.images ?? []).map((image) => image.src.split("?")[0]).filter(Boolean);
    // ek hi photo do products par nahi — pehla product photo ka owner, baad wale skip karte hain
    const images = [];
    for (const src of rawImages) {
      if (usedImages.has(src)) {
        stats.duplicateImages.push(`${source.handle} :: ${src.split("/").pop()}`);
        continue;
      }
      usedImages.add(src);
      images.push(src);
    }
    // sab photos duplicate nikle to kam se kam first photo rakho (product bina image ka na rahe)
    if (!images.length && rawImages.length) images.push(rawImages[0]);
    const liveCollectionsForProduct = collectionOf.get(source.handle) ?? new Set();
    // COD/partial-payment jaisi internal "products" storefront par nahi jaati
    if (!images.length && liveCollectionsForProduct.size === 0) continue;
    if (!images.length) stats.noImage.push(source.handle);

    const variants = (source.variants ?? []).map((variant) => ({
      size: canonicalSize(variant.option1 || variant.title) ?? "Free Size",
      sku: variant.sku ?? null,
      price: paise(variant.price) ?? 0,
      compareAtPrice: paise(variant.compare_at_price),
      available: Boolean(variant.available),
      image: variantImage(variant, images),
    }));

    // per-size map: same size ke duplicate variants (colour options) me sabse kam price jeetta hai
    const bySize = new Map();
    for (const variant of variants) {
      const existing = bySize.get(variant.size);
      if (!existing || variant.price < existing.price) bySize.set(variant.size, variant);
    }

    // size-wise price: bade size par surcharge (XL se upar), MRP sirf tab jab price se bada ho
    const sizePricing = Object.fromEntries(
      [...bySize.entries()].map(([size, variant]) => {
        const surcharge = SIZE_SURCHARGE[size] ?? 0;
        const sizePrice = variant.price + surcharge;
        const sizeCompareAt =
          variant.compareAtPrice && variant.compareAtPrice > sizePrice ? variant.compareAtPrice : null;
        return [size, { price: sizePrice, compareAtPrice: sizeCompareAt, available: variant.available }];
      }),
    );
    const sizePrices = Object.values(sizePricing).map((entry) => entry.price).filter((n) => n > 0);
    const price = sizePrices.length ? Math.min(...sizePrices) : 0;
    const compareAts = Object.values(sizePricing)
      .map((entry) => entry.compareAtPrice)
      .filter((n) => n && n > price);
    const compareAtPrice = compareAts.length ? Math.max(...compareAts) : null;

    const sizes = normalizeSizes([...bySize.keys()]);
    for (const size of sizes) stats.sizes.add(size);

    let handle = asciiHandle(source.handle) || `product-${source.id}`;
    if (usedHandles.has(handle)) handle = `${handle}-${source.id}`;
    usedHandles.add(handle);

    const overrideTitle = TITLE_OVERRIDES.get(source.handle);
    const cleanTitle = overrideTitle ?? stripSupplierTitle(polishTitle(source.title));
    const descriptionHtml = sanitizeHtml(source.body_html) || `<p>${cleanTitle}</p>`;
    const details = htmlToLines(descriptionHtml).slice(0, 14);
    // `frontpage` live store ka home-page grouping hai (nav collection nahi) — featured flag me jaata hai
    const collections = [...liveCollectionsForProduct].filter((handle) => handle !== "frontpage").sort();

    products.push({
      handle,
      sourceHandle: source.handle,
      title: cleanTitle,
      price,
      compareAtPrice,
      images,
      collections,
      category: detectCategory(source),
      productType: source.product_type || null,
      fabric: detectFabric(source),
      color: detectColor(source),
      sizes,
      sizePricing,
      details,
      description: stripEmoji(details.join(" ").trim() || cleanTitle).slice(0, 400),
      descriptionHtml,
      source: fromExtraStore ? "extra" : "noor",
      rating: ratings.get(handle)?.rating ?? 0,
      reviewCount: ratings.get(handle)?.count ?? 0,
      inStock: variants.some((variant) => variant.available) || variants.length === 0,
      featured: collections.includes("frontpage") || collections.includes("trending"),
      publishedAt: source.published_at ?? null,
    });
    stats.images += images.length;
  }

  /* ---------- admin overrides (admin panel se edit) ---------- */
  const overrides = adminOverrides();
  const hiddenHandles = new Set(overrides.hidden ?? []);
  let overriddenCount = 0;
  for (const product of products) {
    const patch = overrides.products?.[product.handle];
    if (!patch) continue;
    overriddenCount += 1;
    if (typeof patch.title === "string" && patch.title.trim()) product.title = patch.title.trim();
    if (Number.isInteger(patch.price) && patch.price > 0) product.price = patch.price;
    if (patch.compareAtPrice === null) product.compareAtPrice = null;
    else if (Number.isInteger(patch.compareAtPrice) && patch.compareAtPrice > 0) product.compareAtPrice = patch.compareAtPrice;
    if (typeof patch.inStock === "boolean") product.inStock = patch.inStock;
    if (typeof patch.featured === "boolean") product.featured = patch.featured;
    if (typeof patch.description === "string" && patch.description.trim()) {
      product.description = patch.description.trim();
    }
    if (patch.collections && Array.isArray(patch.collections)) {
      product.collections = [...new Set(patch.collections.filter((handle) => typeof handle === "string"))].sort();
    }
    if (patch.sizePricing && typeof patch.sizePricing === "object") {
      for (const [size, pricing] of Object.entries(patch.sizePricing)) {
        if (!product.sizePricing[size]) continue;
        if (Number.isInteger(pricing?.price) && pricing.price > 0) product.sizePricing[size].price = pricing.price;
        if (typeof pricing?.available === "boolean") {
          product.sizePricing[size].available = pricing.available;
          const variant = product.variants?.find((candidate) => candidate.size === size);
          if (variant) variant.available = pricing.available;
        }
      }
    }
    if (patch.images && Array.isArray(patch.images) && patch.images.length) {
      product.images = patch.images.filter((image) => typeof image === "string" && image.startsWith("https://"));
    }
  }
  if (overriddenCount) console.log(`admin overrides applied: ${overriddenCount} products`);

  /* ---------- admin se add kiye gaye naye products (upload) ---------- */
  const COLLECTION_KEYS = new Set([
    "new-arrivals", "party-wear-gown", "noors-choice", "lehnga-choli",
    "printed-suit-set", "trending", "weddin-collection", "sale",
  ]);
  const VALID_SIZES = new Set(["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"]);
  let addedCount = 0;
  for (const item of overrides.newProducts ?? []) {
    const title = String(item?.title ?? "").trim();
    const rawImages = (Array.isArray(item?.images) ? item.images : []).filter(
      (src) => typeof src === "string" && /^https:\/\//.test(src),
    );
    if (!title || !rawImages.length) continue;
    let handle = asciiHandle(item.handle || title) || `admin-${addedCount + 1}`;
    if (usedHandles.has(handle)) handle = `${handle}-${addedCount + 1}`;
    usedHandles.add(handle);
    // "ek image sirf ek product par" — pehle se use hui photo skip
    const images = [];
    for (const src of rawImages) {
      if (usedImages.has(src)) continue;
      usedImages.add(src);
      images.push(src);
      if (images.length >= 10) break;
    }
    if (!images.length) continue;
    const price = Number.isInteger(item.price) && item.price > 0 ? item.price : 49_900;
    const sizes = normalizeSizes((Array.isArray(item.sizes) ? item.sizes : []).filter((size) => VALID_SIZES.has(size)));
    const finalSizes = sizes.length ? sizes : ["S", "M", "L", "XL"];
    const collections = (Array.isArray(item.collections) ? item.collections : []).filter((h) => COLLECTION_KEYS.has(h));
    if (!collections.length) collections.push("new-arrivals");
    const description = String(item.description ?? "").trim() || title;
    products.push({
      handle,
      sourceHandle: handle,
      title,
      price,
      compareAtPrice: null,
      images,
      collections,
      category: ["anarkali", "lehnga", "printed", "gown", "sharara", "other"].includes(item.category)
        ? item.category
        : "anarkali",
      productType: "Admin upload",
      fabric: String(item.fabric ?? "").trim() || "Silk blend",
      color: String(item.color ?? "").trim() || "As shown",
      sizes: finalSizes,
      sizePricing: Object.fromEntries(finalSizes.map((size) => [size, { price, compareAtPrice: null, available: true }])),
      details: description.split(/\n+/).filter(Boolean).slice(0, 8),
      description: description.slice(0, 400),
      descriptionHtml: `<p>${description.replace(/</g, "&lt;")}</p>`,
      source: "admin",
      rating: 0,
      reviewCount: 0,
      inStock: item.inStock !== false,
      featured: false,
      publishedAt: item.createdAt ?? new Date().toISOString(),
    });
    addedCount += 1;
  }
  if (addedCount) console.log(`admin products added: ${addedCount}`);

  /* ---------- festive sale pricing (Flat 70% / 60%, final ₹499–₹699) ---------- */
  applySalePricing(products);
  console.log(`sale pricing: ${products.length} products -> ₹${[...new Set(products.map((p) => p.price / 100))].sort((a, b) => a - b).join(" / ₹")}`);

  /* ---------- colour grouping: same design, different colours -> one product ---------- */
  const groupMap = new Map();
  for (const product of products) {
    const split = splitColour(product.title);
    if (!split) continue;
    if (split.base.toLowerCase() === product.title.toLowerCase()) continue;
    const key = groupKeyOf(split.base);
    if (!key) continue;
    if (!groupMap.has(key)) groupMap.set(key, { key, title: split.base, category: product.category, members: [] });
    groupMap.get(key).members.push({ product, colour: split.colour });
  }

  const colourGroups = {};
  for (const group of groupMap.values()) {
    if (group.members.length < 2) continue;
    // ek hi colour do baar ho ya category mix ho to group skip (galat merge se bachao)
    const colours = new Set(group.members.map((member) => member.colour.toLowerCase()));
    if (colours.size !== group.members.length) continue;
    if (new Set(group.members.map((member) => member.product.category)).size !== 1) continue;

    const members = [...group.members].sort(
      (a, b) => a.product.price - b.product.price || b.product.images.length - a.product.images.length,
    );
    // representative: sabse zyada photos (tie -> sabse purana publish)
    const representative = [...members].sort((a, b) => {
      const images = b.product.images.length - a.product.images.length;
      if (images !== 0) return images;
      return String(a.product.publishedAt ?? "").localeCompare(String(b.product.publishedAt ?? ""));
    })[0];

    for (const member of members) {
      member.product.colourGroup = group.key;
      member.product.colourName = member.colour;
    }

    colourGroups[group.key] = {
      key: group.key,
      title: group.title,
      handle: representative.product.handle,
      colours: members.map((member) => ({
        name: member.colour,
        handle: member.product.handle,
        title: member.product.title,
        price: member.product.price,
        compareAtPrice: member.product.compareAtPrice,
        image: member.product.images[0] ?? "",
        images: member.product.images,
        sizes: member.product.sizes,
        sizePricing: member.product.sizePricing,
        inStock: member.product.inStock,
        colourCode: member.product.color,
      })),
    };
  }

  const groupedCount = Object.values(colourGroups).reduce((sum, group) => sum + group.colours.length, 0);
  if (groupedCount) {
    console.log(`colour groups: ${Object.keys(colourGroups).length} designs / ${groupedCount} colourways`);
  }

  /* ---------- style code (title unique karne + variant label ke liye) ---------- */
  const styleCodeOf = (product) => {
    const match = String(product.handle).match(/(?:([a-z]{2,4})-)?(\d{3,})$/);
    // Shopify ke lambe internal IDs title me bhddhe lagte hain — unhe chhod dete hain
    if (!match || match[2].length > 8) return "";
    return match[1] ? `${match[1].toUpperCase()}-${match[2]}` : `Style ${match[2]}`;
  };

  /**
   * Same-title listings → ek product, multiple colours.
   *
   * Source store par kai designs (same title, alag colour ya style code) alag
   * listings hain — customer ko wahi design 4-5 cards me dikhta hai. Owner ka
   * rule: "same product different colours = one product". Pehle wala colour
   * grouping title ke andar colour word dhundhta hai; yahan baaki same-title
   * listings ko group karte hain aur unique label (colour → style code →
   * variant number) dete hain. Listing par sirf ek card, PDP par swatches.
   */
  const GENERIC_COLOUR = /^(as shown|multi|multicolour|multi colour|multi color|na|n\/a)$/i;
  const titleBuckets = new Map();
  for (const product of products) {
    if (product.colourGroup) continue; // pehle se grouped
    const key = `${product.title.toLowerCase()}::${product.category}`;
    if (!titleBuckets.has(key)) titleBuckets.set(key, []);
    titleBuckets.get(key).push(product);
  }

  let mergedSameTitle = 0;
  for (const [bucketKey, members] of titleBuckets) {
    if (members.length < 2) continue;

    // representative: sabse zyada photos (tie -> sabse purana publish)
    const representative = [...members].sort((a, b) => {
      const images = b.images.length - a.images.length;
      if (images !== 0) return images;
      return String(a.publishedAt ?? "").localeCompare(String(b.publishedAt ?? ""));
    })[0];
    // representative pehle — usi ka label "Style 1" / asli colour banta hai
    const ordered = [representative, ...members.filter((member) => member !== representative)];

    // label: asli colour → style code → "Style N" (sab unique)
    const labels = new Map();
    const usedLabels = new Set();
    const colourOf = (product) => {
      const value = String(product.colourName || product.color || "").trim();
      return value && !GENERIC_COLOUR.test(value) ? value : "";
    };
    for (const product of ordered) {
      const colour = colourOf(product);
      if (!colour || usedLabels.has(colour.toLowerCase())) continue;
      usedLabels.add(colour.toLowerCase());
      labels.set(product, colour);
    }
    let variant = 1;
    for (const product of ordered) {
      if (labels.has(product)) continue;
      if (variant === 1) {
        // pehla fallback label bhi "Style 1" — readable aur predictable
      }
      let label = "";
      const code = styleCodeOf(product);
      if (code && !usedLabels.has(code.toLowerCase())) label = code;
      while (!label || usedLabels.has(label.toLowerCase())) {
        label = `Style ${variant}`;
        variant += 1;
      }
      usedLabels.add(label.toLowerCase());
      labels.set(product, label);
    }

    const groupKey = `same-${bucketKey.replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60)}`;
    if (colourGroups[groupKey]) continue;

    for (const member of members) {
      member.colourGroup = groupKey;
      member.colourName = labels.get(member);
    }

    colourGroups[groupKey] = {
      key: groupKey,
      title: representative.title,
      handle: representative.handle,
      colours: members.map((member) => ({
        name: labels.get(member),
        handle: member.handle,
        title: member.title,
        price: member.price,
        compareAtPrice: member.compareAtPrice,
        image: member.images[0] ?? "",
        images: member.images,
        sizes: member.sizes,
        sizePricing: member.sizePricing,
        inStock: member.inStock,
        colourCode: member.color,
      })),
    };
    mergedSameTitle += members.length - 1;
  }
  if (mergedSameTitle) {
    console.log(
      `same-title merge: ${mergedSameTitle} duplicate listings folded into colour groups (${Object.keys(colourGroups).length} groups total)`,
    );
  }

  /* ---------- duplicate titles: colour/style code se unique ---------- */  const titleSeen = new Set();
  let retitled = 0;
  /** group ka representative hi clean title rakhta hai — baaki ko suffix */
  const representativeHandles = new Set(Object.values(colourGroups).map((group) => group.handle));
  const titleOrder = [...products].sort(
    (a, b) => Number(representativeHandles.has(b.handle)) - Number(representativeHandles.has(a.handle)),
  );
  for (const product of titleOrder) {
    let title = product.title;
    let attempt = title;
    /**
     * Suffix candidates: colour → style code → fabric → product type.
     * "— Edition 2" sirf last resort hai (wo automated lagta hai, owner ne
     * titles saaf chahiye the) — fabric/product type se title padhne layak
     * rehta hai: "Manvi's White Coloured Anarkali Suit Set — Georgette".
     */
    const candidates = [
      String(product.colourName || product.color || "").trim(),
      styleCodeOf(product),
      String(product.fabric || "").trim(),
      String(product.productType || "").trim(),
    ].filter(
      (value) =>
        value &&
        !/^(as shown|multi|multicolour|multi colour|multi color|suit set|anarkali suit|na|n\/a)$/i.test(value),
    );
    for (const candidate of candidates) {
      if (!titleSeen.has(attempt.toLowerCase())) break;
      if (attempt.toLowerCase().includes(candidate.toLowerCase())) continue;
      attempt = `${title} — ${candidate}`;
      break;
    }
    if (titleSeen.has(attempt.toLowerCase()) && attempt === title) {
      // koi colour/code available nahi — index se unique karo (kabhi kabhi hi hota hai)
      let index = 2;
      while (titleSeen.has(`${title} — Edition ${index}`.toLowerCase())) index += 1;
      attempt = `${title} — Edition ${index}`;
    }
    if (attempt !== title) {
      product.title = attempt;
      retitled += 1;
    }
    titleSeen.add(product.title.toLowerCase());
  }
  if (retitled) console.log(`duplicate titles resolved: ${retitled}`);

  /* group ka title representative ke final title se sync — warna group meta me
     "— Style 2" jaisa purana suffix reh jaata hai (card clean, meta ganda) */
  for (const group of Object.values(colourGroups)) {
    const representative = products.find((product) => product.handle === group.handle);
    if (representative) group.title = representative.title;
  }

  /** listed products: ek group ka sirf representative (cards duplicate na dikhein) */
  const listedProducts = products.filter(
    (product) =>
      !hiddenHandles.has(product.handle) &&
      (!product.colourGroup || colourGroups[product.colourGroup]?.handle === product.handle),
  );
  const listedSet = new Set(listedProducts);

  // live collections order + titles, jaisa store me hai
  const COLLECTION_COPY = {
    "new-arrivals": { title: "New Arrivals", subtitle: "Freshly dropped festive favourites", sortOrder: 1 },
    "party-wear-gown": { title: "Anarkali Suit", subtitle: "Designer Anarkali Suits", sortOrder: 2 },
    "noors-choice": { title: "Noor's Choice", subtitle: "Handpicked by our stylists", sortOrder: 3 },
    "lehnga-choli": { title: "Lehenga Choli", subtitle: "Our Range of Designer Lehenga Choli", sortOrder: 4 },
    "printed-suit-set": { title: "Printed Suit Set", subtitle: "Everyday ethnic ease", sortOrder: 5 },
    "trending": { title: "Trending", subtitle: "Top view in this week", sortOrder: 6 },
    "weddin-collection": { title: "Wedding Collection", subtitle: "Bridal & trousseau edit", sortOrder: 7 },
    "sale": { title: "Sale", subtitle: "Limited-time festive prices", sortOrder: 8 },
    "saree": { title: "Saree", subtitle: "Timeless six yards", sortOrder: 9 },
  };

  const collections = [];
  // "Shop by edit" circles: har circle ki photo alag honi chahiye — ek hi image
  // New Arrivals / Anarkali / Noor's Choice me repeat nahi hogi.
  const usedCircleImages = new Set();
  for (const live of liveCollections) {
    const copy = COLLECTION_COPY[live.handle];
    if (!copy) continue; // frontpage = home ka internal collection, nav me nahi
    const candidates = products.filter(
      (product) => product.collections.includes(live.handle) && product.images.length && listedSet.has(product),
    );
    // pehla aisa product jiski photo kisi doosre circle me use nahi hui
    const uniquePick = candidates.find((product) => !usedCircleImages.has(product.images[0]));
    const picked = uniquePick ?? candidates[0];
    if (picked) usedCircleImages.add(picked.images[0]);
    const collectionOverride = overrides.collections?.[live.handle] ?? {};
    collections.push({
      handle: live.handle,
      title: collectionOverride.title || copy.title,
      subtitle: collectionOverride.subtitle || copy.subtitle,
      image: picked?.images[0] ?? "",
      sortOrder: copy.sortOrder,
      productCount: listedProducts.filter((product) => product.collections.includes(live.handle)).length,
    });
  }
  // extra store ki collections — jinka product hai aur jo live store me nahi hain
  const takenCollectionHandles = new Set(collections.map((collection) => collection.handle));
  let extraOrder = 100;
  for (const live of extraCollections) {
    if (extraCollectionMap.has(live.handle)) continue; // already merged in a noor collection
    if (takenCollectionHandles.has(live.handle)) continue;
    const candidates = products.filter(
      (product) => product.collections.includes(live.handle) && product.images.length && listedSet.has(product),
    );
    if (!candidates.length) continue; // khaali collection storefront par nahi
    const uniquePick = candidates.find((product) => !usedCircleImages.has(product.images[0])) ?? candidates[0];
    usedCircleImages.add(uniquePick.images[0]);
    collections.push({
      handle: live.handle,
      title: live.title || live.handle,
      subtitle: live.subtitle || live.description || "",
      image: uniquePick.images[0],
      sortOrder: extraOrder,
      productCount: candidates.length,
    });
    extraOrder += 1;
  }

  collections.sort((a, b) => a.sortOrder - b.sortOrder);

  const catalog = {
    meta: {
      store: "Noor Clothing",
      source: SOURCE,
      cdn: CDN,
      currency: "INR",
      moneyUnit: "paise",
      builtAt: new Date().toISOString(),
      snapshotAt: readJson(path.join(LIVE, "products.json")).fetchedAt ?? null,
      productCount: products.length,
      liveProductCount: products.filter((product) => product.source !== "extra").length,
      extraProductCount: products.filter((product) => product.source === "extra").length,
      listedProductCount: listedProducts.length,
      colourGroupCount: Object.keys(colourGroups).length,
      imageCount: stats.images,
    },
    collections,
    colourGroups,
    products,
  };

  // client cards ke liye chhota index (poora catalog browser me nahi bhejte)
  const colourIndex = Object.values(colourGroups).reduce(
    (acc, group) => {
      acc.groups[group.key] = {
        handle: group.handle,
        colours: group.colours.map((colour) => ({ name: colour.name, handle: colour.handle })),
      };
      for (const colour of group.colours) acc.byHandle[colour.handle] = group.key;
      return acc;
    },
    { groups: {}, byHandle: {} },
  );
  write("apps/web/src/data/colour-index.json", `${JSON.stringify(colourIndex, null, 1)}\n`);

  // reviews (Trustoo sync) — web app ko build ke waqt copy
  for (const [from, to] of [
    ["database/seeds/reviews/reviews.json", "apps/web/src/data/reviews.json"],
    ["database/seeds/reviews/aggregates.json", "apps/web/src/data/review-aggregates.json"],
  ]) {
    const source = path.join(ROOT, from);
    if (fs.existsSync(source)) write(to, fs.readFileSync(source, "utf8"));
  }

  const json = JSON.stringify(catalog, null, 1);
  write("database/seeds/catalog.json", json);
  write("apps/web/src/data/catalog.json", json);
  write("apps/admin/src/data/catalog.json", json);

  console.log(
    `catalog built: ${products.length} products (${listedProducts.length} listings), ${Object.keys(colourGroups).length} colour groups, ${collections.length} collections, ${stats.images} images`,
  );
  console.log(`sizes: ${[...stats.sizes].sort().join(" · ")}`);
  for (const collection of collections) {
    console.log(`  ${collection.handle.padEnd(18)} ${String(collection.productCount).padStart(3)}`);
  }
  if (stats.noImage.length) console.warn(`no image (${stats.noImage.length}):`, stats.noImage.slice(0, 8));
  if (stats.duplicateImages.length) {
    console.log(`duplicate photos skipped: ${stats.duplicateImages.length} (ek image sirf ek product par)`);
  }
})();
