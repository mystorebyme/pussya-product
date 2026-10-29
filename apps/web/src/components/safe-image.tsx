"use client";

import { useState } from "react";
import { assetUrl } from "@/lib/format";

/** GitHub Pages base path ke saath — warna preview par broken icon */
const FALLBACK = assetUrl("/images/placeholder.svg");

/**
 * `next/image` remote CDN ke saath use nahi ho raha; plain `<img>` par CDN block hone
 * (network/SSL/hotlink) se broken icon dikhta hai. Yeh wrapper ek baar fail hone par
 * brand placeholder par gir jaata hai — layout same rehta hai.
 */
export function SafeImage({
  src,
  alt,
  className,
  loading = "lazy",
  fetchPriority,
  sizes,
  fallbackSrc = FALLBACK,
}: {
  src: string;
  alt: string;
  className?: string;
  loading?: "lazy" | "eager";
  fetchPriority?: "high" | "low" | "auto";
  sizes?: string;
  /** CDN fail hone par kya dikhe — default brand placeholder */
  fallbackSrc?: string;
}) {
  const [failed, setFailed] = useState(false);

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={failed || !src ? fallbackSrc : src}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      fetchPriority={fetchPriority}
      sizes={sizes}
      onError={() => setFailed(true)}
    />
  );
}
