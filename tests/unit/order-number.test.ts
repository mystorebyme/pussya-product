import test from "node:test";
import assert from "node:assert/strict";
import { ORDER_NUMBER_PATTERN, generateOrderNumber as orderNumber } from "@noor/validation";

const PATTERN = ORDER_NUMBER_PATTERN;

test("order numbers match the public format", () => {
  for (let i = 0; i < 200; i += 1) assert.match(orderNumber(), PATTERN);
});

test("order numbers do not repeat in a burst", () => {
  const seen = new Set<string>();
  for (let i = 0; i < 2_000; i += 1) seen.add(orderNumber());
  assert.ok(seen.size > 1_990, `expected near-unique numbers, got ${seen.size}/2000`);
});

test("order number lookups are case-sensitive uppercase", () => {
  const number = orderNumber();
  assert.equal(number, number.toUpperCase());
});
