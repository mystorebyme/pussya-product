import crypto from "node:crypto";

/**
 * YouPI PG webhook signature — **pure helpers** (koi server-only import nahi).
 *
 * Alag file isliye ki unit tests inhe seedha import kar sakein aur webhook
 * route/`lib/youpi.ts` dono yahi use karein (ek hi formula, do jagah nahi).
 *
 *   V1: `X-Gateway-Signature: sha256=HMAC_SHA256(secret, rawBody)`
 *   V2: `X-Gateway-Signature-V2: HMAC_SHA256(secret, "<timestamp_ms>.<rawBody>")`
 *
 * Body **raw string** hona chahiye (JSON.parse se pehle), warna HMAC match
 * nahi karega — ye YouPI ke README ka explicit warning hai.
 */

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

function cleanHex(signature: string): string {
  return (signature ?? "").trim().replace(/^sha256=/i, "").toLowerCase();
}

export function hmacSha256Hex(secret: string, payload: string): string {
  return crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex");
}

/** V1 — `sha256=` prefix optional */
export function verifyYoupiSignature(rawBody: string, signature: string, secret: string): boolean {
  if (!secret || !signature) return false;
  return safeEqual(hmacSha256Hex(secret, rawBody), cleanHex(signature));
}

/** V2 — timestamp + body (replay-proof) */
export function verifyYoupiSignatureV2(
  rawBody: string,
  signature: string,
  secret: string,
  timestamp: string,
): boolean {
  if (!secret || !signature || !timestamp) return false;
  return safeEqual(hmacSha256Hex(secret, `${timestamp}.${rawBody}`), cleanHex(signature));
}

/** V2 pehle, phir V1 (YouPI dono bhej sakta hai) */
export function verifyYoupiWebhook(
  rawBody: string,
  headers: { v1?: string | null; v2?: string | null; timestamp?: string | null },
  secret: string,
): boolean {
  if (verifyYoupiSignatureV2(rawBody, headers.v2 ?? "", secret, headers.timestamp ?? "")) return true;
  return verifyYoupiSignature(rawBody, headers.v1 ?? "", secret);
}

/** payment amount (paise) ↔ order total (paise) */
export function youpiAmountMatches(amountPaise: number, orderTotalPaise: number): boolean {
  return Math.round(amountPaise) === Math.round(orderTotalPaise);
}
