import type { MetadataRoute } from "next";
import { canonicalCollectionHandle, collections, products } from "@/lib/store";
import { siteConfig } from "@/config/site";

// GitHub Pages preview (output: export) me static rehna chahiye
export const dynamic = "force-static";

/** ek hi URL do baar na jaaye (Google duplicate entries ko galti samajhta hai) */
function dedupe<T extends { url: string }>(entries: T[]): T[] {
  const seen = new Set<string>();
  return entries.filter((entry) => {
    if (seen.has(entry.url)) return false;
    seen.add(entry.url);
    return true;
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes = [
    { path: "", priority: 1 },
    { path: "/collections", priority: 0.9 },
    { path: "/search", priority: 0.4 },
    { path: "/pages/about-us", priority: 0.5 },
    { path: "/pages/contact", priority: 0.5 },
    { path: "/track-order", priority: 0.5 },
    { path: "/pages/size-guide", priority: 0.4 },
    { path: "/policies/privacy-policy", priority: 0.3 },
    { path: "/policies/terms-and-conditions", priority: 0.3 },
    { path: "/policies/refund-and-return-policy", priority: 0.3 },
    { path: "/policies/shipping-policy", priority: 0.3 },
  ];

  return [
    ...staticRoutes.map((route) => ({
      url: `${base}${route.path}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: route.priority,
    })),
    // khaali collection (jaise saree) par products nahi hain — thin page ko sitemap me na bhejein.
    // Canonical (clean) handle use hota hai aur duplicate URL ek hi baar jaata hai.
    ...dedupe(
      collections
        .filter((collection) => products.some((product) => product.collections.includes(collection.handle)))
        .map((collection) => ({
          url: `${base}/collections/${canonicalCollectionHandle(collection.handle)}`,
          lastModified: now,
          changeFrequency: "daily" as const,
          priority: 0.8,
        })),
    ),
    ...products.map((product) => ({
      url: `${base}/products/${product.handle}`,
      lastModified: now,
      changeFrequency: "weekly" as const,
      priority: 0.7,
    })),
  ];
}
