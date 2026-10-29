import { Router, raw } from "express";
import { logger } from "../config/logger";
import { verifyWebhookSignature } from "../modules/payments/payments.service";
import { markPaid } from "../modules/orders/orders.service";
import { enqueue } from "../jobs/queues/email.queue";

const processedEvents = new Set<string>();

export const razorpayWebhookRouter = Router();

/**
 * Rule (webhooks/README.md): express.raw() se mount, HMAC verify,
 * event-id dedupe, turant 2xx — heavy kaam queue me.
 */
razorpayWebhookRouter.post(
  "/razorpay",
  raw({ type: "application/json" }),
  (req, res) => {
    const rawBody = req.body as Buffer;
    const signature = req.header("x-razorpay-signature") ?? "";

    if (!verifyWebhookSignature(rawBody.toString("utf8"), signature)) {
      logger.warn("razorpay_webhook_invalid_signature");
      return res.status(401).json({ error: "invalid signature" });
    }

    const eventId = req.header("x-razorpay-event-id") ?? "";
    if (eventId && processedEvents.has(eventId)) {
      return res.json({ ok: true, duplicate: true });
    }
    if (eventId) processedEvents.add(eventId);

    res.json({ ok: true }); // turant ACK

    try {
      const payload = JSON.parse(rawBody.toString("utf8")) as {
        event?: string;
        payload?: { payment_link?: { entity?: { reference_id?: string; status?: string } } };
      };
      const entity = payload.payload?.payment_link?.entity;
      if (payload.event === "payment_link.paid" && entity?.reference_id) {
        const order = markPaid(entity.reference_id, eventId || "razorpay");
        if (order) enqueue({ type: "order-paid", orderNumber: order.orderNumber, to: order.email });
        logger.info("payment_paid", { order: entity.reference_id });
      }
    } catch (error) {
      logger.error("razorpay_webhook_processing_failed", { error: String(error) });
    }
  },
);
