import { preflight, withCors } from "@/lib/cors";
import { siteConfig } from "@/config/site";
import { getOrderForPayment } from "@/lib/payments-orders";
import { RATE_LIMITS, enforceRateLimit, hitRateLimit } from "@/lib/rate-limit";
import { createYoupiPayment, YoupiError, youpiConfig } from "@/lib/youpi";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/youpi/create  { orderNumber }
 *
 * YouPI PG par payment session **server se** banta hai (`POST /api/v1/payments`,
 * `X-Merchant-Id` + `Idempotency-Key`), bilkul gateway ke repo ke contract ke
 * hisaab se.
 *
 * Kyun server se:
 *   • amount **order se** aata hai, browser se nahi — customer tamper nahi kar sakta;
 *   • `returnUrl` aur `metadata.orderNumber` server set karta hai;
 *   • browser ko sirf `checkoutUrl` milta hai, yaani checkout iframe same origin
 *     se khulta hai (koi CORS/credential leakage nahi).
 *
 * Response: `{ paymentId, checkoutUrl, amountPaise, amount }`.
 * Order already paid ho to `{ alreadyPaid: true }`.
 */
async function handlePost(request: Request) {
  const limited = enforceRateLimit(request, RATE_LIMITS.payments);
  if (limited) return limited;

  let body: { orderNumber?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!/^NE-[A-Z0-9]{4,16}$/.test(orderNumber)) {
    return Response.json({ error: "Enter a valid order number." }, { status: 400 });
  }

  // ek order par bahut zyada sessions na bane (gateway ke duplicate-session rule se pehle)
  const perOrder = hitRateLimit(`youpi-create:${orderNumber}`, {
    name: "youpi-create",
    limit: 8,
    windowMs: 10 * 60_000,
  });
  if (!perOrder.ok) {
    return Response.json(
      { error: "Is order ke liye bahut payment attempts ho gaye — WhatsApp par screenshot bhej dijiye." },
      { status: 429, headers: { "retry-after": String(perOrder.retryAfterSeconds) } },
    );
  }

  const config = await youpiConfig();
  if (!config) return Response.json({ error: "YouPI gateway configured nahi hai." }, { status: 503 });

  const order = await getOrderForPayment(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });
  if (order.paymentStatus === "paid") {
    return Response.json({ alreadyPaid: true, paymentStatus: "paid" });
  }
  if (order.status === "cancelled") {
    return Response.json({ error: "Ye order cancel ho chuka hai." }, { status: 409 });
  }

  const returnUrl = `${siteConfig.url.replace(/\/+$/, "")}/checkout?step=payment&order=${encodeURIComponent(orderNumber)}`;

  try {
    const session = await createYoupiPayment(
      {
        orderId: order.orderNumber,
        amountPaise: order.total,
        description: `Noor Ethnic Wear order ${order.orderNumber}`,
        customer: {
          name: order.customerName,
          email: order.email,
          phone: order.phone,
        },
        returnUrl,
        metadata: { orderNumber: order.orderNumber },
      },
      config,
      /* idempotency: same order + same amount ke liye ek hi session */
      `noor-${order.orderNumber}-${order.total}`,
    );

    return Response.json({
      paymentId: session.paymentId,
      checkoutUrl: session.checkoutUrl,
      amountPaise: session.amountPaise,
      amount: session.amount,
      status: session.status,
      gateway: "youpi",
    });
  } catch (error) {
    if (error instanceof YoupiError) {
      /**
       * 409 DUPLICATE_SESSION_DETECTED — gateway kehta hai is customer ka ek
       * session pehle se zinda hai (`DuplicateSessionResponse.session_id`).
       * Naya session banane ke bajaye **wahi** checkout khulta hai, warna
       * customer do session me atak jaata.
       */
      if (error.status === 409 && error.sessionId) {
        const config = await youpiConfig();
        return Response.json({
          paymentId: error.sessionId,
          checkoutUrl: `${config?.payUrl ?? ""}/checkout/${error.sessionId}`,
          amountPaise: order.total,
          amount: (order.total / 100).toFixed(2),
          status: "ACTIVE",
          gateway: "youpi",
          existing: true,
        });
      }
      return Response.json(
        { error: error.message, code: error.code ?? null },
        { status: error.status === 409 ? 409 : 502 },
      );
    }
    return Response.json({ error: "Payment session nahi ban paaya." }, { status: 502 });
  }
}

export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
