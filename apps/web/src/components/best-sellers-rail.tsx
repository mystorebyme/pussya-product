"use client";

import { useEffect, useState } from "react";
import { readJson } from "@/lib/http-json";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/catalog";

/**
 * Best sellers rail — server par orders se ranked list aati hai (SEO + instant paint),
 * phir client `/api/best-sellers` se taaza ranking le leta hai.
 *
 * Static preview (GitHub Pages) par API nahi hota → server wali list hi rehti hai,
 * isliye kuch toota nahi dikhta.
 */
export function BestSellersRail({ initial }: { initial: Product[] }) {
  const [products, setProducts] = useState<Product[]>(initial);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const response = await fetch("/api/best-sellers?limit=8", { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = await readJson<{ products?: Product[] }>(response);
        const next = parsed.data?.products;
        if (!cancelled && Array.isArray(next) && next.length) setProducts(next);
      } catch {
        // offline/preview — server list hi dikhti rahegi
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!products.length) return null;

  return (
    <section className="container-noor py-10 lg:py-14" data-testid="best-sellers">
      <div className="flex flex-col items-center text-center">
        <h2 className="font-display text-[26px] leading-tight font-medium tracking-[.03em] text-[#2f2a25] sm:text-[32px]">
          Best sellers
        </h2>
        <p className="mt-1 text-[11.5px] tracking-[.14em] text-[#9c8f82] uppercase">
          Sabse zyada order hone wale pieces — ranking har order ke saath update hoti hai
        </p>
      </div>
      <div className="mt-7 grid grid-cols-2 gap-x-2.5 gap-y-7 sm:gap-x-5 lg:grid-cols-4">
        {products.slice(0, 8).map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </div>
    </section>
  );
}
