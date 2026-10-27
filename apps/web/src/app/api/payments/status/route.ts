import { readPhoneToken } from "@/lib/otp";
import { paymentStatusFor } from "@/lib/orders";
import { getOrderForPayment } from "@/lib/payments-orders";

export const dynamic = "force-dynamic";

/**
 * GET /api/payments/status?order=NE-...&phoneToken=...
 *
 * Customer ye poll karta hai. Order ka phone token match hone par hi status.
 * "paid" sirf backend verify ke baad hi aata hai — client ise set nahi kar sakta.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const orderNumber = (url.searchParams.get("order") ?? "").trim();
  if (!orderNumber) return Response.json({ error: "order chahiye." }, { status: 400 });

  const order = await getOrderForPayment(orderNumber);
  if (!order) return Response.json({ error: "Order nahi mila." }, { status: 404 });

  const token = readPhoneToken(url.searchParams.get("phoneToken") ?? undefined);
  if (!token || token.phone !== order.phone) {
    return Response.json({ error: "Order verify nahi hua." }, { status: 401 });
  }

  return Response.json(await paymentStatusFor(orderNumber), { headers: { "cache-control": "no-store" } });
}
