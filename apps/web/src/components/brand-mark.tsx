"use client";

import { useState } from "react";

import { brandAssets } from "@/config/site";

/**
 * Brand mark image — **kabhi invisible nahi**.
 *
 * R44: owner ne bataya ki header me logo nahi dikh raha tha. Do cheezein ki gayi:
 *   1. image ka `onError` pakad kar **text lockup** dikha dete hain (NOOR + ETHNIC
 *      WEAR). Agar CDN/asset/network kuch bhi fail ho, header me brand name phir
 *      bhi padhne ko milta hai — khaali white box ya broken-image icon nahi.
 *   2. `loading="eager"` + `fetchPriority="high"` — header ka logo LCP se pehle
 *      aa jaata hai (lazy-load se kabhi chhoot na jaye).
 *
 * Asli logo hi rehta hai (koi redraw nahi); text sirf fallback hai.
 */
export function BrandMark({
  variant = "header",
  tone = "dark",
}: {
  variant?: "header" | "stacked";
  tone?: "dark" | "light";
}) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <span
        className="brand-fallback flex flex-col items-center leading-none"
        data-testid="brand-fallback"
        role="img"
        aria-label="Noor Ethnic Wear"
      >
        <span className="font-display text-[22px] font-semibold tracking-[.12em] text-[#7d1a1a] sm:text-[26px]">
          NOOR
        </span>
        <span className="mt-0.5 text-[7px] font-medium tracking-[.34em] text-[#a67c2e] sm:text-[8px]">
          ETHNIC WEAR
        </span>
      </span>
    );
  }

  if (variant === "stacked") {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={brandAssets.fluid}
        alt="Noor Ethnic Wear"
        width={458}
        height={400}
        decoding="async"
        fetchPriority="high"
        onError={() => setFailed(true)}
        className="block w-auto max-w-full object-contain"
      />
    );
  }

  return (
    <picture data-tone={tone}>
      <source media="(min-width:1024px)" srcSet={brandAssets.desktop} />
      <source media="(min-width:768px)" srcSet={brandAssets.tablet} />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={brandAssets.mobile}
        alt="Noor Ethnic Wear"
        /* asli file: 310×138 (tablet 369×164, desktop 427×190) — ratio 2.25:1 */
        width={310}
        height={138}
        decoding="async"
        fetchPriority="high"
        onError={() => setFailed(true)}
        className="block w-auto max-w-full object-contain"
      />
    </picture>
  );
}
