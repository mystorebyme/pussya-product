import { preflight, withCors } from "@/lib/cors";
import { failPayment, getOrder } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/failed  { orderNumber, phoneLast4, reason? }
 *
 * UPI app me payment fail ho jaye (galat PIN, insufficient balance, timeout)
 * to customer yahan se order ko `payment failed` mark karwa sakta hai —
 * owner ki Google Sheet me `payment.failed` row turant chali jaati hai aur
 * customer dobara try kar sakta hai.
 */
async function handlePost(request: Request) {
  let body: { orderNumber?: string; phoneLast4?: string; reason?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!/^NE-[A-Z0-9]{4,12}$/.test(orderNumber)) {
    return Response.json({ error: "Enter a valid order number." }, { status: 400 });
  }

  const order = await getOrder(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const last4 = String(body.phoneLast4 ?? "").replace(/\D/g, "").slice(-4);
  if (!last4 || order.phone.slice(-4) !== last4) {
    return Response.json({ error: "Last 4 digits of the order's mobile number do not match." }, { status: 403 });
  }
  if (order.paymentStatus === "paid") {
    return Response.json({ ok: true, paymentStatus: "paid" });
  }

  const failed = await failPayment(orderNumber, {
    gateway: "upi-manual",
    reference: order.payment?.reference ?? null,
    reason: String(body.reason ?? "Customer reported payment failure").slice(0, 160),
  });

  return Response.json({ ok: true, paymentStatus: failed?.paymentStatus ?? "failed" }, { status: 202 });
}


export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
