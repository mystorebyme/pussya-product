import { brandAssets } from "@/config/site";

/**
 * Brand lockup — owner ka **original** logo (gold crown + gown + NOOR ETHNIC WEAR
 * wordmark), bilkul jaisa diya gaya hai (koi redraw/typography change nahi).
 *
 * Device ke hisaab se **alag asset** aata hai, `<picture>` se — browser sirf ek hi
 * file download karta hai:
 *   - <768px   → `logo-mobile.png`  compact horizontal (mark chhota, naam bada)
 *   - 768–1023 → `logo-tablet.png`  horizontal, mark bada
 *   - ≥1024px  → `logo-desktop.png` full horizontal lockup (highest resolution)
 *
 * `variant="stacked"` → `logo-fluid.png` (mark upar, wordmark neeche) — footer jaisi
 * jagah jahan height available hai par width kam.
 *
 * `tone="light"` (maroon footer) par logo ko cream plate par rakhte hain — original
 * logo ka wordmark black hai aur maroon par invisible ho jaata. Logo khud kabhi
 * recolor nahi hota.
 */
export function BrandLockup({
  tone = "dark",
  size = "header",
  variant = "header",
  className = "",
}: {
  /** `dark` = light background (header), `light` = maroon/dark footer */
  tone?: "dark" | "light";
  /** `header` = nav, `compact` = mobile drawer, `large` = footer */
  size?: "header" | "compact" | "large";
  /** `header` = horizontal lockup per device, `stacked` = fluid stacked file */
  variant?: "header" | "stacked";
  className?: string;
}) {
  return (
    <span
      data-size={size}
      data-variant={variant}
      className={`brand-lockup inline-flex items-center ${
        tone === "light" ? "rounded-sm bg-[#fdfaf4] px-2.5 py-2" : ""
      } ${className}`}
    >
      {variant === "stacked" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={brandAssets.fluid}
          alt="Noor Ethnic Wear"
          /* asli file: 458×400 — ratio wahi rakha hai taaki layout shift na ho */
          width={458}
          height={400}
          decoding="async"
          className="block w-auto max-w-full object-contain"
        />
      ) : (
        <picture>
          <source media="(min-width:1024px)" srcSet={brandAssets.desktop} />
          <source media="(min-width:768px)" srcSet={brandAssets.tablet} />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={brandAssets.mobile}
            alt="Noor Ethnic Wear"
            /* asli file: 285×112 (desktop 382×150, tablet 331×130) */
            width={285}
            height={112}
            decoding="async"
            className="block w-auto max-w-full object-contain"
          />
        </picture>
      )}
    </span>
  );
}
