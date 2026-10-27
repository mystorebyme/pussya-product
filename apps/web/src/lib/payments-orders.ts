import "server-only";

import type { Order } from "@noor/types";
import { getOrder } from "./orders";

/**
 * Payments routes ke liye read access.
 * Orders JSON ya Postgres — dono me (orders.ts backend chunta hai), isliye
 * payment intent/status/webhook DB orders par bhi kaam karte hain.
 */
export async function getOrderForPayment(orderNumber: string): Promise<Order | null> {
  return (await getOrder(orderNumber)) ?? null;
}
