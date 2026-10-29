"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";

/**
 * PDP gallery — live store jaisa: thumbnail rail, cross-fade main image, hover zoom
 * (sirf mouse wale devices par), swipe (mobile), keyboard arrows, image counter.
 *
 * Size window ke hisaab se: mobile par mobile, tablet par tablet, desktop par desktop —
 * frame kabhi viewport se bada nahi hota (`max-h` + `w-full`), aur poora page
 * horizontal scroll me nahi jaata.
 *
 * Image par click / "Full screen" button se full-screen viewer khulta hai (zoom + arrows).
 */
export function ProductGallery({
  images,
  title,
  badge,
}: {
  images: string[];
  title: string;
  badge?: string | null;
}) {
  const gallery = useMemo(() => (images.length ? images : ["/images/placeholder.svg"]), [images]);
  const [index, setIndex] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState("50% 50%");
  const [lightbox, setLightbox] = useState(false);
  const touchX = useRef<number | null>(null);
  const frameRef = useRef<HTMLDivElement | null>(null);

  const go = useCallback(
    (next: number) => setIndex((current) => (next + gallery.length) % gallery.length),
    [gallery.length],
  );

  // aage-pichhli image preload — arrow dabate hi blank frame na dikhe
  useEffect(() => {
    for (const offset of [1, -1, 2]) {
      const src = gallery[(index + offset + gallery.length) % gallery.length];
      if (!src) continue;
      const img = new Image();
      img.src = imageUrl(src, 900);
    }
  }, [index, gallery]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      const tag = (event.target as HTMLElement | null)?.tagName?.toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      if (event.key === "ArrowRight") go(index + 1);
      if (event.key === "ArrowLeft") go(index - 1);
      if (event.key === "Escape") setLightbox(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [go, index]);

  // full-screen viewer khula ho to peeche ka page scroll na ho
  useEffect(() => {
    if (!lightbox) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [lightbox]);

  function onMove(event: React.MouseEvent<HTMLDivElement>) {
    const node = frameRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = ((event.clientX - rect.left) / rect.width) * 100;
    const y = ((event.clientY - rect.top) / rect.height) * 100;
    setOrigin(`${x}% ${y}%`);
  }

  return (
    <div className="flex w-full min-w-0 flex-col-reverse gap-3 sm:flex-row">
      {gallery.length > 1 ? (
        <div className="no-scrollbar flex w-full gap-2 overflow-x-auto sm:max-h-[560px] sm:w-[78px] sm:shrink-0 sm:flex-col sm:overflow-y-auto">
          {gallery.map((image, imageIndex) => (
            <button
              key={`${image}-${imageIndex}`}
              type="button"
              onClick={() => setIndex(imageIndex)}
              aria-label={`View image ${imageIndex + 1} of ${gallery.length}`}
              aria-current={index === imageIndex}
              className={`relative h-20 w-16 shrink-0 overflow-hidden border bg-[#f6f1ec] transition sm:h-[96px] sm:w-full ${
                index === imageIndex
                  ? "border-[#862222] opacity-100"
                  : "border-transparent opacity-75 hover:border-[#d9c6b4] hover:opacity-100"
              }`}
            >
              <SafeImage src={imageUrl(image, 200)} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      <div className="relative w-full min-w-0 flex-1">
        <div
          ref={frameRef}
          className={`gallery-frame relative mx-auto aspect-[4/5] max-h-[calc(100svh-150px)] w-full touch-pan-y overflow-hidden bg-[#f6f1ec] sm:aspect-[3/4] lg:max-h-[calc(100svh-140px)] ${
            zoom ? "is-zoomed" : ""
          }`}
          data-testid="pdp-main-image-frame"
          data-zoom={zoom ? "on" : "off"}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => {
            setZoom(false);
            setOrigin("50% 50%");
          }}
          onMouseMove={onMove}
          onDoubleClick={() => setLightbox(true)}
          onTouchStart={(event) => {
            touchX.current = event.touches[0]?.clientX ?? null;
          }}
          onTouchEnd={(event) => {
            const start = touchX.current;
            const end = event.changedTouches[0]?.clientX ?? null;
            touchX.current = null;
            if (start === null || end === null) return;
            const delta = end - start;
            if (Math.abs(delta) < 40) return;
            go(index + (delta < 0 ? 1 : -1));
          }}
        >
          {gallery.map((image, imageIndex) => (
            <div
              key={`${image}-slide-${imageIndex}`}
              /*
               * R48 (owner): hover par **purani image hat jaani chahiye** aur zoom
               * wali dikhni chahiye. Isliye active slide ki opacity 0 ho jaati hai
               * (zoom layer uske upar aa jaata hai) aur cursor hatne par wapas
               * 100% — exactly pehle jaisa.
               */
              className={`gallery-slide absolute inset-0 ${
                imageIndex === index
                  ? `z-10 ${zoom ? "opacity-0" : "opacity-100"}`
                  : "pointer-events-none opacity-0"
              }`}
              aria-hidden={imageIndex !== index}
            >
              {/* object-contain: puri image dikhe — pehle cover se lambi images cut ho rahi thi */}
              <SafeImage
                src={imageUrl(image, imageIndex === index ? 1200 : 600)}
                alt={`${title} — image ${imageIndex + 1}`}
                loading={imageIndex === 0 ? "eager" : "lazy"}
                fetchPriority={imageIndex === 0 ? "high" : "auto"}
                className="h-full w-full object-contain"
              />
            </div>
          ))}

          {/*
            hover zoom layer (sirf pointer devices par dikhta hai) —
            base image ke upar 190% zoom, cursor ke hisaab se position. Mouse
            leave par opacity 0 ho jaati hai aur base slide wapas aa jaati hai.
          */}
          <div
            data-testid="pdp-zoom-layer"
            className="gallery-zoom pointer-events-none absolute inset-0 z-20 hidden bg-no-repeat sm:block"
            style={{
              backgroundImage: zoom ? `url("${imageUrl(gallery[index], 1400)}")` : "none",
              backgroundSize: "190%",
              backgroundPosition: origin,
              opacity: zoom ? 1 : 0,
            }}
          />

          {badge ? (
            <span className="absolute left-3 top-3 z-20 bg-[#862222] px-2 py-1 text-[10px] font-semibold tracking-[.1em] text-white uppercase">
              {badge}
            </span>
          ) : null}

          {/* full-screen viewer */}
          <button
            type="button"
            onClick={() => setLightbox(true)}
            aria-label="Open image full screen"
            title="Full screen"
            data-testid="gallery-expand"
            className="absolute right-3 top-3 z-20 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-[#3f3830] shadow-sm transition hover:bg-white"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 9V4h5M20 15v5h-5M20 9V4h-5M4 15v5h5" />
            </svg>
          </button>

          {gallery.length > 1 ? (
            <>
              <button
                type="button"
                onClick={() => go(index - 1)}
                aria-label="Previous image"
                className="absolute left-2 top-1/2 z-20 -translate-y-1/2 bg-white/85 p-2 text-[#3f3830] opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0 sm:hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M15 5l-7 7 7 7" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => go(index + 1)}
                aria-label="Next image"
                className="absolute right-2 top-1/2 z-20 -translate-y-1/2 bg-white/85 p-2 text-[#3f3830] opacity-0 shadow-sm transition hover:bg-white focus-visible:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M9 5l7 7-7 7" />
                </svg>
              </button>
              <span className="absolute bottom-3 right-3 z-20 bg-black/45 px-2 py-1 text-[10.5px] tracking-[.1em] text-white">
                {index + 1} / {gallery.length}
              </span>
            </>
          ) : null}
        </div>

        {gallery.length > 1 ? (
          <div className="mt-2 flex justify-center gap-1.5 sm:hidden">
            {gallery.map((image, imageIndex) => (
              <button
                key={`${image}-dot`}
                type="button"
                onClick={() => setIndex(imageIndex)}
                aria-label={`Image ${imageIndex + 1}`}
                className={`h-1.5 w-1.5 rounded-full transition ${
                  index === imageIndex ? "bg-[#862222]" : "bg-[#d9c6b4]"
                }`}
              />
            ))}
          </div>
        ) : null}
      </div>

      {lightbox ? (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`${title} — full screen image`}
          data-testid="gallery-lightbox"
          className="fixed inset-0 z-[120] flex flex-col bg-black/95"
          onClick={() => setLightbox(false)}
        >
          <div className="flex items-center justify-between px-4 py-3 text-white/85">
            <span className="text-[11.5px] tracking-[.14em] uppercase">
              {index + 1} / {gallery.length}
            </span>
            <button
              type="button"
              onClick={() => setLightbox(false)}
              aria-label="Close full screen image"
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white/10 transition hover:bg-white/20"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M6 6l12 12M18 6L6 18" />
              </svg>
            </button>
          </div>

          <div className="relative flex flex-1 items-center justify-center overflow-hidden px-3 pb-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl(gallery[index], 1800)}
              alt={`${title} — image ${index + 1}`}
              className="max-h-full max-w-full object-contain"
              onClick={(event) => event.stopPropagation()}
            />
            {gallery.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(index - 1);
                  }}
                  aria-label="Previous image"
                  className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/15 p-3 text-white transition hover:bg-white/25"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M15 5l-7 7 7 7" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    go(index + 1);
                  }}
                  aria-label="Next image"
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/15 p-3 text-white transition hover:bg-white/25"
                >
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </>
            ) : null}
          </div>

          {gallery.length > 1 ? (
            <div className="no-scrollbar flex justify-center gap-2 overflow-x-auto px-4 pb-4" onClick={(event) => event.stopPropagation()}>
              {gallery.map((image, imageIndex) => (
                <button
                  key={`${image}-lb`}
                  type="button"
                  onClick={() => setIndex(imageIndex)}
                  aria-label={`Go to image ${imageIndex + 1}`}
                  className={`h-14 w-11 shrink-0 overflow-hidden border-2 transition ${
                    index === imageIndex ? "border-white" : "border-transparent opacity-60 hover:opacity-100"
                  }`}
                >
                  <img src={imageUrl(image, 160)} alt="" className="h-full w-full object-cover" />
                </button>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
