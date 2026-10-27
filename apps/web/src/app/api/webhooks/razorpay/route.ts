import { createHmac, timingSafeEqual } from "node:crypto";
import { markPaymentPaid } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * Razorpay webhook:
 * 1. raw body se HMAC verify (signature ke bina kuch nahi)
 * 2. event id dedupe (ek event sirf ek baar process)
 * 3. turant 2xx, heavy kaam queue me (dev me sync)
 */
const processedEvents = new Set<string>();

export async function POST(request: Request) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return Response.json({ error: "webhook not configured" }, { status: 503 });

  const raw = await request.text();
  const signature = request.headers.get("x-razorpay-signature") ?? "";
  const expected = createHmac("sha256", secret).update(raw).digest("hex");

  const valid =
    signature.length === expected.length &&
    timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
  if (!valid) return Response.json({ error: "invalid signature" }, { status: 401 });

  const eventId = request.headers.get("x-razorpay-event-id") ?? "";
  if (eventId && processedEvents.has(eventId)) {
    return Response.json({ ok: true, duplicate: true });
  }
  if (eventId) processedEvents.add(eventId);

  try {
    const payload = JSON.parse(raw) as {
      event?: string;
      payload?: { payment_link?: { entity?: { reference_id?: string } } };
    };
    const link = payload.payload?.payment_link?.entity;
    if (payload.event === "payment_link.paid" && link?.reference_id) {
      await markPaymentPaid(link.reference_id, eventId || "razorpay");
    }
  } catch (error) {
    console.error("razorpay webhook parse failed", error);
  }

  return Response.json({ ok: true });
}
