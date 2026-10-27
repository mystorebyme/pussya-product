import { getTrafficSummary } from "@/lib/traffic";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

/** GET /api/admin/traffic — site traffic (aaj, kal, 7 din, top pages, sources) */
export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json(await getTrafficSummary(), { headers: { "cache-control": "no-store" } });
}
