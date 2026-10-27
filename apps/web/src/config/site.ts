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
 * Hero banner (owner ke diye hue Diwali posters se — koi crop nahi):
 *   - `banners/banner-desktop.webp` 1536×1024 (≥1024px)
 *   - `banners/banner-tablet.webp`  1448×1086 (768–1023px)
 *   - `banners/banner-mobile.webp`   941×1672 portrait (<768px)
 *   - `banners/banner-fluid.webp`   desktop ka fluid copy
 */
const ASSET_BASE = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";

/**
 * R43: file ka naam wahi hai par content naya hai (logo ka crop badla), isliye
 * URL par version lagate hain — warna browser / CDN purana (kata hua) logo
 * cache se dikhata rehta hai. Naya asset banao to `?v=` badha do.
 */
const BRAND_V = "?v=3";

export const brandAssets = {
  /** full horizontal lockup (NOOR + ETHNIC WEAR) — desktop nav */
  desktop: `${ASSET_BASE}/images/brand/logo-desktop.png${BRAND_V}`,
  /** same lockup, tablet size */
  tablet: `${ASSET_BASE}/images/brand/logo-tablet.png${BRAND_V}`,
  /** compact lockup — mobile */
  mobile: `${ASSET_BASE}/images/brand/logo-mobile.png${BRAND_V}`,
  /** stacked — footer / invoice / any fluid container */
  fluid: `${ASSET_BASE}/images/brand/logo-fluid.png${BRAND_V}`,
  /** square mark — favicon / PWA / admin / WhatsApp thumb */
  mark: `${ASSET_BASE}/images/brand/logo-mark-512.png${BRAND_V}`,
  mark192: `${ASSET_BASE}/images/brand/logo-mark-192.png${BRAND_V}`,
  mark128: `${ASSET_BASE}/images/brand/logo-mark-128.png${BRAND_V}`,
} as const;

export const heroBanners = {
  desktop: `${ASSET_BASE}/images/banners/banner-desktop.webp`,
  tablet: `${ASSET_BASE}/images/banners/banner-tablet.webp`,
  mobile: `${ASSET_BASE}/images/banners/banner-mobile.webp`,
  fluid: `${ASSET_BASE}/images/banners/banner-fluid.webp`,
} as const;

/**
 * Har asset ki **asli** dimension + aspect ratio.
 *
 * Hero wrapper ka `aspect-ratio` bilkul isi ke barabar hota hai, isliye:
 *   • kuch crop nahi hota (pointer/tablet par `SHOP NOW` ya logo kabhi nahi kat-ta),
 *   • kuch stretch nahi hota (image apne hi ratio me render hoti hai),
 *   • space pehle se reserve rehta hai → layout shift (CLS) zero.
 *
 * Ye numbers `node scripts/brand/build-hero-banners.mjs` ke output se aate hain
 * (`tests/unit/round41.test.ts` inhe asli file dimensions se match karta hai).
 */
export const heroBannerSizes = {
  desktop: { width: 1536, height: 1024 },
  tablet: { width: 1448, height: 1086 },
  mobile: { width: 941, height: 1672 },
} as const;

export const HERO_RATIO = {
  desktop: heroBannerSizes.desktop.width / heroBannerSizes.desktop.height,
  tablet: heroBannerSizes.tablet.width / heroBannerSizes.tablet.height,
  mobile: heroBannerSizes.mobile.width / heroBannerSizes.mobile.height,
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
