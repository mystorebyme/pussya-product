import { NextResponse, type NextRequest } from "next/server";

/**
 * Proxy (middleware) — login gate + session refresh.
 *
 * 1. Cookie na ho to `/login` par bhejo.
 * 2. Cookie ho lekin session me 20 din se kam bache hon to naya 30-din token set karo.
 *    Isse admin ko baar-baar login nahi karna padta (pehle 8 ghante ki session thi).
 *
 * Signature verification yahan Web Crypto se hoti hai (edge runtime me `node:crypto` nahi hota);
 * algorithm wahi hai jo `src/lib/auth.ts` me hai.
 */

const COOKIE = "noor_admin";
const REFRESH_AFTER_MS = 20 * 24 * 60 * 60 * 1000;
const MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
const encoder = new TextEncoder();

function base64url(bytes: ArrayBuffer): string {
  let binary = "";
  for (const byte of new Uint8Array(bytes)) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function encodePayload(value: unknown): string {
  const bytes = encoder.encode(JSON.stringify(value));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function decodePayload(payload: string): string {
  const padded = payload.replace(/-/g, "+").replace(/_/g, "/");
  const binary = atob(padded + "=".repeat((4 - (padded.length % 4)) % 4));
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new TextDecoder().decode(bytes);
}

async function sign(payload: string, secret: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return base64url(await crypto.subtle.sign("HMAC", key, encoder.encode(payload)));
}

function secret(): string {
  return process.env.ADMIN_SESSION_SECRET || process.env.ADMIN_API_TOKEN || "dev-only-secret-change-me";
}

export async function middleware(request: NextRequest) {
  const isLogin = request.nextUrl.pathname.startsWith("/login");
  const token = request.cookies.get(COOKIE)?.value;

  if (!token && !isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }

  if (token && isLogin) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();
  if (!token || request.method !== "GET") return response;

  // sliding refresh — sirf jab session valid ho aur 20 din se kam bache hon
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return response;
  const expected = await sign(payload, secret());
  if (expected !== signature) return response;

  let session: { email?: string; role?: "owner" | "staff"; exp?: number };
  try {
    session = JSON.parse(decodePayload(payload));
  } catch {
    return response;
  }

  const remaining = (session.exp ?? 0) - Date.now();
  if (!session.email || remaining <= 0 || remaining > REFRESH_AFTER_MS) return response;

  const nextPayload = encodePayload({
    email: session.email,
    role: session.role ?? "owner",
    exp: Date.now() + MAX_AGE_SECONDS * 1000,
  });
  response.cookies.set(COOKIE, `${nextPayload}.${await sign(nextPayload, secret())}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|svg|webp|ico|css|js|txt|xml)$).*)",
  ],
};
