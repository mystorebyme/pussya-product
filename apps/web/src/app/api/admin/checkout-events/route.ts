import { checkoutFunnel, listCheckoutEvents } from "@/lib/checkout-events";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

/**
 * GET /api/admin/checkout-events?limit=100 — checkout funnel.
 *
 * Admin panel dekhta hai: kaun checkout tak pahuncha, kaun review tak aaya,
 * kitne order bane aur kitne fail hue (fail ka reason bhi).
 */
export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  const [events, funnel] = await Promise.all([
    listCheckoutEvents(Number.isFinite(limit) ? limit : 100),
    checkoutFunnel(),
  ]);
  return Response.json(
    { events, funnel },
    { headers: { "cache-control": "no-store" } },
  );
}
