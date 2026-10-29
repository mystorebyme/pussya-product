"use client";

import { readJson } from "@/lib/http-json";

import { useEffect, useMemo, useState } from "react";
import { ProductCarousel } from "@/components/product-carousel";
import type { Product } from "@/types/catalog";
import { msUntilNextBucket, rotationBucket, rotatePick } from "@/lib/rotation";

/**
 * Home page ka rail jo **har 10 minute me** naya set dikhata hai.
 *
 * - Pehla set server se aata hai (SEO + instant paint).
 * - 10 minute ka window badalte hi `/api/rotation` se naya set aata hai.
 * - API na chale (jaise static preview / offline) to usi pool se locally
 *   shuffle kar lete hain — isliye items phir bhi badalte hain.
 */
export function RotatingRail({
  rail,
  pool,
  initial,
  perView = 3,
}: {
  rail: string;
  /** fallback pool (sirf static/offline case me use hota hai) */
  pool: Product[];
  initial: Product[];
  perView?: 2 | 3 | 4;
}) {
  const [products, setProducts] = useState<Product[]>(initial);
  const [bucket, setBucket] = useState(() => rotationBucket());

  useEffect(() => {
    let timer: number | undefined;
    let cancelled = false;

    const load = async (nextBucket: number) => {
      setBucket(nextBucket);
      try {
        const response = await fetch(`/api/rotation?rail=${rail}&bucket=${nextBucket}`, { cache: "no-store" });
        if (!response.ok) throw new Error(String(response.status));
        const parsed = await readJson<{ products?: Product[] }>(response);
        const payload = parsed.data;
        if (!cancelled && payload?.products?.length) {
          setProducts(payload.products);
          return;
        }
        throw new Error("empty");
      } catch {
        // API na ho (static preview) to local shuffle — items phir bhi badalte hain
        if (!cancelled) setProducts(rotatePick(pool, `${rail}:${nextBucket}`, initial.length || 8));
      }
    };

    const schedule = () => {
      timer = window.setTimeout(async () => {
        await load(rotationBucket());
        if (!cancelled) schedule();
      }, msUntilNextBucket() + 1_000);
    };

    // page purana cache hua ho to turant current bucket le aao
    if (bucket !== rotationBucket()) void load(rotationBucket());
    schedule();

    // tab wapas active hone par bhi sync
    const onVisible = () => {
      if (document.visibilityState === "visible" && bucket !== rotationBucket()) void load(rotationBucket());
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rail]);

  const key = useMemo(() => `${rail}-${bucket}-${products[0]?.handle ?? ""}`, [rail, bucket, products]);

  if (!products.length) return null;
  return <ProductCarousel key={key} products={products} perView={perView} />;
}
