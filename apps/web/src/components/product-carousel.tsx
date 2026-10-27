"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ProductCard } from "@/components/product-card";
import type { Product } from "@/types/catalog";

/**
 * Auto-sliding product rail — live store jaisa (flickity autoplay):
 * har 4.5s apne aap aage badhta hai, hover/focus par ruk jata hai,
 * arrows + dots se manual control, mobile par swipe.
 */
export function ProductCarousel({
  products,
  perView = 3,
  autoplay = true,
  interval = 4500,
}: {
  products: Product[];
  /** ek time par kitne cards (desktop) */
  perView?: 2 | 3 | 4;
  autoplay?: boolean;
  interval?: number;
}) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);

  const desktopPerView = perView;
  const total = products.length;
  const maxIndex = Math.max(0, total - desktopPerView);

  const go = useCallback(
    (next: number) => {
      if (!total) return;
      const bounded = next < 0 ? maxIndex : next > maxIndex ? 0 : next;
      setIndex(bounded);
    },
    [maxIndex, total],
  );

  useEffect(() => {
    if (!autoplay || paused || total <= desktopPerView) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current >= maxIndex ? 0 : current + 1));
    }, interval);
    return () => window.clearInterval(timer);
  }, [autoplay, paused, interval, maxIndex, total, desktopPerView]);

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-carousel-item]");
    if (!card) return;
    const gap = window.innerWidth >= 640 ? 20 : 10;
    track.scrollTo({ left: index * (card.offsetWidth + gap), behavior: "smooth" });
  }, [index]);

  if (!products.length) return null;

  return (
    <div
      className="relative"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocusCapture={() => setPaused(true)}
      onBlurCapture={() => setPaused(false)}
    >
      <div
        ref={trackRef}
        data-testid="product-carousel"
        className="no-scrollbar flex snap-x snap-mandatory gap-2.5 overflow-x-auto scroll-smooth sm:gap-5"
      >
        {products.map((product) => (
          <div
            key={product.handle}
            data-carousel-item
            className="w-[calc(50%-5px)] shrink-0 snap-start sm:w-[calc(50%-10px)] lg:w-[calc(33.333%-14px)] xl:w-[calc(33.333%-14px)]"
          >
            <ProductCard product={product} />
          </div>
        ))}
      </div>

      {total > desktopPerView ? (
        <>
          <button
            type="button"
            onClick={() => go(index - 1)}
            aria-label="Previous products"
            className="absolute -left-2 top-[38%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5dbd0] bg-white/95 text-[#862222] shadow-sm transition hover:bg-white lg:flex"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => go(index + 1)}
            aria-label="Next products"
            className="absolute -right-2 top-[38%] hidden h-9 w-9 -translate-y-1/2 items-center justify-center rounded-full border border-[#e5dbd0] bg-white/95 text-[#862222] shadow-sm transition hover:bg-white lg:flex"
          >
            ›
          </button>
          <div className="mt-4 flex justify-center gap-1.5">
            {Array.from({ length: maxIndex + 1 }).map((_, dot) => (
              <button
                key={dot}
                type="button"
                onClick={() => go(dot)}
                aria-label={`Go to slide ${dot + 1}`}
                className={`h-1.5 rounded-full transition-all ${
                  dot === index ? "w-5 bg-[#862222]" : "w-1.5 bg-[#d9cec3] hover:bg-[#b9a99a]"
                }`}
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
