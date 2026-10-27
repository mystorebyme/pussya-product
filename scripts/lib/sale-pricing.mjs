/**
 * Sale pricing — Festive (Diwali / Diwali) Flat 70% OFF.
 *
 * Rule (owner, Round 11): har product ki FINAL price in paanch me se ek honi chahiye —
 *   499 · 599 · 549 · 649 · 699
 * aur MRP aisa ho ki badge par 70% ya 60% hi dikhe, kabhi 69% / 71% nahi.
 *
 * Isliye price pehle chunte hain, phir MRP nikalte hain:
 *   70% off -> MRP = price / 0.30
 *   60% off -> MRP = price / 0.40
 * MRP ko rupee me round karne par bhi displayed percent 70/60 hi rehta hai
 * (test: scripts/pricing/apply-sale-prices.mjs --verify).
 *
 * Price handle ke hash se tay hota hai — rebuild par same product ka same price,
 * random refresh par price nahi badalta.
 */

/** Final prices, paise me (₹499 … ₹699) */
export const SALE_FINAL_PRICES = [49_900, 59_900, 54_900, 64_900, 69_900];

/** Sale ke do slabs — mostly 70%, thode 60% (owner: "kisi pr 70 kisi pr 60") */
export const SALE_PERCENTS = [70, 60];

/** djb2 — chhota, deterministic, koi dependency nahi */
function hash(value) {
  let h = 5381;
  for (let index = 0; index < value.length; index += 1) {
    h = ((h << 5) + h + value.charCodeAt(index)) >>> 0;
  }
  return h;
}

/**
 * Ek handle ke liye sale price + MRP.
 * @param {string} handle
 * @param {{percent?: 60|70}} [options]
 */
export function salePriceFor(handle, options = {}) {
  const seed = hash(String(handle || "noor"));
  const price = SALE_FINAL_PRICES[seed % SALE_FINAL_PRICES.length];
  // har 5th product 60% (kam se kam ek 60% slab bhi rahe)
  const percent = options.percent ?? (seed % 5 === 0 ? 60 : 70);
  const compareAtPrice = Math.round(price / (1 - percent / 100));
  return { price, compareAtPrice, percent };
}

/** displayed discount — UI wahi use karta hai */
export function displayedPercent(price, compareAtPrice) {
  if (!compareAtPrice || compareAtPrice <= price) return 0;
  return Math.round(((compareAtPrice - price) / compareAtPrice) * 100);
}

/**
 * Product (ya catalog ke products array) par sale pricing lagao.
 * Mutates in place — build script aur CLI dono isi ko use karte hain.
 */
export function applySalePricing(products) {
  const list = Array.isArray(products) ? products : [products];
  for (const product of list) {
    if (!product || typeof product.handle !== "string") continue;
    const computed = salePriceFor(product.handle);
    // admin ne ladder ke andar ka price chuna hai to wo respect karo, warna handle se
    const keepChosen = SALE_FINAL_PRICES.includes(product.price) && !product.saleAutoPrice;
    const price = keepChosen ? product.price : computed.price;
    const compareAtPrice = keepChosen
      ? Math.round(price / (1 - (computed.percent === 60 ? 0.6 : 0.7)))
      : computed.compareAtPrice;
    product.price = price;
    product.compareAtPrice = compareAtPrice;
    // har size par wahi final price — "final price 499/599/…" har size par sach ho
    if (product.sizePricing && typeof product.sizePricing === "object") {
      for (const size of Object.keys(product.sizePricing)) {
        product.sizePricing[size] = {
          ...product.sizePricing[size],
          price,
          compareAtPrice,
        };
      }
    }
    if (Array.isArray(product.variants)) {
      for (const variant of product.variants) {
        if (!variant || typeof variant !== "object") continue;
        variant.price = price;
        variant.compareAtPrice = compareAtPrice;
      }
    }
  }
  return list;
}
