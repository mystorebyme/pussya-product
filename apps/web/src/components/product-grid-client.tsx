"use client";

import { readJson } from "@/lib/http-json";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/catalog";

/**
 * Pehla page server se aata hai (fast paint), baaki products client-side
 * API se load hote hain — isliye 287 products ka HTML ek saath nahi bhejna padta.
 */
export function ProductGridWithMore({
  initial,
  total,
  query = "",
  pageSize = 24,
  columns = 4,
}: {
  initial: Product[];
  total: number;
  query?: string;
  pageSize?: number;
  columns?: 2 | 3 | 4;
}) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  const loadingRef = useRef(false);
  const productsRef = useRef(initial);
  // render ke andar ref likhna React 19 lint (react-hooks/refs) me galat hai —
  // isliye state ke saath effect me sync karte hain.
  useEffect(() => {
    productsRef.current = products;
  }, [products]);

  const gridClass =
    columns === 2
      ? "grid-cols-2"
      : columns === 3
        ? "grid-cols-2 sm:grid-cols-3"
        : "grid-cols-2 lg:grid-cols-3 xl:grid-cols-4";

  const loadMore = useCallback(async () => {
    if (loadingRef.current) return;
    const currentLength = productsRef.current.length;
    if (currentLength >= total) return;
    loadingRef.current = true;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams(query);
      params.set("offset", String(currentLength));
      params.set("limit", String(pageSize));
      const response = await fetch(`/api/products?${params.toString()}`);
      if (!response.ok) throw new Error("failed");
      const parsed = await readJson<{ data: Product[] }>(response);
      if (!parsed.data?.data) throw new Error("failed");
      // duplicate handles kabhi grid me na aayein (offset race)
      setProducts((current) => {
        const seen = new Set(current.map((item) => item.handle));
        return [...current, ...parsed.data!.data.filter((item) => !seen.has(item.handle))];
      });
    } catch {
      setError("Aur products load nahi hue. Internet check kar ke dobara try kariye.");
    } finally {
      loadingRef.current = false;
      setLoading(false);
    }
  }, [pageSize, query, total]);

  /**
   * Infinite scroll: sentinel screen ke paas aate hi agla page khud load ho jaata
   * hai (800px pehle se — user ko rukna nahi padta). Button fallback ke taur par
   * neeche maujood hai: observer support na ho, error aaye, ya JS slow ho to
   * customer khud dabaa sakta hai.
   */
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    if (products.length >= total) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) void loadMore();
      },
      { rootMargin: "800px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [loadMore, products.length, total]);

  return (
    <div>
      <div className={`grid gap-x-2.5 gap-y-7 sm:gap-x-5 ${gridClass}`}>
        {products.map((product) => (
          <ProductCard key={product.handle} product={product} />
        ))}
      </div>

      {products.length < total ? (
        <div className="mt-8 flex flex-col items-center gap-2">
          <div ref={sentinelRef} aria-hidden className="h-px w-full" />
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="border border-[#862222] px-8 py-3 text-[11px] font-semibold tracking-[.18em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white disabled:opacity-60"
          >
            {loading ? "Loading…" : "Load more products"}
          </button>
          <p className="text-[10.5px] tracking-[.12em] text-[#9c8f82] uppercase">
            Showing {products.length} of {total} products
          </p>
          {error ? <p className="text-[11px] text-[#b3261e]">{error}</p> : null}
        </div>
      ) : total > pageSize ? (
        <p className="mt-8 text-center text-[10.5px] tracking-[.12em] text-[#9c8f82] uppercase">
          All {total} products shown
        </p>
      ) : null}
    </div>
  );
}
