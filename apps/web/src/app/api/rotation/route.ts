import { compactProduct, rotatePick, rotationBucket } from "@/lib/rotation";
import { RAILS, isRailKey, railPool } from "@/lib/rails";
import { getProducts } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * GET /api/rotation?rail=trendy&bucket=123
 *
 * Home page ke rails har 10 minute me naya set maangte hain. Bucket na diya
 * jaaye to server ka current bucket. Response me sirf card ke liye zaroori
 * fields jaate hain (payload chhota).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const rail = url.searchParams.get("rail") ?? "";
  if (!isRailKey(rail)) {
    return Response.json({ error: "Unknown rail" }, { status: 400 });
  }

  const requested = Number(url.searchParams.get("bucket") ?? "");
  const bucket = Number.isFinite(requested) && requested > 0 ? Math.floor(requested) : rotationBucket();
  const count = Math.min(24, Math.max(1, Number(url.searchParams.get("limit") ?? RAILS[rail].count) || 8));

  const pool = railPool(rail, await getProducts());
  const picks = rotatePick(pool, `${rail}:${bucket}`, count).map(compactProduct);

  return Response.json(
    { rail, bucket, products: picks },
    { headers: { "cache-control": "public, max-age=60, stale-while-revalidate=540" } },
  );
}
