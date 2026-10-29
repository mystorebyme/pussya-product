import { recommendedProducts, searchProducts, searchSuggestions } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Header ka instant search + search page ke suggestions.
 * Client bundle me catalog nahi bhejna padta — sab server par filter hota hai.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const term = searchParams.get("q") ?? "";
  const limit = Math.min(12, Number(searchParams.get("limit") ?? 8) || 8);

  if (!term.trim()) {
    return Response.json(
      { query: term, results: [], suggestions: [], recommended: recommendedProducts(6) },
      { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
    );
  }

  const results = searchProducts(term, limit);
  return Response.json(
    {
      query: term,
      results,
      suggestions: searchSuggestions(term, 5),
      recommended: results.length === 0 ? recommendedProducts(4) : [],
    },
    { headers: { "Cache-Control": "public, max-age=300, stale-while-revalidate=600" } },
  );
}
