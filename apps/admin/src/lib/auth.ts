import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Session secret ka fallback chain.
 *
 * `ADMIN_SESSION_SECRET` na ho to `ADMIN_API_TOKEN` use hota hai — wo Render/Vercel par
 * generate hota hai aur deploys ke beech same rehta hai. Isliye secret badalne se
 * admin ko baar-baar login nahi karna padta (pehle har redeploy par logout ho jaata tha).
 */
const SECRET =
  process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_TOKEN || "dev-only-secret-change-me";
const PASSWORD = process.env.ADMIN_PASSWORD ?? "noor2026";
/**
 * Login email **env se** aata hai (`ADMIN_EMAIL`, comma-separated) — code me koi
 * brand email hardcoded nahi, kyunki domain abhi final nahi hai. Khaali chhoda ho
 * to koi bhi email chalega par **password phir bhi zaroori** hai (asli secret
 * password hi hai).
 */
const EMAILS = (process.env.ADMIN_EMAIL ?? "")
  .split(",")
  .map((value) => value.trim().toLowerCase())
  .filter(Boolean);
export const SESSION_COOKIE = "noor_admin";
/** 30 din — roz login karne ki zaroorat nahi. Har request par (middleware) sliding renew hota hai. */
const MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
/** Session token ko itne din bache hon to naya token issue karte hain. */
export const REFRESH_AFTER_SECONDS = 60 * 60 * 24 * 20;

export type Session = { email: string; role: "owner" | "staff"; exp: number };

function sign(value: string): string {
  return createHmac("sha256", SECRET).update(value).digest("base64url");
}

export function createSessionToken(email: string, role: Session["role"] = "owner"): string {
  const payload = Buffer.from(
    JSON.stringify({ email, role, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifySessionToken(token: string | undefined): Session | null {
  if (!token) return null;
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload);
  if (expected.length !== signature.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(signature))) return null;
  try {
    const session = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Session;
    if (session.exp < Date.now()) return null;
    return session;
  } catch {
    return null;
  }
}

/** Timing-safe password check (plain compare timing leak deta hai) */
export function checkCredentials(email: string, password: string): boolean {
  // Production me default password se login bilkul band — pehle ADMIN_PASSWORD set karo
  if (process.env.NODE_ENV === "production" && !process.env.ADMIN_PASSWORD) return false;
  // ADMIN_EMAIL set nahi hai to koi bhi email — par password phir bhi match karna zaroori
  const emailOk = EMAILS.length === 0 || EMAILS.includes(email.trim().toLowerCase());
  const a = Buffer.from(password);
  const b = Buffer.from(PASSWORD);
  const passwordOk = a.length === b.length && timingSafeEqual(a, b);
  return emailOk && passwordOk;
}

export const SESSION_MAX_AGE = MAX_AGE_SECONDS;
export const ADMIN_EMAIL_HINT = EMAILS[0] ?? "";

/** Login/session ke liye production me koi default secret nahi chalega. */
export function secretIsDefault(): boolean {
  return SECRET === "dev-only-secret-change-me";
}

/** Cookie attributes — ek hi jagah, taaki login/middleware/logout sab same rahein. */
export function sessionCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  };
}
