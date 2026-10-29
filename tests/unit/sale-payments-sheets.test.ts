import test from "node:test";
import assert from "node:assert/strict";
import { applySalePricing, displayedPercent, salePriceFor, SALE_FINAL_PRICES } from "../../scripts/lib/sale-pricing.mjs";
import { buildUpiUri, normaliseUpiId, normaliseUpiReference, formatUpiAmount } from "../../apps/web/src/lib/upi";
import { normaliseSheetSettings, orderSheetRow } from "../../apps/web/src/lib/sheet-format";

test("sale price always lands on ₹499/₹549/₹599/₹649/₹699", () => {
  for (let index = 0; index < 500; index += 1) {
    const { price } = salePriceFor(`product-${index}`);
    assert.ok(SALE_FINAL_PRICES.includes(price), `bad price ${price}`);
  }
});

test("sale badge shows exactly 70% or 60%", () => {
  const seen = new Set<number>();
  for (let index = 0; index < 500; index += 1) {
    const { price, compareAtPrice, percent } = salePriceFor(`handle-${index}`);
    const shown = displayedPercent(price, compareAtPrice);
    assert.equal(shown, percent);
    assert.ok([60, 70].includes(shown));
    seen.add(shown);
  }
  // dono slabs catalogue me rehne chahiye
  assert.deepEqual([...seen].sort(), [60, 70]);
});

test("same handle always gets same price (rebuild safe)", () => {
  assert.deepEqual(salePriceFor("ruby-royale"), salePriceFor("ruby-royale"));
});

test("applySalePricing sets price on product, every size and variant", () => {
  const product = {
    handle: "demo-suit",
    price: 299_900,
    compareAtPrice: 650_000,
    sizes: ["S [36]", "XL [42]"],
    sizePricing: {
      "S [36]": { price: 299_900, compareAtPrice: 650_000, available: true },
      "XL [42]": { price: 300_900, compareAtPrice: 650_000, available: false },
    },
    variants: [{ size: "S [36]", price: 299_900 }],
  };
  applySalePricing([product]);
  assert.ok(SALE_FINAL_PRICES.includes(product.price));
  assert.equal(product.sizePricing["XL [42]"].price, product.price);
  assert.equal(product.sizePricing["XL [42]"].available, false);
  assert.equal(product.variants[0]!.price, product.price);
  assert.ok(product.compareAtPrice > product.price);
});

test("UPI id validation", () => {
  assert.equal(normaliseUpiId("teststore@upi"), "teststore@upi");
  assert.equal(normaliseUpiId("  noor.clothing@okhdfcbank "), "noor.clothing@okhdfcbank");
  assert.equal(normaliseUpiId("not-a-vpa"), null);
  assert.equal(normaliseUpiId("a@b"), null);
  assert.equal(normaliseUpiId(""), null);
});

test("UPI URI carries amount, payee and order note", () => {
  const uri = buildUpiUri({
    vpa: "teststore@upi",
    name: "Noor Ethnic Wear",
    amountPaise: 49_900,
    note: "Order NE-ABC123",
  });
  const params = new URLSearchParams(uri.replace("upi://pay?", ""));
  assert.equal(params.get("pa"), "teststore@upi");
  assert.equal(params.get("am"), "499.00");
  assert.equal(params.get("cu"), "INR");
  assert.equal(params.get("tn"), "Order NE-ABC123");
});

test("UPI amount is always two decimals", () => {
  assert.equal(formatUpiAmount(49_900), "499.00");
  assert.equal(formatUpiAmount(69_900), "699.00");
  assert.equal(formatUpiAmount(0), "0.00");
});

test("UTR reference accepts real bank references and rejects junk", () => {
  assert.equal(normaliseUpiReference(" 4123 4567 8901 "), "412345678901");
  assert.equal(normaliseUpiReference("abc-123456"), "ABC123456");
  assert.equal(normaliseUpiReference("123"), null);
  assert.equal(normaliseUpiReference("!!!!!!"), null);
});

test("sheet settings parser handles Apps Script shapes", () => {
  const parsed = normaliseSheetSettings({
    ok: true,
    settings: {
      upi_id: "teststore@upi",
      support_phone: "9876543210",
      support_email: "info.noorethnicwear@gmail.com",
      announcement: "Diwali Sale — Flat 70% OFF",
      free_shipping: "yes",
    },
  });
  assert.equal(parsed?.upiId, "teststore@upi");
  assert.equal(parsed?.supportPhone, "9876543210");
  // khaali cell = undefined (site apna default/last-good rakhti hai, 0 nahi)
  assert.equal(normaliseSheetSettings({ settings: { support_phone: "" } }), null);
  assert.equal(parsed?.freeShipping, true);
  assert.equal(normaliseSheetSettings({ ok: false }), null);
  assert.equal(normaliseSheetSettings({ settings: {} }), null);
});

test("order sheet row carries payment + tracking details", () => {
  const row = orderSheetRow(
    {
      orderNumber: "NE-ABC123",
      status: "shipped",
      paymentStatus: "paid",
      paymentMethod: "prepaid",
      payment: { reference: "412345678901" },
      total: 49_900,
      subtotal: 49_900,
      discount: 0,
      couponCode: null,
      items: [{ title: "Anarkali", size: "S [36]", quantity: 1 }],
      customerName: "Test Customer",
      phone: "",
      email: "test@example.com",
      address: "12 MG Road",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      tracking: { courier: "Delhivery", awb: "AWB123", url: "https://track.example/1" },
      notes: null,
    } as never,
    "payment.paid",
    { "UPI ID": "teststore@upi" },
  );
  assert.equal(row["Order number"], "NE-ABC123");
  assert.equal(row["Payment reference"], "412345678901");
  assert.equal(row["UPI ID"], "teststore@upi");
  assert.equal(row["Total"], 499);
  assert.equal(row["AWB"], "AWB123");
  assert.equal(row["Item details"], "Anarkali (S [36]) x1");
});
