import { CANONICAL_ORIGIN } from "@/lib/domain";

/**
 * Brand assets — owner ke original logo/poster se banaye gaye responsive files.
 *
 * Sab local hain (`public/images/brand`, `public/images/banners`), isliye GitHub
 * Pages ke base path par bhi chalte hain aur kisi doosri site par depend nahi karte.
 * Banane ka script: `node scripts/brand/build-responsive-assets.mjs` (koi redraw nahi,
 * sirf trim/crop/resize + WebP).
 *
 * Logo (owner ke apne logo se crop — koi redraw nahi):
 *   - `brand/logo-mobile.png`   <768px    compact horizontal (mark chhota, naam bada)
 *   - `brand/logo-tablet.png`   768–1023  horizontal, mark bada
 *   - `brand/logo-desktop.png`  ≥1024px   full horizontal lockup (highest resolution)
 *   - `brand/logo-fluid.png`    stacked (mark upar, wordmark neeche) — footer / invoice
 *   - `brand/logo-mark-{128,192,512}.png` square official mark (favicon, PWA, admin)
 *
 * Hero banner:
 *   - `banners/banner-desktop.webp` wide  (≥1024px)
 *   - `banners/banner-tablet.webp`  4:3   (768–1023px)
 *   - `banners/banner-mobile.webp`  portrait (<768px)
 *   - `banners/banner-fluid.webp`   fluid fallback
 */
const ASSET_BASE = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";

export const brandAssets = {
  /** horizontal lockup — desktop nav */
  desktop: `${ASSET_BASE}/images/brand/logo-desktop.png`,
  /** horizontal, mark bada — tablet */
  tablet: `${ASSET_BASE}/images/brand/logo-tablet.png`,
  /** compact horizontal — mobile */
  mobile: `${ASSET_BASE}/images/brand/logo-mobile.png`,
  /** stacked — footer / invoice / any fluid container */
  fluid: `${ASSET_BASE}/images/brand/logo-fluid.png`,
  /** square mark — favicon / PWA / admin / WhatsApp thumb */
  mark: `${ASSET_BASE}/images/brand/logo-mark-512.png`,
  mark192: `${ASSET_BASE}/images/brand/logo-mark-192.png`,
  mark128: `${ASSET_BASE}/images/brand/logo-mark-128.png`,
} as const;

export const heroBanners = {
  desktop: `${ASSET_BASE}/images/banners/banner-desktop.webp`,
  tablet: `${ASSET_BASE}/images/banners/banner-tablet.webp`,
  mobile: `${ASSET_BASE}/images/banners/banner-mobile.webp`,
  fluid: `${ASSET_BASE}/images/banners/banner-fluid.webp`,
} as const;

/** aspect ratios (CSS `aspect-ratio` ke liye) — layout shift zero */
export const HERO_RATIO = {
  desktop: 1779 / 594,
  tablet: 4 / 3,
  mobile: 860 / 1290,
} as const;

/** invoice / print ke liye poora logo */
export const logoUrl = brandAssets.fluid;
export const logoLockupUrl = brandAssets.desktop;
/** chhota square mark */
export const logoSmall = brandAssets.mark128;
export const logoWhiteUrl = brandAssets.mark192;
export const logoFallback = brandAssets.fluid;
/** favicon / PWA icon */
export const logoMark = brandAssets.mark;

/**
 * Site ka apna URL — WhatsApp / invoice / canonical links isi se banate hain.
 * Domain lagne ke baad `NEXT_PUBLIC_SITE_URL` set kar dijiye (jaise https://noorethnicwear.in);
 * tab tak deployed URL use hota hai. Purani/cloned site ka link kabhi nahi bhejte.
 */
export const siteUrl =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ??
  process.env.NEXT_PUBLIC_SITE_ORIGIN?.replace(/\/$/, "") ??
  /**
   * R33: owner ka apna domain — **noorethnicwear.in**.
   * `noorethnicwear.in` hamari site **nahi** hai (wo reference store hai),
   * isliye fallback kabhi wo nahi hota. Vercel par env se override hota hai.
   */
  CANONICAL_ORIGIN;

export const siteConfig = {
  name: "Noor Ethnic Wear",
  url: siteUrl,
  ogImage: `${ASSET_BASE}/images/og-image.jpg`,
  description:
    "Designer Anarkali suits, lehenga choli and printed suit sets by Noor Ethnic Wear — hand-finished for weddings and festivals.",
  /**
   * Contact number ka asli source **Google Sheet → Settings** hai (site usko har
   * 3 second me padhti hai). Ye do value sirf emergency override ke liye hain —
   * `NEXT_PUBLIC_SUPPORT_PHONE` / `NEXT_PUBLIC_WHATSAPP`. Khaali = sirf sheet.
   */
  phone: process.env.NEXT_PUBLIC_SUPPORT_PHONE?.trim() ?? "",
  whatsapp: process.env.NEXT_PUBLIC_WHATSAPP?.trim() ?? "",
  /** owner rule: site par support email kahin nahi — sirf WhatsApp/phone */
  email: "",
  address: "India",
  /**
   * Sirf asli accounts — koi dummy link nahi. Abhi ke liye Instagram sirf
   * **URL text** ke roop me dikhta hai (clickable nahi), WhatsApp hi working link hai.
   */
  socials: {
    instagram: "https://www.instagram.com/noorethnicwear",
    instagramHandle: "noorethnicwear",
  },
  currency: "INR",
} as const;

export const ORDER_STATUS_COPY: Record<string, string> = {
  placed: "Placed",
  confirmed: "Confirmed",
  packed: "Packed",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
  returned: "Returned",
};
