import { test } from "node:test";
import assert from "node:assert/strict";

import { applySalePricing, displayedPercent, SALE_FINAL_PRICES } from "../../scripts/lib/sale-pricing.mjs";
import { readJson, postJson } from "../../apps/web/src/lib/http-json";
import { orderSheetRow } from "../../apps/web/src/lib/sheet-format";
import type { Order } from "@noor/types";

/* ─────────────── sale pricing (Round 12: admin price respect) ─────────────── */

test("sale pricing always lands on the ₹499–₹699 ladder", () => {
  const products = ["green-anarkali", "pink-lehenga", "blue-suit-set"].map((handle) => ({ handle, price: 299_900 }));
  applySalePricing(products);
  for (const product of products) {
    assert.ok(SALE_FINAL_PRICES.includes(product.price), `${product.handle} -> ${product.price}`);
    const percent = displayedPercent(product.price, product.compareAtPrice);
    assert.ok(percent === 70 || percent === 60, `badge ${percent}%`);
  }
});

test("admin ka chuna hua ladder price rebuild par bacha rehta hai", () => {
  const product = { handle: "admin-uploaded-suit", price: 64_900, compareAtPrice: null };
  applySalePricing([product]);
  assert.equal(product.price, 64_900);
  const percent = displayedPercent(product.price, product.compareAtPrice);
  assert.ok(percent === 70 || percent === 60);
});

test("size pricing bhi sale price par hi rehti hai", () => {
  const product = {
    handle: "size-check-suit",
    price: 299_900,
    compareAtPrice: null,
    sizePricing: { S: { price: 299_900, compareAtPrice: 650_000 }, XL: { price: 309_900, compareAtPrice: 650_000 } },
  };
  applySalePricing([product]);
  for (const pricing of Object.values(product.sizePricing)) {
    assert.equal(pricing.price, product.price);
    assert.equal(pricing.compareAtPrice, product.compareAtPrice);
  }
});

/* ─────────────── safe JSON (HTML error page crash fix) ─────────────── */

test("readJson parses a normal JSON reply", async () => {
  const result = await readJson<{ ok: boolean }>(new Response(JSON.stringify({ ok: true })));
  assert.deepEqual(result.data, { ok: true });
  assert.equal(result.error, null);
});

test("readJson turns an HTML error page into a friendly message", async () => {
  const html = new Response("<!DOCTYPE html><html><head><title>502</title></head></html>", {
    status: 502,
    headers: { "content-type": "text/html" },
  });
  const result = await readJson(html);
  assert.equal(result.data, null);
  assert.match(String(result.error), /server|try|WhatsApp/i);
  assert.doesNotMatch(String(result.error), /Unexpected token/);
});

test("readJson handles an empty body without crashing", async () => {
  const result = await readJson(new Response("", { status: 200 }));
  assert.equal(result.data, null);
});

test("postJson reports a network failure instead of throwing", async () => {
  const result = await postJson("http://127.0.0.1:1/does-not-exist", { a: 1 }, { timeoutMs: 500 });
  assert.equal(result.data, null);
  assert.match(String(result.error), /network|internet|WhatsApp/i);
});

/* ─────────────── sheet rows ─────────────── */

test("order sheet row carries payment details for the owner", () => {
  const order = {
    orderNumber: "NE-TEST01",
    customerName: "Test Customer",
    email: "test@example.com",
    phone: "9876543210",
    address: "1 Test Street",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    total: 49_900,
    subtotal: 49_900,
    discount: 0,
    shipping: 0,
    paymentMethod: "prepaid",
    paymentStatus: "pending",
    status: "placed",
    createdAt: new Date().toISOString(),
    items: [{ handle: "x", title: "Anarkali", size: "M", quantity: 1, price: 49_900 }],
    payment: { reference: "412345678901", gateway: "upi-manual" },
  } as unknown as Order;

  const row = orderSheetRow(order, "order.placed");
  assert.equal(row["Order number"], "NE-TEST01");
  assert.equal(row["Payment reference"], "412345678901");
  assert.equal(row.Total, 499);
  assert.equal(row.Items, 1);
  assert.equal(row["Payment status"], "pending");
});
