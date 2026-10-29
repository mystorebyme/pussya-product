import { Router } from "express";
import { createOrderSchema, updateOrderStatusSchema } from "@noor/validation";
import { idempotency } from "../../middlewares/idempotency.middleware";
import { rateLimit } from "../../middlewares/rate-limit.middleware";
import { validateBody } from "../../middlewares/validate.middleware";
import { requireAdmin } from "../../middlewares/auth.middleware";
import { RATE_LIMITS } from "../../constants";
import * as controller from "./orders.controller";

export const ordersRouter = Router();

ordersRouter.post(
  "/orders",
  rateLimit(RATE_LIMITS.orders),
  idempotency,
  validateBody(createOrderSchema),
  controller.create,
);
ordersRouter.get("/orders/:orderNumber", controller.detail);
ordersRouter.get("/orders", requireAdmin, controller.list);
ordersRouter.patch(
  "/orders/:orderNumber/status",
  requireAdmin,
  validateBody(updateOrderStatusSchema),
  controller.update,
);
ordersRouter.get("/admin/dashboard", requireAdmin, controller.dashboard);
