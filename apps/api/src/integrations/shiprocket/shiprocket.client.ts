import { logger } from "../../config/logger";

/**
 * Shiprocket token 240 ghante valid hota hai — isliye cache karte hain,
 * har order par naya token maangna rate-limit me fas jaata hai.
 */
let cached: { token: string; expiresAt: number } | null = null;

export async function shiprocketToken(): Promise<string | null> {
  const email = process.env.SHIPROCKET_EMAIL;
  const password = process.env.SHIPROCKET_PASSWORD;
  if (!email || !password) return null;

  if (cached && cached.expiresAt > Date.now()) return cached.token;

  const response = await fetch("https://apiv2.shiprocket.in/v1/external/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) {
    logger.error("shiprocket_login_failed", { status: response.status });
    return null;
  }
  const payload = (await response.json()) as { token?: string };
  if (!payload.token) return null;
  cached = { token: payload.token, expiresAt: Date.now() + 240 * 60 * 60 * 1000 - 60_000 };
  return cached.token;
}

export async function createShipment(orderNumber: string, pincode: string) {
  const token = await shiprocketToken();
  if (!token) {
    logger.info("shiprocket_skipped", { orderNumber });
    return null;
  }
  logger.info("shiprocket_shipment_requested", { orderNumber, pincode });
  return { awb: `PENDING-${orderNumber}` };
}
