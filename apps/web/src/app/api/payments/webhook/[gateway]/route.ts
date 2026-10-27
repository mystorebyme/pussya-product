import { confirmPayment, failPayment } from "@/lib/orders";
import { fetchGatewayPayment, gatewayAccounts, verifyWebhookSignature } from "@/lib/payments";
import { getOrderForPayment } from "@/lib/payments-orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/webhook/[gateway]
 *
 * Gateway ka webhook. Koi bhi client yahan "paid" nahi bhej sakta:
 *   1. raw body ka HMAC signature verify hota hai (webhook secret),
 *   2. phir gateway API se payment dobara fetch karke amount + status match hota hai,
 *   3. tab order confirmed hota hai.
 */
export async function POST(request: Request, context: { params: Promise<{ gateway: string }> }) {
  const { gateway } = await context.params;
  const rawBody = await request.text();
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
  if (!verified) return Response.json({ error: "Gateway se verify nahi hua." }, { status: 502 });

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
