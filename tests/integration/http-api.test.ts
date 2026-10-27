import test from "node:test";
import assert from "node:assert/strict";
import type { AddressInfo } from "node:net";
import "../helpers/webhook-env.ts";
import { createApp } from "../../apps/api/src/app.ts";

/** asli express app ek random port par — route + middleware stack ka end-to-end check */
const app = createApp();
const server = app.listen(0);
const { port } = server.address() as AddressInfo;
const base = `http://127.0.0.1:${port}/api/v1`;

test.after(() => server.close());

const orderBody = {
  customerName: "Http Test",
  email: "http@example.com",
  phone: "9876500011",
  address: "44 Johari Bazaar, Near Hawa Mahal",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302003",
  paymentMethod: "cod",
  items: [{ handle: "green-bandhej-maslin-anarkali-suit-set-td-141-copy", size: "S [36]", quantity: 1 }],
};

async function json(path: string, init?: RequestInit) {
  const response = await fetch(`${base}${path}`, init);
  return { status: response.status, headers: response.headers, body: (await response.json()) as any };
}

test("GET /health reports the catalogue", async () => {
  const { status, body } = await json("/health");
  assert.equal(status, 200);
  assert.equal(body.data.status, "ok");
  assert.ok(body.data.products >= 287, `only ${body.data.products} products`);
  assert.equal(body.data.service, "noor-api");
});

test("GET /products is paginated with an envelope", async () => {
  const { status, body } = await json("/products?perPage=3&sort=price-low");
  assert.equal(status, 200);
  assert.equal(body.data.length, 3);
  assert.ok(body.total >= 287, `only ${body.total} products`);
  assert.equal(body.page, 1);
  assert.equal(body.perPage, 3);
});

test("GET /products/:handle returns 404 for unknown", async () => {
  const { status, body } = await json("/products/nope-nope");
  assert.equal(status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});

test("admin routes reject missing token", async () => {
  const { status, body } = await json("/orders");
  assert.equal(status, 401);
  assert.equal(body.error.code, "UNAUTHORIZED");
});

test("admin routes accept the bearer token", async () => {
  const { status } = await json("/orders", {
    headers: { authorization: `Bearer ${process.env.ADMIN_API_TOKEN!}` },
  });
  assert.equal(status, 200);
});

test("POST /orders validates the body", async () => {
  const { status, body } = await json("/orders", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...orderBody, pincode: "0123" }),
  });
  assert.equal(status, 400);
  assert.equal(body.error.code, "VALIDATION_ERROR");
});

test("POST /orders creates once per idempotency key", async () => {
  const headers = { "content-type": "application/json", "idempotency-key": "http-test-key-1" };
  const first = await json("/orders", { method: "POST", headers, body: JSON.stringify(orderBody) });
  assert.equal(first.status, 201);
  assert.match(first.body.data.orderNumber, /^NE-[A-Z0-9]{6,12}$/);

  const replay = await json("/orders", { method: "POST", headers, body: JSON.stringify(orderBody) });
  assert.equal(replay.status, 201);
  assert.equal(replay.body.data.orderNumber, first.body.data.orderNumber);
  assert.equal(replay.headers.get("idempotent-replay"), "true");
});

test("order can be fetched by number and status transitioned", async () => {
  const created = await json("/orders", {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": "http-test-key-2" },
    body: JSON.stringify({ ...orderBody, paymentMethod: "prepaid" }),
  });
  const orderNumber = created.body.data.orderNumber as string;

  const detail = await json(`/orders/${orderNumber}`);
  assert.equal(detail.status, 200);
  assert.equal(detail.body.data.orderNumber, orderNumber);

  const invalid = await json(`/orders/${orderNumber}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.ADMIN_API_TOKEN!}` },
    body: JSON.stringify({ status: "delivered" }),
  });
  assert.equal(invalid.status, 409);
  assert.equal(invalid.body.error.code, "INVALID_TRANSITION");

  const valid = await json(`/orders/${orderNumber}/status`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${process.env.ADMIN_API_TOKEN!}` },
    body: JSON.stringify({ status: "confirmed" }),
  });
  assert.equal(valid.status, 200);
  assert.equal(valid.body.data.status, "confirmed");
});

test("webhook rejects an unsigned request", async () => {
  const response = await fetch(`${base}/webhooks/razorpay`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ event: "payment_link.paid" }),
  });
  assert.equal(response.status, 401);
});

test("unknown route returns the standard 404 envelope", async () => {
  const { status, body } = await json("/does-not-exist");
  assert.equal(status, 404);
  assert.equal(body.error.code, "NOT_FOUND");
});
