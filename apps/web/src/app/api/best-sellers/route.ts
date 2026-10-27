import { bestSellers } from "@/lib/best-sellers";
import { compactProduct } from "@/lib/rotation";

export const dynamic = "force-dynamic";

/**
 * GET /api/best-sellers?limit=8
 *
 * Home ka "Best sellers" rail isse padhta hai — ranking asli orders se banti hai
 * (kitni quantity biki), isliye owner ko kuch update karne ki zaroorat nahi.
 */
export async function GET(request: Request) {
  const requested = Number(new URL(request.url).searchParams.get("limit") ?? 8);
  const limit = Math.min(12, Math.max(4, Number.isFinite(requested) ? requested : 8));
  const items = await bestSellers(limit);
  return Response.json(
    {
      products: items.map(({ product, sold }) => ({ ...compactProduct(product), sold })),
      basedOnOrders: items.filter((item) => item.sold > 0).length,
    },
    { headers: { "cache-control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
