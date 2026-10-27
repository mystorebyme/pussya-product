/**
 * Chhote UI panels jo kisi bhi page se khul sakte hain (header, product page).
 * Custom event isliye ki header/PDP ko ek doosre ka state share karne ki zaroorat
 * na pade — `SizeGuideDialog` (layout me ek hi baar) sunta hai.
 */
export const SIZE_GUIDE_EVENT = "noor:size-guide";

export function openSizeGuide() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SIZE_GUIDE_EVENT));
}
