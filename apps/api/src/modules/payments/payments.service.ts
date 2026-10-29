import { createHmac, timingSafeEqual } from "node:crypto";
import { env } from "../../config/env";
import { logger } from "../../config/logger";
import type { Order } from "@noor/types";

export type Initiation =
  | { mode: "redirect"; provider: "razorpay"; url: string }
  | { mode: "manual"; provider: "manual"; upiId: string; message: string };

/**
 * Third-party payment only. Hum card/UPI credentials kabhi touch nahi karte —
 * payment link provider banata hai, webhook se status aata hai.
 */
export async function createPaymentLink(order: Order): Promise<Initiation> {
  if (!env.razorpay.enabled) {
    return {
      mode: "manual",
      provider: "manual",
      upiId: process.env.UPI_ID ?? "noorclothing@upi",
      message: "Payment link WhatsApp par share hoga.",
    };
  }

  const auth = Buffer.from(`${env.razorpay.keyId}:${env.razorpay.keySecret}`).toString("base64");
  const response = await fetch("https://api.razorpay.com/v1/payment_links", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Basic ${auth}` },
    body: JSON.stringify({
      amount: order.total,
      currency: "INR",
      reference_id: order.orderNumber,
      description: `Noor Ethnic Wear order ${order.orderNumber}`,
      customer: { name: order.customerName, email: order.email, contact: `+91${order.phone}` },
      notify: { sms: true, email: true },
    }),
  });

  if (!response.ok) {
    logger.error("razorpay_link_failed", { status: response.status, order: order.orderNumber });
    throw new Error("Payment provider error");
  }
  const payload = (await response.json()) as { short_url?: string };
  if (!payload.short_url) throw new Error("Payment link missing");
  return { mode: "redirect", provider: "razorpay", url: payload.short_url };
}

export function verifyWebhookSignature(rawBody: string, signature: string): boolean {
  if (!env.razorpay.webhookSecret) return false;
  const expected = createHmac("sha256", env.razorpay.webhookSecret).update(rawBody).digest("hex");
  if (expected.length !== signature.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
}
