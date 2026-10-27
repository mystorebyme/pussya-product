import test from "node:test";
import assert from "node:assert/strict";
import {
  contactSchema,
  createOrderSchema,
  emailSchema,
  phoneSchema,
  pincodeSchema,
} from "@noor/validation";

const validOrder = {
  customerName: "Tannu Sharma",
  email: "Buyer@Example.com",
  phone: "9876543210",
  address: "12, MI Road, Near Panch Batti",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  paymentMethod: "cod" as const,
  items: [{ handle: "saniya-s-wine-gown", size: "M [38]", quantity: 1 }],
};

test("valid order passes", () => {
  const parsed = createOrderSchema.safeParse(validOrder);
  assert.equal(parsed.success, true);
});

test("email is normalised to lowercase", () => {
  const parsed = createOrderSchema.parse(validOrder);
  assert.equal(parsed.email, "buyer@example.com");
});

test("phone accepts +91 and spaces, stores 10 digits", () => {
  assert.equal(phoneSchema.parse("+91 98765 43210"), "9876543210");
  assert.equal(phoneSchema.parse("98765-43210"), "9876543210");
});

test("phone rejects landline-style and short numbers", () => {
  assert.equal(phoneSchema.safeParse("12345").success, false);
  assert.equal(phoneSchema.safeParse("5876543210").success, false);
});

test("pincode rejects leading zero and wrong length", () => {
  assert.equal(pincodeSchema.safeParse("012345").success, false);
  assert.equal(pincodeSchema.safeParse("30200").success, false);
  assert.equal(pincodeSchema.safeParse("302001").success, true);
});

test("quantity above 10 is rejected", () => {
  const parsed = createOrderSchema.safeParse({
    ...validOrder,
    items: [{ handle: "saniya-s-wine-gown", size: "M [38]", quantity: 11 }],
  });
  assert.equal(parsed.success, false);
});

test("empty cart is rejected", () => {
  const parsed = createOrderSchema.safeParse({ ...validOrder, items: [] });
  assert.equal(parsed.success, false);
});

test("unknown payment method is rejected", () => {
  const parsed = createOrderSchema.safeParse({ ...validOrder, paymentMethod: "upi" });
  assert.equal(parsed.success, false);
});

test("payment method defaults to prepaid", () => {
  const { paymentMethod: _ignored, ...withoutPayment } = validOrder;
  const parsed = createOrderSchema.parse(withoutPayment);
  assert.equal(parsed.paymentMethod, "prepaid");
});

test("coupon code is uppercased and trimmed", () => {
  const parsed = createOrderSchema.parse({ ...validOrder, couponCode: "  noor10 " });
  assert.equal(parsed.couponCode, "NOOR10");
});

test("email schema rejects garbage", () => {
  assert.equal(emailSchema.safeParse("not-an-email").success, false);
});

test("contact message neeeds 10+ characters", () => {
  assert.equal(contactSchema.safeParse({ name: "A", email: "a@b.com", message: "hi" }).success, false);
  assert.equal(
    contactSchema.safeParse({ name: "Amit", email: "a@b.com", message: "Size chart bhejo please" }).success,
    true,
  );
});
