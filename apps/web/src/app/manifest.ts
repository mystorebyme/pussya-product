import type { MetadataRoute } from "next";
import { brandAssets, siteConfig } from "@/config/site";

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
    background_color: "#000000",
    theme_color: "#862222",
    icons: [
      { src: `${base}/images/brand/logo-mark-192.png`, sizes: "192x192", type: "image/png", purpose: "any" },
      { src: brandAssets.mark, sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
