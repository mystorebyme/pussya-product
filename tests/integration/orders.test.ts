import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Catalog } from "@noor/types";
import { dataDir } from "../helpers/orders-env.ts";
import * as service from "../../apps/api/src/modules/orders/orders.service.ts";
import { canTransition } from "@noor/validation";

const catalog = JSON.parse(
  fs.readFileSync(path.join(process.cwd(), "database/seeds/catalog.json"), "utf8"),
) as Catalog;

// COD limit ke andar rehne ke liye sabse sasta multi-size product
const product = catalog.products
  .filter((item) => item.sizes.length > 1 && item.price <= 350_000)
  .sort((a, b) => a.price - b.price)[0]!;
const baseOrder = {
  customerName: "Test Buyer",
  email: "buyer@example.com",
  phone: "9876543210",
  address: "12 MI Road, Panch Batti",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  paymentMethod: "cod" as const,
  items: [{ handle: product.handle, size: product.sizes[1]!, quantity: 1 }],
};

test("catalogue price is used, not any client value", () => {
  // client sirf handle/size/quantity bhejta hai — price catalogue se aata hai
  const order = service.create({
    ...baseOrder,
    paymentMethod: "prepaid",
    items: [{ ...baseOrder.items[0]!, quantity: 2 }],
  });
  assert.equal(order.items[0]!.price, product.price);
  assert.equal(order.subtotal, product.price * 2);
  assert.equal(order.total, product.price * 2);
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.status, "placed");
  assert.match(order.orderNumber, /^NE-[A-Z0-9]{6,12}$/);
});

test("sale price is final — coupon se total nahi girta", () => {
  const order = service.create({ ...baseOrder, couponCode: "NOOR10" });
  assert.equal(order.discount, 0);
  assert.equal(order.total, order.subtotal + 5_000);
});

test("unknown size is rejected instead of silently substituted", () => {
  assert.throws(
    () => service.create({ ...baseOrder, items: [{ handle: product.handle, size: "ZZ [99]", quantity: 1 }] }),
    /not available/i,
  );
});

test("unknown product is rejected", () => {
  assert.throws(
    () => service.create({ ...baseOrder, items: [{ handle: "no-such-product", size: "S [36]", quantity: 1 }] }),
    /Product not found/i,
  );
});

// sale pricing ke baad har item ₹699 tak ka hai — COD limit cross karne ke liye quantity
const bulkItem = (() => {
  const product = catalog.products.find((item) => item.price >= 64_900)!;
  return { product, item: { handle: product.handle, size: product.sizes[0]!, quantity: 6 } };
})();

test("COD above Rs. 3,500 is refused", () => {
  assert.ok(bulkItem.product.price * bulkItem.item.quantity > 350_000);
  assert.throws(
    () => service.create({ ...baseOrder, paymentMethod: "cod", items: [bulkItem.item] }),
    /COD/i,
  );
});

test("prepaid order above the COD limit is accepted", () => {
  const order = service.create({ ...baseOrder, paymentMethod: "prepaid", items: [bulkItem.item] });
  assert.equal(order.paymentStatus, "pending");
  assert.equal(order.total, bulkItem.product.price * bulkItem.item.quantity);
});

test("status transitions are enforced", () => {
  const order = service.create(baseOrder);
  assert.throws(() => service.updateStatus(order.orderNumber, "delivered", "test"), /Invalid transition/i);
  const confirmed = service.updateStatus(order.orderNumber, "confirmed", "test");
  assert.equal(confirmed.status, "confirmed");
  const shipped = service.updateStatus(order.orderNumber, "packed", "test");
  assert.equal(shipped.status, "packed");
  assert.equal(canTransition("packed", "shipped"), true);
});

test("payment webhook flips pending order to paid + confirmed", () => {
  const order = service.create({ ...baseOrder, paymentMethod: "prepaid" });
  const paid = service.markPaid(order.orderNumber, "pay_test_123");
  assert.equal(paid!.paymentStatus, "paid");
  assert.equal(paid!.status, "confirmed");
  assert.equal(paid!.audit[0]!.action, "payment.paid");
});

test("orders persist to the data dir as an array", () => {
  const file = path.join(dataDir, "orders.json");
  const rows = JSON.parse(fs.readFileSync(file, "utf8")) as unknown[];
  assert.ok(rows.length >= 5);
});
