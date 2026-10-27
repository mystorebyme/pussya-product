import raw from "@/data/reviews.json";
import aggregatesRaw from "@/data/review-aggregates.json";

/**
 * Reviews — sirf **asli** data.
 *
 * Source: live store ka Trustoo widget, daily sync
 * (`scripts/reviews-sync/fetch-reviews.mjs` → `database/seeds/reviews/reviews.json`).
 *
 * Yahan koi generated/sample review nahi hai. Round 16 me sample seed (`seed-reviews.json`)
 * poora hata diya gaya — public page par koi fake testimonial nahi jaata.
 *
 * Do tarah ka data:
 *   1. `reviews.json` — asli customer text + photos (traceable: Trustoo review id).
 *   2. `review-aggregates.json` — store ke rating totals; jahan customer text nahi hai
 *      wahan sirf count/rating dikhta hai, koi banaya hua review nahi.
 */

export type Review = {
  id: string;
  author: string;
  rating: number;
  title?: string;
  body: string;
  date?: string;
  /** true sirf tab jab source data me verified purchase flag ho */
  verified?: boolean;
  photos?: string[];
  productHandle?: string;
  productTitle?: string;
};

export type ProductReviewBlock = {
  rating: number;
  count: number;
  reviews: Review[];
};

type ReviewsFile = {
  meta: { source?: string; shopId?: string; syncedAt?: string | null };
  shop: { rating: number; count: number };
  products: Record<string, ProductReviewBlock>;
};

type AggregatesFile = {
  syncedAt?: string | null;
  products?: Record<string, { rating: number; count: number }>;
};

const data = raw as ReviewsFile;
const aggregates = (aggregatesRaw as AggregatesFile).products ?? {};

export const reviewsMeta = data.meta;
export const shopRating = data.shop ?? { rating: 0, count: 0 };

export function reviewsFor(handle: string): ProductReviewBlock {
  // 1) asli customer reviews (text/photos) — sabse pehle
  const block = data.products[handle];
  if (block?.count) return block;
  // 2) store ka aggregate (rating/count) — sirf tab jab rating pata ho
  const aggregate = aggregates[handle];
  if (aggregate?.count) {
    return {
      rating: aggregate.rating > 0 ? aggregate.rating : 0,
      count: aggregate.count,
      reviews: [],
    };
  }
  return { rating: 0, count: 0, reviews: [] };
}

export function hasFullReviews(handle: string): boolean {
  return Boolean(data.products[handle]?.reviews?.length);
}

/**
 * Home strip ke liye — naye reviews pehle, par ek hi product ke kai reviews
 * lagatar na aayein (real store ke carousel jaisa mix).
 */
export function latestReviews(limit = 8): Review[] {
  const all = Object.entries(data.products).flatMap(([handle, block]) =>
    block.reviews.map((review) => ({
      ...review,
      productHandle: handle,
      // badge sirf verified flag par — source me na ho to badge nahi
      verified: review.verified === true,
    })),
  );
  const sorted = all.sort((a, b) => (b.date ?? "").localeCompare(a.date ?? "") || b.rating - a.rating);
  const picked: Review[] = [];
  const usedProducts = new Set<string>();
  for (const review of sorted) {
    if (picked.length >= limit) break;
    const handle = review.productHandle ?? "";
    if (usedProducts.has(handle)) continue;
    usedProducts.add(handle);
    picked.push(review);
  }
  // itne saare products na hon to baaki reviews se bhar do
  for (const review of sorted) {
    if (picked.length >= limit) break;
    if (!picked.includes(review)) picked.push(review);
  }
  return picked;
}

export function hasReviews(): boolean {
  return latestReviews(1).length > 0;
}

/** Rating breakdown (5★→1★ bars) */
export function ratingBreakdown(block: ProductReviewBlock): { stars: number; count: number; percent: number }[] {
  return [5, 4, 3, 2, 1].map((stars) => {
    const count = block.reviews.filter((review) => Math.round(review.rating) === stars).length;
    const percent = block.reviews.length ? Math.round((count / block.reviews.length) * 100) : 0;
    return { stars, count, percent };
  });
}
