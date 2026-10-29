"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { readJson } from "@/lib/http-json";
import { assetUrl } from "@/lib/format";
import { CollectionToolbar } from "@/components/collection-toolbar";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/catalog";

const PAGE_SIZE = 24;

/**
 * Collection page ka interactive hissa.
 *
 * Page khud static HTML hai (no searchParams): pehle 24 products server se aate hain,
 * sort/price change par sirf grid fetch hota hai — full page reload nahi, URL
 * `replaceState` se sync rehta hai. Isliye PLP ka TTFB CDN edge se aata hai.
 *
 * Round 16 (speed):
 *   • agla page pehle se **prefetch** hota hai (idle me + sentinel ke paas scroll par),
 *     isliye "Load more"/infinite scroll par spinner nahi dikhta.
 *   • GitHub Pages (static export) par `/api/products` hota hi nahi — wahan product
 *     data `/catalog-lite.json` se client-side filter/sort hota hai, warna preview par
 *     "aur products load nahi hue" error aata tha.
 */
export function CollectionBrowser({
  handle,
  initial,
  initialTotal,
  emptyState,
}: {
  handle: string;
  initial: Product[];
  initialTotal: number;
  emptyState?: React.ReactNode;
}) {
  const [items, setItems] = useState<Product[]>(initial);
  const [total, setTotal] = useState(initialTotal);
  const [sort, setSort] = useState("featured");
  const [price, setPrice] = useState("all");
  const [loading, setLoading] = useState(false);
  const [appending, setAppending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const firstRender = useRef(true);
  /** neeche tak scroll karte hi agle products khud load ho jaate hain */
  const sentinelRef = useRef<HTMLDivElement | null>(null);
  /** prefetched pages: "sort|price|offset" → payload */
  const pages = useRef(new Map<string, { data: Product[]; total: number }>());
  /** static preview ke liye poora chhota catalogue (ek hi baar download) */
  const localCatalog = useRef<Product[] | null>(null);

  const buildQuery = useCallback(
    (nextSort: string, nextPrice: string) => {
      const params = new URLSearchParams({ collection: handle, sort: nextSort, price: nextPrice, limit: String(PAGE_SIZE) });
      return params.toString();
    },
    [handle],
  );

  /** GitHub Pages fallback — static catalogue par wahi filter/sort/pagination */
  const localPage = useCallback(
    async (nextSort: string, nextPrice: string, offset: number) => {
      if (!localCatalog.current) {
        const response = await fetch(assetUrl("/catalog-lite.json"), { cache: "force-cache" });
        if (!response.ok) throw new Error("catalog fetch failed");
        const all = await readJson<Product[]>(response);
        if (!Array.isArray(all)) throw new Error("catalog parse failed");
        localCatalog.current = all;
      }
      // colour group ka sirf ek card (server jaisa behaviour)
      const seen = new Set<string>();
      let list = localCatalog.current.filter((product) => {
        const key = (product as Product & { colourGroup?: string | null }).colourGroup ?? product.handle;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      if (handle && handle !== "all") {
        list = list.filter((product) => product.collections?.includes(handle));
      }
      const inRange: Record<string, (p: Product) => boolean> = {
        "under-2500": (p) => p.price < 250000,
        "2500-3000": (p) => p.price >= 250000 && p.price < 300000,
        "3000-3500": (p) => p.price >= 300000 && p.price < 350000,
        "above-3500": (p) => p.price >= 350000,
      };
      if (inRange[nextPrice]) list = list.filter(inRange[nextPrice]!);
      const sorted = [...list];
      switch (nextSort) {
        case "price-low":
          sorted.sort((a, b) => a.price - b.price);
          break;
        case "price-high":
          sorted.sort((a, b) => b.price - a.price);
          break;
        case "discount":
          sorted.sort(
            (a, b) =>
              (b.compareAtPrice ?? b.price) - b.price - ((a.compareAtPrice ?? a.price) - a.price),
          );
          break;
        case "title-asc":
          sorted.sort((a, b) => a.title.localeCompare(b.title));
          break;
        default:
          sorted.sort((a, b) => Number(Boolean(b.featured)) - Number(Boolean(a.featured)));
      }
      return { data: sorted.slice(offset, offset + PAGE_SIZE), total: sorted.length };
    },
    [handle],
  );

  const fetchPage = useCallback(
    async (nextSort: string, nextPrice: string, offset: number) => {
      const key = `${nextSort}|${nextPrice}|${offset}`;
      const cached = pages.current.get(key);
      if (cached) return cached;

      const query = buildQuery(nextSort, nextPrice);
      try {
        const response = await fetch(`/api/products?${query}&offset=${offset}`);
        if (!response.ok) throw new Error("request failed");
        const parsed = await readJson<{ data: Product[]; total: number }>(response);
        if (!parsed.data?.data) throw new Error("request failed");
        pages.current.set(key, parsed.data);
        return parsed.data;
      } catch (apiError) {
        // static export (Pages) par API route nahi hota — local catalogue se serve karo
        try {
          const payload = await localPage(nextSort, nextPrice, offset);
          pages.current.set(key, payload);
          return payload;
        } catch {
          throw apiError;
        }
      }
    },
    [buildQuery, localPage],
  );

  const applyFilters = useCallback(
    async (nextSort: string, nextPrice: string) => {
      setLoading(true);
      setError(null);
      try {
        const payload = await fetchPage(nextSort, nextPrice, 0);
        setItems(payload.data);
        setTotal(payload.total);
      } catch {
        setError("We could not load the products. Check your connection and try again.");
      } finally {
        setLoading(false);
      }
    },
    [fetchPage],
  );

  // shared link (?sort=price-low&price=under-2500) khulta hai to wahi state apply karo
  useEffect(() => {
    if (!firstRender.current) return;
    firstRender.current = false;
    const params = new URLSearchParams(window.location.search);
    const nextSort = params.get("sort") ?? "featured";
    const nextPrice = params.get("price") ?? "all";
    if (nextSort === "featured" && nextPrice === "all") return;
    setSort(nextSort);
    setPrice(nextPrice);
    void applyFilters(nextSort, nextPrice);
  }, [applyFilters]);

  const syncUrl = useCallback((nextSort: string, nextPrice: string) => {
    const params = new URLSearchParams();
    if (nextSort !== "featured") params.set("sort", nextSort);
    if (nextPrice !== "all") params.set("price", nextPrice);
    const suffix = params.toString();
    window.history.replaceState(null, "", suffix ? `?${suffix}` : window.location.pathname);
  }, []);

  function handleSort(value: string) {
    setSort(value);
    syncUrl(value, price);
    void applyFilters(value, price);
  }

  function handlePrice(value: string) {
    setPrice(value);
    syncUrl(sort, value);
    void applyFilters(sort, value);
  }

  async function loadMore() {
    setAppending(true);
    setError(null);
    try {
      const payload = await fetchPage(sort, price, items.length);
      setItems((current) => [...current, ...payload.data]);
      setTotal(payload.total);
      // agle page ki request abhi se — scroll karte hi instantly dikhega
      void fetchPage(sort, price, items.length + payload.data.length).catch(() => undefined);
    } catch {
      setError("We could not load more products. Please try again.");
    } finally {
      setAppending(false);
    }
  }

  const hasMore = items.length < total;

  // idle time me pehla "load more" page pehle se le lo (instant feel)
  useEffect(() => {
    if (!hasMore) return;
    const prefetch = () => {
      void fetchPage(sort, price, items.length).catch(() => undefined);
    };
    const idle = (window as Window & { requestIdleCallback?: (cb: () => void) => number })
      .requestIdleCallback;
    if (typeof idle === "function") {
      idle(prefetch);
      return;
    }
    const timer = window.setTimeout(prefetch, 1200);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, sort, price, items.length, fetchPage]);

  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasMore) return;
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        if (appending || loading) return;
        void loadMore();
      },
      // 900px pehle se trigger — user ko spinner nahi dikhta
      { rootMargin: "900px 0px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
    // loadMore/items badalne par naya sentinel observe karna zaroori hai
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasMore, appending, loading, items.length, sort, price]);

  return (
    <div className="container-noor">
      <CollectionToolbar
        total={total}
        sort={sort}
        priceRange={price}
        loading={loading}
        onSortChange={handleSort}
        onPriceChange={handlePrice}
      />

      <div className="pt-5 pb-12">
        {items.length === 0 ? (
          (emptyState ?? (
            <div className="py-20 text-center">
              <p className="font-display text-[24px] text-[#2f2a25]">No styles here just yet</p>
              <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] leading-relaxed text-[#6b6259]">
                Try a different filter, or browse the edits our customers are loving right now.
              </p>
            </div>
          ))
        ) : (
          <>
            <div
              className={`grid grid-cols-2 gap-x-2.5 gap-y-7 transition-opacity sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4 ${
                loading ? "opacity-50" : "opacity-100"
              }`}
            >
              {items.map((product) => (
                <ProductCard key={product.handle} product={product} />
              ))}
            </div>

            {error ? <p className="mt-5 text-center text-[12px] text-[#a02020]">{error}</p> : null}

            {hasMore ? (
              <div ref={sentinelRef} className="mt-10 text-center" data-testid="auto-load-sentinel">
                <button
                  type="button"
                  onClick={() => void loadMore()}
                  disabled={appending || loading}
                  className="border border-[#862222] px-8 py-3 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white disabled:opacity-50"
                >
                  {appending ? "Loading…" : `Load more (${total - items.length} left)`}
                </button>
                <p className="mt-2 text-[10.5px] text-[#a49a90]">More styles load automatically as you scroll</p>
              </div>
            ) : (
              <p className="mt-10 text-center text-[11px] tracking-[.14em] text-[#a49a90] uppercase">
                All {total} styles loaded
              </p>
            )}
          </>
        )}
      </div>
    </div>
  );
}
