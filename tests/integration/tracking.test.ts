import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { isolate } from "../helpers/env.ts";

const dir = isolate("tracking");
// admin panel ka data layer hi test karte hain — wahi code server action use karta hai
import * as data from "../../apps/admin/src/lib/data.ts";

function seedOrder() {
  const orderNumber = `NE-TEST${Date.now().toString(36).toUpperCase().slice(-6)}`;
  const file = path.join(dir, "orders.json");
  const rows = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, "utf8")) : [];
  rows.unshift({
    id: `id-${orderNumber}`,
    orderNumber,
    createdAt: new Date().toISOString(),
    customerName: "Tracking Tester",
    email: "track@example.com",
    phone: "9876543210",
    address: "12 MI Road, Panch Batti",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    notes: null,
    items: [{ handle: "green-bandhej-masankali", title: "Test Suit", image: "", size: "M [38]", quantity: 1, price: 299_900 }],
    subtotal: 299_900,
    discount: 0,
    shipping: 0,
    total: 299_900,
    couponCode: null,
    paymentMethod: "cod",
    paymentStatus: "cod",
    status: "placed",
    audit: [],
  });
  fs.writeFileSync(file, JSON.stringify(rows, null, 2));
  return orderNumber;
}

test("admin can move an order along the status machine", async () => {
  const orderNumber = seedOrder();
  assert.equal((await data.updateOrderStatus(orderNumber, "confirmed", "admin@noorethnicwear.in"))?.status, "confirmed");
  assert.equal((await data.updateOrderStatus(orderNumber, "packed", "admin@noorethnicwear.in"))?.status, "packed");
  assert.equal((await data.updateOrderStatus(orderNumber, "shipped", "admin@noorethnicwear.in"))?.status, "shipped");
  // invalid jump (shipped -> packed) reject hota hai
  assert.equal(await data.updateOrderStatus(orderNumber, "packed", "admin@noorethnicwear.in"), null);
});

test("courier + AWB are stored and audited", async () => {
  const orderNumber = seedOrder();
  const updated = await data.setOrderTracking(
    orderNumber,
    { courier: "Delhivery", awb: "AWB-12345", url: "https://www.delhivery.com/track/package/AWB-12345" },
    "admin@noorethnicwear.in",
  );
  assert.ok(updated);
  assert.equal(updated!.tracking?.courier, "Delhivery");
  assert.equal(updated!.tracking?.awb, "AWB-12345");
  assert.ok(updated!.tracking?.shippedAt, "shippedAt set hona chahiye");
  assert.equal(updated!.audit[0]?.action, "order.tracking_updated");

  const reread = await data.getOrder(orderNumber);
  assert.equal(reread?.tracking?.awb, "AWB-12345", "tracking disk par persist hona chahiye");
});
