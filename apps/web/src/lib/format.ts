/**
 * Local asset (public/ folder) ka URL. GitHub Pages par site `/tannu-product-/`
 * ke neeche rehti hai, isliye base path add karna zaroori hai — warna image 404.
 */
const ASSET_BASE = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";

export function assetUrl(pathname: string): string {
  if (!pathname) return pathname;
  if (/^https?:\/\//.test(pathname) || pathname.startsWith("data:")) return pathname;
  const clean = pathname.startsWith("/") ? pathname : `/${pathname}`;
  return `${ASSET_BASE}${clean}`;
}

/** Paisa -> rupees display. Calculation kabhi float me nahi. */
export function formatPrice(paise: number): string {
  const rupees = Math.round(paise) / 100;
  return `Rs. ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  })}`;
}

export function formatPriceDecimal(paise: number): string {
  const rupees = Math.round(paise) / 100;
  return `Rs. ${rupees.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function discountPercent(price: number, compareAtPrice?: number | null): number {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/** Shopify CDN image ko chhota size me maango -> fast load */
export function imageUrl(src: string | undefined, width = 600): string {
  if (!src) return "/images/placeholder.svg";
  if (!src.includes("cdn.shopify.com")) return src;
  return `${src}${src.includes("?") ? "&" : "?"}width=${width}`;
}

/**
 * R39 (owner): "timezone india ka chalna chiye" — site/admin Vercel par UTC me
 * render hoti thi (server iad1), isliye subah 7:46 IST ka order "2:16 am"
 * dikhta tha. Har date formatter isi constant ko `timeZone` me deta hai.
 */
export const STORE_TIME_ZONE = "Asia/Kolkata";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: STORE_TIME_ZONE,
  });
}
