import test from "node:test";
import assert from "node:assert/strict";
import {
  SESSION_COOKIE,
  checkCredentials,
  createSessionToken,
  verifySessionToken,
} from "../../apps/admin/src/lib/auth.ts";

test("cookie name is stable (middleware depends on it)", () => {
  assert.equal(SESSION_COOKIE, "noor_admin");
});

test("session token round-trips", () => {
  const token = createSessionToken("admin@noorethnicwear.in");
  const session = verifySessionToken(token);
  assert.equal(session?.email, "admin@noorethnicwear.in");
  assert.equal(session?.role, "owner");
  assert.ok(session!.exp > Date.now());
});

test("tampered token is rejected", () => {
  const token = createSessionToken("admin@noorethnicwear.in");
  const [payload, signature] = token.split(".");
  const forgedPayload = Buffer.from(
    JSON.stringify({ email: "attacker@example.com", role: "owner", exp: Date.now() + 60_000 }),
  ).toString("base64url");
  assert.equal(verifySessionToken(`${forgedPayload}.${signature}`), null);
  assert.equal(verifySessionToken(payload), null);
  assert.equal(verifySessionToken("garbage"), null);
  assert.equal(verifySessionToken(undefined), null);
});

test("expired session is rejected", () => {
  const token = createSessionToken("admin@noorethnicwear.in");
  const [, signature] = token.split(".");
  const expired = Buffer.from(
    JSON.stringify({ email: "admin@noorethnicwear.in", role: "owner", exp: Date.now() - 1 }),
  ).toString("base64url");
  assert.equal(verifySessionToken(`${expired}.${signature}`), null);
});

/**
 * R42: email hardcoded nahi hai (R33 guard) — password hi asli gate hai.
 * `ADMIN_EMAIL` set karte hi sirf wahi emails chalte hain (comma-separated).
 */
test("credentials check: password gate, aur ADMIN_EMAIL set ho to email list gate", () => {
  assert.equal(checkCredentials("admin@noorethnicwear.in", "noor2026"), true);
  assert.equal(checkCredentials("someone@else.com", "noor2026"), true, "default: email gate off, password gate on");
  assert.equal(checkCredentials("admin@noorethnicwear.in", "wrong"), false);
  assert.equal(checkCredentials("someone@else.com", "wrong"), false);
});

test("session 30 din chalti hai (baar-baar login nahi)", () => {
  const token = createSessionToken("admin@noorethnicwear.in");
  const session = verifySessionToken(token);
  const days = ((session?.exp ?? 0) - Date.now()) / 86_400_000;
  assert.ok(days > 29 && days <= 30.01, `expected ~30 days, got ${days.toFixed(2)}`);
});

test("cookie options persistent + httpOnly rehte hain", async () => {
  const { sessionCookieOptions } = await import("../../apps/admin/src/lib/auth.ts");
  const options = sessionCookieOptions();
  assert.equal(options.httpOnly, true);
  assert.equal(options.sameSite, "lax");
  assert.equal(options.path, "/");
  assert.ok((options.maxAge ?? 0) > 60 * 60 * 24 * 20);
});
