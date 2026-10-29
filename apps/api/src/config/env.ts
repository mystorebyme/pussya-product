import "dotenv/config";

/**
 * Env ko ek hi jagah validate karte hain. Missing key = startup par clear error,
 * runtime par random undefined nahi.
 */
function required(name: string, fallback?: string): string {
  const value = process.env[name] ?? fallback;
  if (!value) throw new Error(`Missing required env: ${name}`);
  return value;
}

export const env = {
  nodeEnv: process.env.NODE_ENV ?? "development",
  port: Number(process.env.PORT ?? 4000),
  webOrigin: process.env.WEB_ORIGIN ?? "http://localhost:3000",
  adminOrigin: process.env.ADMIN_ORIGIN ?? "http://localhost:3001",
  logLevel: process.env.LOG_LEVEL ?? "info",
  dataDir: process.env.DATA_DIR ?? "",
  razorpay: {
    keyId: process.env.RAZORPAY_KEY_ID ?? "",
    keySecret: process.env.RAZORPAY_KEY_SECRET ?? "",
    webhookSecret: process.env.RAZORPAY_WEBHOOK_SECRET ?? "",
    enabled: Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET),
  },
  adminToken: required("ADMIN_API_TOKEN", "change-me-in-production"),
  isProd: process.env.NODE_ENV === "production",
} as const;
