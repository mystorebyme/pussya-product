import test from "node:test";
import assert from "node:assert/strict";
import { corsHeaders, preflight } from "../../apps/web/src/lib/cors";

const req = (origin?: string) =>
  new Request("https://store.example/api/orders", {
    method: "POST",
    headers: origin ? { origin } : {},
  });

test("Pages preview origin ko allow karta hai (static site -> Render API)", () => {
  const headers = corsHeaders(req("https://mystorebyme.github.io"));
  assert.equal(headers["Access-Control-Allow-Origin"], "https://mystorebyme.github.io");
  assert.equal(headers.Vary, "Origin");
});

test("apne onrender host allow, koi bhi random site nahi", () => {
  assert.ok(corsHeaders(req("https://noorclothing.onrender.com"))["Access-Control-Allow-Origin"]);
  assert.equal(corsHeaders(req("https://evil.example"))["Access-Control-Allow-Origin"], undefined);
  assert.equal(corsHeaders(req())["Access-Control-Allow-Origin"], undefined);
});

test("CORS_ALLOWED_ORIGINS se extra domain jodta hai", () => {
  process.env.CORS_ALLOWED_ORIGINS = "https://noorethnicwear.in";
  assert.equal(
    corsHeaders(req("https://noorethnicwear.in"))["Access-Control-Allow-Origin"],
    "https://noorethnicwear.in",
  );
  delete process.env.CORS_ALLOWED_ORIGINS;
});

test("preflight 204 deta hai method + idempotency header ke saath", () => {
  const response = preflight(req("https://mystorebyme.github.io"));
  assert.equal(response.status, 204);
  assert.equal(response.headers.get("access-control-allow-methods"), "GET, POST, OPTIONS");
  assert.match(response.headers.get("access-control-allow-headers") ?? "", /Idempotency-Key/);
});
