import { confirmPayment, failPayment } from "@/lib/orders";
import { fetchGatewayPayment, gatewayAccounts, verifyWebhookSignature } from "@/lib/payments";
import { getOrderForPayment } from "@/lib/payments-orders";
import {
  fetchYoupiPayment,
  seenYoupiDelivery,
  verifyYoupiWebhook,
  youpiAmountMatches,
  youpiConfig,
} from "@/lib/youpi";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook/[gateway]
 *
 * Gateway ka webhook. Koi bhi client yahan "paid" nahi bhej sakta:
 *   1. raw body ka HMAC signature verify hota hai (webhook secret),
 *   2. phir gateway API se payment dobara fetch karke amount + status match hota hai,
 *   3. tab order confirmed hota hai.
 *
 * `gateway`:
 *   • `razorpay-1..3` — Razorpay (X-Razorpay-Signature)
 *   • `youpi`         — YouPI PG V2 (X-Gateway-Signature / -V2, X-Gateway-Delivery-Id)
 *
 * YouPI routes ke liye URL: `POST /api/payments/webhook/youpi`
 * (docs/09-devops/youpi-payment-gateway.md me setup).
 */
export async function POST(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await context.params;
  const rawBody = await request.text();

  if (gateway === "youpi") return handleYoupi(request, rawBody);

  const signature =
    request.headers.get("x-razorpay-signature") ?? request.headers.get("x-webhook-signature") ?? "";

  const account = gatewayAccounts().find((candidate) => candidate.id === gateway);
  if (!account) return Response.json({ error: "Unknown gateway." }, { status: 404 });

  if (!verifyWebhookSignature(rawBody, signature, account.webhookSecret)) {
    return Response.json({ error: "Invalid signature." }, { status: 401 });
  }

  let event: {
    event?: string;
    payload?: {
      payment?: { entity?: { id?: string; order_id?: string; amount?: number; status?: string; notes?: Record<string, string> } };
    };
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const entity = event.payload?.payment?.entity;
  const paymentId = String(entity?.id ?? "");
  if (!paymentId) return Response.json({ received: true, ignored: "no payment entity" });

  // signature ke baad bhi gateway se server-to-server confirmation
  const verified = await fetchGatewayPayment(account.id, paymentId);
  if (!verified) return Response.json({ error: "The gateway could not verify this payment." }, { status: 502 });

  const orderNumber = String(entity?.notes?.orderNumber ?? "");
  const order = orderNumber ? await getOrderForPayment(orderNumber) : null;
  if (!order) return Response.json({ received: true, ignored: "order not found" });

  if (verified.status === "captured" || verified.status === "authorized") {
    // amount mismatch = tampering; order confirm nahi hoga
    if (verified.amount !== order.total) {
      await failPayment(order.orderNumber, {
        gateway: account.id,
        reference: paymentId,
        reason: `amount mismatch (gateway ${verified.amount} vs order ${order.total})`,
      });
      return Response.json({ received: true, ignored: "amount mismatch" }, { status: 409 });
    }
    const result = await confirmPayment(order.orderNumber, {
      gateway: account.id,
      reference: paymentId,
      amount: verified.amount,
      actor: "gateway-webhook",
    });
    return Response.json({ received: true, paid: true, alreadyPaid: result?.alreadyPaid ?? false });
  }

  if (verified.status === "failed") {
    await failPayment(order.orderNumber, { gateway: account.id, reference: paymentId, reason: "gateway reported failed" });
  }
  return Response.json({ received: true, paid: false });
}

/**
 * YouPI PG webhook.
 *
 * Payload (openapi.yaml):
 *   { event: 'SUCCESS', orderId, amount, amountPaise, utr, paymentId,
 *     deliveryId, timestamp, verificationTag, verificationLevel }
 *
 * Order **sirf tab** confirm hota hai jab:
 *   • signature (V2 ya V1) HMAC se match ho,
 *   • `GET /api/v1/payments/{paymentId}` status `SUCCESS` de,
 *   • gateway ka amount order total (paise) ke barabar ho,
 *   • `orderId` usi order ka ho.
 */
async function handleYoupi(request: Request, rawBody: string): Promise<Response> {
  const config = await youpiConfig();
  if (!config) return Response.json({ error: "The YouPI gateway is not configured." }, { status: 503 });
  if (!config.webhookSecret) {
    return Response.json({ error: "The webhook secret is not set." }, { status: 503 });
  }

  const signatureOk = verifyYoupiWebhook(
    rawBody,
    {
      v1: request.headers.get("x-gateway-signature"),
      v2: request.headers.get("x-gateway-signature-v2"),
      timestamp: request.headers.get("x-gateway-timestamp"),
    },
    config.webhookSecret,
  );
  if (!signatureOk) return Response.json({ error: "Invalid signature." }, { status: 401 });

  let event: {
    event?: string;
    orderId?: string;
    paymentId?: string;
    amountPaise?: number | string;
    amount?: number | string;
    utr?: string;
    deliveryId?: string;
  };
  try {
    event = JSON.parse(rawBody) as typeof event;
  } catch {
    return Response.json({ error: "Invalid payload." }, { status: 400 });
  }

  const paymentId = String(event.paymentId ?? "").trim();
  const orderNumber = String(event.orderId ?? "").trim();
  if (!paymentId || !orderNumber) {
    return Response.json({ received: true, ignored: "missing ids" });
  }

  // retry dedupe (YouPI 1 ghante tak byte-for-byte retry karta hai)
  const deliveryId = request.headers.get("x-gateway-delivery-id") ?? event.deliveryId ?? "";
  if (seenYoupiDelivery(String(deliveryId))) {
    return Response.json({ received: true, duplicate: true });
  }

  if (String(event.event ?? "").toUpperCase() !== "SUCCESS") {
    return Response.json({ received: true, ignored: "not a success event" });
  }

  const order = await getOrderForPayment(orderNumber);
  if (!order) return Response.json({ received: true, ignored: "order not found" });

  // signature ke baad bhi server-to-server verify — replayed body se bachaav
  const payment = await fetchYoupiPayment(paymentId, config);
  if (!payment) return Response.json({ error: "The gateway could not verify this payment." }, { status: 502 });

  if (payment.orderId && payment.orderId !== order.orderNumber) {
    return Response.json({ received: true, ignored: "order mismatch" }, { status: 409 });
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
    return Response.json({ received: true, paid: false, status: payment.status });
  }

  const result = await confirmPayment(order.orderNumber, {
    gateway: "youpi",
    reference: payment.utr ?? payment.paymentId,
    amount: payment.amountPaise,
    actor: "youpi-webhook",
  });
  return Response.json({ received: true, paid: true, alreadyPaid: result?.alreadyPaid ?? false });
}
