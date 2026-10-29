import type { Product } from "@noor/types";
import { getProducts, isSortKey, sortProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

const priceFilters: Record<string, (product: Product) => boolean> = {
  "under-2500": (p) => p.price < 250000,
  "2500-3000": (p) => p.price >= 250000 && p.price < 300000,
  "3000-3500": (p) => p.price >= 300000 && p.price < 350000,
  "above-3500": (p) => p.price >= 350000,
};

/**
 * "Load more" endpoint — pehle page ka HTML chhota rehta hai,
 * baaki products client isi API se laata hai.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  // wishlist / compare page: chune hue handles ka data ek hi call me
  const handlesParam = searchParams.get("handles");
  if (handlesParam) {
    const handles = handlesParam
      .split(",")
      .map((handle) => handle.trim())
      .filter(Boolean)
      .slice(0, 24);
    const all = await getProducts();
    const data = handles
      .map((handle) => all.find((product) => product.handle === handle))
      .filter((product): product is Product => Boolean(product));
    return Response.json(
      { data, total: data.length, offset: 0, limit: data.length },
      { headers: { "Cache-Control": "private, max-age=30" } },
    );
  }
  const collection = searchParams.get("collection") ?? "all";
  const q = (searchParams.get("q") ?? "").trim().toLowerCase();
  const sort = searchParams.get("sort") ?? "featured";
  const price = searchParams.get("price") ?? "all";
  const offset = Math.max(0, Number(searchParams.get("offset") ?? 0) || 0);
  const limit = Math.min(48, Math.max(1, Number(searchParams.get("limit") ?? 24) || 24));

  let list = await getProducts();
  if (collection !== "all") list = list.filter((product) => product.collections.includes(collection));
  if (price !== "all" && priceFilters[price]) list = list.filter(priceFilters[price]!);
  if (q) {
    const words = q.split(/\s+/).filter(Boolean);
    list = list.filter((product) => {
      const haystack = `${product.title} ${product.color} ${product.fabric} ${product.category}`.toLowerCase();
      return words.every((word) => haystack.includes(word));
    });
  }
  const ordered = sortProducts(list, isSortKey(sort) ? sort : "featured");

  return Response.json(
    {
      data: ordered.slice(offset, offset + limit),
      total: ordered.length,
      offset,
      limit,
    },
    { headers: { "Cache-Control": "public, max-age=60, stale-while-revalidate=300" } },
  );
}
