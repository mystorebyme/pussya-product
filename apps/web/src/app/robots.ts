import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

// GitHub Pages preview (output: export) me static rehna chahiye
export const dynamic = "force-static";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/orders/", "/checkout", "/account"] },
    ],
    sitemap: `${base}/sitemap.xml`,
    host: base,
  };
}
