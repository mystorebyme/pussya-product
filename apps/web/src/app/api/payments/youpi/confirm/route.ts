import { preflight, withCors } from "@/lib/cors";
import { confirmPayment, failPayment } from "@/lib/orders";
import { getOrderForPayment } from "@/lib/payments-orders";
import { RATE_LIMITS, enforceRateLimit, hitRateLimit } from "@/lib/rate-limit";
import { fetchYoupiPayment, youpiAmountMatches, youpiConfig } from "@/lib/youpi";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/youpi/confirm  { orderNumber, paymentId }
 *
 * Browser checkout (`youpi.js`) success callback ka **server-side** verification.
 *
 * Kyun zaroori hai: GitHub Pages static export par webhook receive nahi ho sakta.
 * Isliye client apna `paymentId` bhejta hai aur server khud gateway se
 * `GET /api/v1/payments/{paymentId}` karke status + amount match karta hai.
 * Client ka "success" apne aap me kuch prove nahi karta — bina gateway ki
 * confirmation ke order confirm nahi hota.
 *
 * Asli production (Vercel/Render) par authoritative rasta webhook hai:
 * `POST /api/payments/webhook/youpi`.
 */
async function handlePost(request: Request) {
  const limited = enforceRateLimit(request, RATE_LIMITS.payments);
  if (limited) return limited;

  let body: { orderNumber?: string; paymentId?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  const paymentId = String(body.paymentId ?? "").trim();
  if (!/^NE-[A-Z0-9]{4,16}$/.test(orderNumber) || !paymentId) {
    return Response.json({ error: "Enter a valid order number and payment id." }, { status: 400 });
  }

  const perOrder = hitRateLimit(`youpi:${orderNumber}`, { name: "youpi", limit: 12, windowMs: 10 * 60_000 });
  if (!perOrder.ok) {
    return Response.json(
      { error: "Is order ke liye bahut attempts ho gaye — WhatsApp par screenshot bhej dijiye." },
      { status: 429, headers: { "retry-after": String(perOrder.retryAfterSeconds) } },
    );
  }

  const config = await youpiConfig();
  if (!config) return Response.json({ error: "YouPI gateway configured nahi hai." }, { status: 503 });

  const order = await getOrderForPayment(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  if (order.paymentStatus === "paid") {
    return Response.json({ ok: true, alreadyPaid: true, paymentStatus: "paid" });
  }

  // Gateway se hi sach maanga jaata hai (client ke callback par bharosa nahi)
  const payment = await fetchYoupiPayment(paymentId, config);

  // Signature-style guard: yahan payment id gateway par honi chahiye aur orderId match kare
  if (!payment || (payment.orderId && payment.orderId !== order.orderNumber)) {
    return Response.json({ error: "Payment verify nahi ho paayi." }, { status: 502 });
  }

  if (!youpiAmountMatches(payment.amountPaise, order.total)) {
    await failPayment(order.orderNumber, {
      gateway: "youpi",
      reference: payment.utr ?? payment.paymentId,
      reason: `amount mismatch (gateway ${payment.amountPaise} vs order ${order.total})`,
    });
    return Response.json({ error: "ORDER_AMOUNT_MISMATCH" }, { status: 409 });
  }

  if (payment.status !== "SUCCESS") {
    return Response.json({ ok: false, paymentStatus: order.paymentStatus, gatewayStatus: payment.status }, { status: 202 });
  }

  const result = await confirmPayment(order.orderNumber, {
    gateway: "youpi",
    reference: payment.utr ?? payment.paymentId,
    amount: payment.amountPaise,
    actor: "youpi-confirm",
  });
  return Response.json({ ok: true, paid: true, alreadyPaid: result?.alreadyPaid ?? false, paymentStatus: "paid" });
}

export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
