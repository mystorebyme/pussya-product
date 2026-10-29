import { enqueue } from "../jobs/queues/email.queue";
import { sendWhatsApp } from "../integrations/whatsapp/whatsapp.client";
import { logger } from "../config/logger";

/** Domain events: order ka business kya hua, kis side-effect ke saath */
export const orderEvents = {
  placed(order: { orderNumber: string; email: string; phone: string }) {
    enqueue({ type: "order-placed", orderNumber: order.orderNumber, to: order.email });
    void sendWhatsApp(order.phone, "order_confirmed", [order.orderNumber]);
    logger.info("event_order_placed", { order: order.orderNumber });
  },
  paid(order: { orderNumber: string; email: string }) {
    enqueue({ type: "order-paid", orderNumber: order.orderNumber, to: order.email });
  },
};
