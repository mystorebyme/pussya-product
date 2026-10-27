import { parseCheckoutEvent, saveCheckoutEvent } from "@/lib/checkout-events";
import { preflight, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

/**
 * POST /api/checkout/events — checkout funnel ka ek step.
 *
 * Body: { event, step?, orderNumber?, items?, subtotal?, reason?, sessionId?, phone? }
 * Sirf 4 event allow hote hain (checkout.started / checkout.review /
 * order.placed / order.failed) — warna koi bhi random event DB/sheet ko ganda
 * kar dega.
 *
 * Row Postgres me jaati hai aur owner ki Google Sheet ke "Checkout" tab me bhi
 * (best-effort). Customer ko hamesha 202 milta hai — analytics fail hone se
 * checkout rukna nahi chahiye.
 */
/** static preview (GitHub Pages) se bhi funnel event aata hai */
export const OPTIONS = preflight;

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const event = parseCheckoutEvent((body ?? {}) as Parameters<typeof parseCheckoutEvent>[0], {
    userAgent: request.headers.get("user-agent"),
  });
  if (!event) return Response.json({ error: "Unknown checkout event." }, { status: 400 });

  try {
    await saveCheckoutEvent(event);
  } catch (error) {
    // analytics kabhi checkout block na kare
    console.warn("[checkout-events] save failed", error instanceof Error ? error.message : error);
    return Response.json({ ok: false }, { status: 202 });
  }

  return withCors(Response.json({ ok: true, id: event.id }, { status: 202 }), request);
}
