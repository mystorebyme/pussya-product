"use client";

import type { Product } from "@/types/catalog";
import { assetUrl } from "@/lib/format";

/**
 * Static preview (GitHub Pages) par `/api/products` hota hi nahi — wishlist aur
 * compare phir bhi kaam karein, isliye build ke waqt bana `catalog-lite.json`
 * fallback hai (sirf tab load hota hai jab API se data na mile).
 */
let cache: Promise<Product[]> | null = null;

export function loadLiteProducts(): Promise<Product[]> {
  if (!cache) {
    cache = fetch(assetUrl("/catalog-lite.json"), { cache: "force-cache" })
      .then((response) => (response.ok ? (response.json() as Promise<Product[]>) : []))
      .catch(() => []);
  }
  return cache;
}

export async function productsByHandles(handles: string[]): Promise<Product[]> {
  if (!handles.length) return [];
  try {
    const response = await fetch(`/api/products?handles=${encodeURIComponent(handles.join(","))}`, {
      cache: "no-store",
    });
    if (response.ok) {
      const payload = (await response.json()) as { data?: Product[] };
      if (payload.data?.length) return payload.data;
    }
  } catch {
    /* static preview — fallback niche */
  }
  const all = await loadLiteProducts();
  const byHandle = new Map(all.map((product) => [product.handle, product]));
  return handles.map((handle) => byHandle.get(handle)).filter((product): product is Product => Boolean(product));
}
