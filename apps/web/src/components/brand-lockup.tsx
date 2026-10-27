import { BrandMark } from "@/components/brand-mark";

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
      {/* asli logo file — fail ho to text lockup (BrandMark dekh lein) */}
      <BrandMark variant={variant} tone={tone} />
    </span>
  );
}
