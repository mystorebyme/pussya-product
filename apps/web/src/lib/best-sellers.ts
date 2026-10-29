import "server-only";

import type { Product } from "@noor/types";
import { listOrders } from "@/lib/orders";
import { products } from "@/lib/store";

/**
 * "Best sellers" — **asli orders** se, fixed list se nahi.
 *
 * Ranking: pichhle orders me sabse zyada quantity biki (cancelled/returned chhod ke),
 * tie par revenue. Jab tak naye orders nahi aate (naya store / preview build), tab
 * tak owner ki curated `best-seller` collection fallback rehti hai.
 *
 * Ye har call par orders padhta hai, isliye route par chhota cache lagta hai.
 */

export type BestSeller = { product: Product; sold: number };

/** handle → total quantity sold (cancelled/returned orders count nahi hote) */
export async function soldCounts(): Promise<Map<string, number>> {
  const counts = new Map<string, number>();
  try {
    const orders = await listOrders();
    for (const order of orders) {
      if (order.status === "cancelled" || order.status === "returned") continue;
      for (const item of order.items ?? []) {
        counts.set(item.handle, (counts.get(item.handle) ?? 0) + Math.max(1, item.quantity));
      }
    }
  } catch (error) {
    // DB down ho to home page kabhi fail na ho — fallback list dikhegi
    console.error("[best-sellers] could not read orders", (error as Error).message);
  }
  return counts;
}

function sellable(product: Product): boolean {
  if (product.inStock === false) return false;
  const pricing = product.sizePricing ?? {};
  const anyAvailable = product.sizes.some((size) => {
    const entry = pricing[size];
    return entry ? entry.available !== false : true;
  });
  return anyAvailable;
}

export async function bestSellers(limit = 8): Promise<BestSeller[]> {
  const counts = await soldCounts();
  const byHandle = new Map(products.map((product) => [product.handle, product]));
  const picked: BestSeller[] = [];
  const used = new Set<string>();

  const ranked = [...counts.entries()]
    .filter(([handle, sold]) => sold > 0 && byHandle.has(handle))
    .sort((a, b) => b[1] - a[1]);

  for (const [handle, sold] of ranked) {
    if (picked.length >= limit) break;
    const product = byHandle.get(handle)!;
    if (!sellable(product)) continue;
    picked.push({ product, sold });
    used.add(handle);
  }

  // naye store par orders kam hote hain — owner ki curated edit se bhar do
  const curated = products.filter(
    (product) => product.collections?.includes("best-seller") && sellable(product),
  );
  const fillers = [...curated, ...products.filter((product) => product.featured && sellable(product))];
  for (const product of fillers) {
    if (picked.length >= limit) break;
    if (used.has(product.handle)) continue;
    picked.push({ product, sold: counts.get(product.handle) ?? 0 });
    used.add(product.handle);
  }

  return picked;
}
