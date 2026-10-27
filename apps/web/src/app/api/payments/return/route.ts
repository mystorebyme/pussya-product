import { getOrder, confirmPayment } from "@/lib/orders";
import { referenceFromReturnQuery, returnLooksSuccessful, verifyUpiReturn } from "@/lib/upi-return";
import { preflight, withCors } from "@/lib/cors";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/return  { orderNumber, token, search }
 *
 * UPI app se payment ke baad customer wapas aata hai (deep link ka `url` param).
 * Signed token match hone par order **auto-confirm** ho jaata hai — customer ko
 * UTR type nahi karna padta.
 *
 * Owner ka control: bank me credit na dikhe to admin panel → order →
 * "Payment not received (undo)" se payment wapas pending ho jaata hai.
 */
async function handlePost(request: Request) {
  let body: { orderNumber?: string; token?: string; search?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!/^NE-[A-Z0-9]{4,12}$/.test(orderNumber)) {
    return Response.json({ error: "Enter a valid order number." }, { status: 400 });
  }
  if (!verifyUpiReturn(orderNumber, body.token)) {
    return Response.json({ error: "This payment link is not valid." }, { status: 403 });
  }

  const order = await getOrder(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentStatus === "paid") {
    return Response.json({ ok: true, alreadyPaid: true, paymentStatus: "paid", orderNumber });
  }

  const params = new URLSearchParams(String(body.search ?? "").replace(/^\?/, ""));
  if (!returnLooksSuccessful(params)) {
    return Response.json(
      { ok: false, error: "The UPI app reported that this payment did not go through." },
      { status: 409 },
    );
  }

  const reference = referenceFromReturnQuery(params) ?? `UPI${orderNumber.replace(/[^A-Z0-9]/g, "")}`.slice(0, 30);
  const result = await confirmPayment(orderNumber, {
    gateway: "upi-return",
    reference,
    amount: order.total,
    actor: "upi-return",
    auto: true,
  });
  if (!result) return Response.json({ error: "Order not found." }, { status: 404 });

  return Response.json({
    ok: true,
    paymentStatus: result.order.paymentStatus,
    orderNumber,
    reference,
    autoConfirmed: !result.alreadyPaid,
  });
}

export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
