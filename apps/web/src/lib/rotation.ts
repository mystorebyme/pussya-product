import type { Product } from "@noor/types";

/**
 * Home page rotation.
 *
 * Client ki requirement: home par dikhne wale items **har 10 minute me random
 * tarike se badalte rahein**, taaki poora catalogue log dekh sakein.
 *
 * Isliye ek "bucket" = 10 minute. Bucket hi seed hai, isliye:
 *  • same 10-minute window me sabko same products dikhte hain (SSR + client match),
 *  • window badalte hi naya set,
 *  • har window me doosra set — koi item permanently chhup nahi rehta.
 */

export const ROTATION_MS = 10 * 60 * 1000;

export function rotationBucket(now: number = Date.now()): number {
  return Math.floor(now / ROTATION_MS);
}

/** ms jab agla bucket shuru hoga */
export function msUntilNextBucket(now: number = Date.now()): number {
  const remainder = now % ROTATION_MS;
  return remainder === 0 ? ROTATION_MS : ROTATION_MS - remainder;
}

/** deterministic 32-bit hash */
function hash(text: string): number {
  let value = 2166136261;
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index);
    value = Math.imul(value, 16777619);
  }
  return value >>> 0;
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** seed ke hisaab se shuffle karke pehle `count` items */
export function rotatePick<T>(items: T[], seed: string, count: number): T[] {
  if (items.length <= count) return [...items];
  const random_ = random(hash(seed));
  const copy = [...items];
  // Fisher-Yates (partial — sirf jitne chahiye utne)
  for (let index = 0; index < count; index += 1) {
    const swapWith = index + Math.floor(random_() * (copy.length - index));
    const temp = copy[index]!;
    copy[index] = copy[swapWith]!;
    copy[swapWith] = temp;
  }
  return copy.slice(0, count);
}

/**
 * Client ko bhejne ke liye halka product — sirf jo card/PDP preview me chahiye.
 * (poora product bhejne se home ka payload 3-4x bada ho jaata tha)
 */
export function compactProduct(product: Product): Product {
  return {
    handle: product.handle,
    sourceHandle: product.sourceHandle,
    title: product.title,
    price: product.price,
    compareAtPrice: product.compareAtPrice,
    images: product.images.slice(0, 2),
    collections: product.collections,
    category: product.category,
    fabric: product.fabric,
    color: product.color,
    sizes: product.sizes,
    sizePricing: product.sizePricing,
    details: [],
    description: "",
    rating: product.rating,
    reviewCount: product.reviewCount,
    inStock: product.inStock,
    featured: product.featured,
    publishedAt: product.publishedAt ?? null,
    colourGroup: product.colourGroup ?? null,
    colourName: product.colourName ?? null,
  };
}
