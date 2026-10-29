import { isolate } from "./env.ts";

export const dataDir = isolate("webhook", { RAZORPAY_WEBHOOK_SECRET: "test_webhook_secret" });
