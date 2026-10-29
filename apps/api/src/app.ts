import express from "express";
import cors from "cors";
import { env } from "./config/env";
import { errorHandler, notFound } from "./middlewares/error.middleware";
import { requestId } from "./middlewares/request-id.middleware";
import { productsRouter } from "./modules/products/products.routes";
import { ordersRouter } from "./modules/orders/orders.routes";
import { paymentsRouter } from "./modules/payments/payments.routes";
import { healthRouter } from "./modules/health/health.routes";
import { razorpayWebhookRouter } from "./webhooks/razorpay.webhook";

export function createApp() {
  const app = express();
  app.set("trust proxy", 1);
  app.use(requestId);
  app.use(
    cors({
      origin: [env.webOrigin, env.adminOrigin],
      credentials: false,
    }),
  );

  // webhooks RAW body ke saath, express.json se PEHLE
  app.use("/api/v1/webhooks", razorpayWebhookRouter);

  app.use(express.json({ limit: "100kb" }));

  app.use("/api/v1", healthRouter);
  app.use("/api/v1", productsRouter);
  app.use("/api/v1", ordersRouter);
  app.use("/api/v1", paymentsRouter);

  app.use(notFound);
  app.use(errorHandler);
  return app;
}
