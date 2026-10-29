import test from "node:test";
import assert from "node:assert/strict";
import {
  COD_FEE,
  COD_MAX_SUBTOTAL,
  IDEMPOTENCY_TTL_MS,
  ORDER_TRANSITIONS,
  canTransition,
  computeDiscount,
} from "@noor/validation";

test("festive sale me koi coupon price ko nahi girata", () => {
  // final price ₹499–₹699 fix hai — 10%/15% coupon usse tod deta
  assert.equal(computeDiscount(251_910, "NOOR10"), 0);
  assert.equal(computeDiscount(300_000, "noor10"), 0);
  assert.equal(computeDiscount(300_000, "Welcome15"), 0);
});

test("unknown or empty coupon gives zero discount", () => {
  assert.equal(computeDiscount(300_000, "FREE100"), 0);
  assert.equal(computeDiscount(300_000, null), 0);
  assert.equal(computeDiscount(300_000, ""), 0);
});

test("discount is always an integer paise value", () => {
  const value = computeDiscount(199_999, "WELCOME15");
  assert.equal(Number.isInteger(value), true);
  assert.equal(value, 0);
});

test("COD fee and limit are the published numbers", () => {
  assert.equal(COD_FEE, 5_000);
  assert.equal(COD_MAX_SUBTOTAL, 350_000);
});

test("order total = subtotal - discount + cod fee", () => {
  const subtotal = 251_910;
  const discount = computeDiscount(subtotal, "NOOR10");
  const total = subtotal - discount + COD_FEE;
  assert.equal(total, 256_910);
});

test("prepaid total has no COD fee", () => {
  const subtotal = 251_910;
  const total = subtotal - computeDiscount(subtotal, "NOOR10");
  assert.equal(total, 251_910);
});

test("status machine allows the happy path only", () => {
  assert.equal(canTransition("placed", "confirmed"), true);
  assert.equal(canTransition("confirmed", "packed"), true);
  assert.equal(canTransition("packed", "shipped"), true);
  assert.equal(canTransition("shipped", "delivered"), true);
  assert.equal(canTransition("placed", "delivered"), false);
  assert.equal(canTransition("delivered", "placed"), false);
  assert.equal(canTransition("cancelled", "confirmed"), false);
  assert.equal(canTransition("shipped", "returned"), true);
  assert.equal(canTransition("placed", "placed"), false);
});

test("terminal statuses have no outgoing transitions", () => {
  assert.deepEqual(ORDER_TRANSITIONS.cancelled, []);
  assert.deepEqual(ORDER_TRANSITIONS.returned, []);
  assert.deepEqual(ORDER_TRANSITIONS.delivered, ["returned"]);
});

test("idempotency window is one week", () => {
  assert.equal(IDEMPOTENCY_TTL_MS, 7 * 24 * 60 * 60 * 1000);
});
