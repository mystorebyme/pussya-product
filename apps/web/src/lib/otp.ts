import "server-only";

import crypto from "node:crypto";

/**
 * Phone OTP — Firebase se verify hota hai, phir hum ek short-lived signed
 * `phoneToken` issue karte hain jo order ke saath jaata hai. Isse order API ko
 * har request par Firebase call nahi karni padti, aur phone badalna possible nahi.
 *
 * Modes:
 *  - "firebase": NEXT_PUBLIC_FIREBASE_* set hai -> client Firebase se SMS bhejta hai,
 *    server ID token ko Identity Toolkit se verify karta hai.
 *  - "dev": Firebase config nahi hai aur OTP_DEV_MODE != "off" -> code server banata hai
 *    aur response me wapas deta hai, kyunki SMS bhejne ka koi raasta hi nahi hai.
 *  - "off": dono nahi -> OTP optional (order phone bina verify chala jaayega).
 */

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID ?? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "";
const API_KEY = process.env.FIREBASE_API_KEY ?? process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? "";

export type OtpMode = "firebase" | "dev" | "off";

export function otpMode(): OtpMode {
  if (PROJECT_ID && API_KEY) return "firebase";
  if (process.env.OTP_DEV_MODE === "off") return "off";
  return "dev";
}

/** Firebase ID token -> verified phone (E.164, bina + ke). Failure par null. */
export async function verifyFirebaseIdToken(idToken: string): Promise<string | null> {
  if (!API_KEY) return null;
  try {
    const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${API_KEY}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ idToken }),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const payload = (await response.json()) as { users?: { phoneNumber?: string }[] };
    const phone = payload.users?.[0]?.phoneNumber ?? "";
    return phone.replace(/\D/g, "").slice(-10) || null;
  } catch {
    return null;
  }
}

/* signed phone token — pure logic phone-token.ts me hai (unit tested) */
export { issuePhoneToken, readPhoneToken } from "@/lib/phone-token";
export { issuePhoneToken as issueToken } from "@/lib/phone-token";

/**
 * Round 12: owner ne order ke waqt OTP hata diya.
 * Endpoints (start/verify) code me hain par checkout inhe call nahi karta —
 * order hamesha normal form se place hota hai, isliye ye hamesha false hai.
 */
export function otpRequired(): boolean {
  return false;
}

/* ---------- dev mode store (process memory, sirf local/test) ---------- */

type DevCode = { code: string; expiresAt: number; attempts: number };
const devCodes = new Map<string, DevCode>();

export function createDevCode(phone: string): string {
  const code = String(crypto.randomInt(100000, 1000000));
  devCodes.set(phone.replace(/\D/g, "").slice(-10), {
    code,
    expiresAt: Date.now() + 5 * 60 * 1000,
    attempts: 0,
  });
  return code;
}

export function checkDevCode(phone: string, code: string): boolean {
  const key = phone.replace(/\D/g, "").slice(-10);
  const record = devCodes.get(key);
  if (!record) return false;
  if (record.expiresAt < Date.now() || record.attempts >= 5) {
    devCodes.delete(key);
    return false;
  }
  record.attempts += 1;
  if (record.code !== code.trim()) return false;
  devCodes.delete(key);
  return true;
}
