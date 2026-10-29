import crypto from "node:crypto";

/**
 * Phone verification token — OTP verify hone ke baad 15 minute ke liye valid.
 * Alag file me hai taaki pure logic ko (server-only ke bina) unit test kar sakein.
 */

const TOKEN_TTL_MS = 15 * 60 * 1000;

function secret(): string {
  // Dedicated secret na ho to Firebase API key se derive karte hain (per-deploy stable).
  const apiKey = process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";
  return process.env.OTP_TOKEN_SECRET ?? `noor-otp:${apiKey || "dev"}`;
}

function sign(payload: string): string {
  return crypto.createHmac("sha256", secret()).update(payload).digest("base64url");
}

export function issuePhoneToken(phone: string, ttlMs = TOKEN_TTL_MS): string {
  const normalised = phone.replace(/\D/g, "").slice(-10);
  const payload = Buffer.from(JSON.stringify({ phone: normalised, exp: Date.now() + ttlMs })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function readPhoneToken(token: string | undefined | null): { phone: string } | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { phone?: string; exp?: number };
    if (!data.phone || !data.exp || data.exp < Date.now()) return null;
    return { phone: data.phone };
  } catch {
    return null;
  }
}
