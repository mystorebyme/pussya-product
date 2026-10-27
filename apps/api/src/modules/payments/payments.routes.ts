import { Router } from "express";
import * as orders from "../orders/orders.service";
import { createPaymentLink } from "./payments.service";
import { fail, ok } from "../../utils/response";
import { ERROR_CODES } from "../../constants";

export const paymentsRouter = Router();

paymentsRouter.post("/payments/link", async (req, res) => {
  const orderNumber = String((req.body as { orderNumber?: string }).orderNumber ?? "");
  const order = orders.findByNumber(orderNumber);
  if (!order) return fail(res, 404, ERROR_CODES.notFound, "Order not found");
  if (order.paymentStatus === "paid") return ok(res, { alreadyPaid: true });
  const initiation = await createPaymentLink(order);
  return ok(res, initiation);
});
