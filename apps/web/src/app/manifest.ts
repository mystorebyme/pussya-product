import type { MetadataRoute } from "next";
import { BRAND_V, siteConfig } from "@/config/site";

/** static export (GitHub Pages) me bhi manifest file bane */
export const dynamic = "force-static";

/**
 * PWA/installed app + tab identity: naam aur logo wahi jo site par hai.
 * Icon local brand mark hai (`/images/brand/logo-mark-512.png`), isliye offline/Pages par bhi milta hai.
 */
export default function manifest(): MetadataRoute.Manifest {
  const base = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";
  return {
    name: "Noor Ethnic Wear",
    short_name: "Noor Ethnic Wear",
    description: siteConfig.description,
    start_url: `${base}/` || "/",
    scope: `${base}/` || "/",
    display: "standalone",
    /* R45: splash background pehle kaala tha — store cream/white hai, isliye
       logo ke peeche wahi cream (`#fdfaf4`) aur theme crimson. */
    background_color: "#fdfaf4",
    theme_color: "#862222",
    icons: [
      // dono icons ek hi brand mark se, aur base path dono par lagta hai
      { src: `${base}/images/brand/logo-mark-192.png${BRAND_V}`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: `${base}/images/brand/logo-mark-512.png${BRAND_V}`, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
