import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * R50 checkout = **no online payment at all** (owner requirement).
 *
 *   1. Delivery details → 2. Review → **Send order on WhatsApp**
 *
 * The order is saved first (so it has an order number), then the full summary
 * opens in WhatsApp in the same click, so the customer only has to press send.
 * `/orders/<number>/pay` is now a WhatsApp hand-off page, not a UPI page.
 */

const root = process.cwd();
const read = (rel: string) => fs.readFileSync(path.join(root, rel), "utf8");
const checkout = read("apps/web/src/components/checkout-form.tsx");
const payPage = read("apps/web/src/app/orders/[orderNumber]/pay/page.tsx");
const orderPage = read("apps/web/src/app/orders/[orderNumber]/page.tsx");
const cartPage = read("apps/web/src/app/cart/page.tsx");
const fab = read("apps/web/src/components/whatsapp-fab.tsx");

/** comments hata kar check karo — UI copy + code me payment ka zikr na ho */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");
const checkoutCode = stripComments(checkout);
const payCode = stripComments(payPage);

test("checkout has a 3-step indicator that ends on WhatsApp", () => {
  assert.match(checkout, /data-testid="checkout-steps"/);
  assert.match(checkout, /label: "Delivery"/);
  assert.match(checkout, /label: "Review"/);
  assert.match(checkout, /label: "WhatsApp"/);
  assert.doesNotMatch(checkoutCode, /label: "Payment"/);
});

test("checkout step 1 continues to review, the order is sent only from review", () => {
  assert.match(checkout, /data-testid="checkout-continue"/);
  assert.match(checkout, /data-testid="checkout-review"/);
  assert.match(checkout, /data-testid="checkout-submit"/);
  assert.match(checkout, /setStep\("review"\)/);
  assert.match(checkout, /Send order on WhatsApp/);
});

test("no payment UI anywhere in the checkout: no UPI, QR, card or gateway", () => {
  assert.ok(!/UpiPayment|UpiQr|CheckoutPaymentStep|buildUpiUri/.test(checkout), "no payment component");
  assert.ok(!/upi:\/\//.test(checkout), "no UPI scheme link");
  assert.ok(!/\bUPI ID\b/i.test(checkoutCode), "no 'UPI ID' text");
  assert.ok(!/data-testid="upi-payment"/.test(checkout));
  assert.ok(!/payOnline|paymentMethod|\bcod\b/i.test(checkoutCode), "no payment method choice");
});

test("order is saved, then WhatsApp opens in the same gesture (one tap)", () => {
  assert.match(checkout, /window\.open\(href, "_blank", "noopener,noreferrer"\)/);
  assert.match(checkout, /window\.location\.href = href/);
  assert.match(checkout, /clear\(\)/);
  assert.match(checkout, /data-testid="order-sent"/);
  assert.match(checkout, /data-testid="checkout-form"/);
});

test("WhatsApp message carries items, total, address and the order number", () => {
  assert.match(checkout, /wa\.me/);
  assert.match(checkout, /Please confirm my order and share the payment details/);
  assert.match(checkout, /orderNumber/);
  assert.match(checkout, /× \$\{item\.quantity\}/);
  assert.match(checkout, /Total: \$\{formatPrice\(totals\)\}/);
});

test("the pay page is a WhatsApp hand-off, not a UPI page", () => {
  assert.doesNotMatch(payCode, /UpiPayment|PaymentStatusWatcher|upi:\/\//);
  assert.match(payPage, /data-testid="pay-order-number"/);
  assert.match(payPage, /data-testid="confirm-whatsapp"/);
  assert.match(payPage, /wa\.me/);
});

test("the order page and cart advertise WhatsApp, not payment", () => {
  assert.match(orderPage, /data-testid="order-whatsapp-block"/);
  assert.match(orderPage, /data-testid="complete-payment"/);
  assert.match(cartPage, /WhatsApp/);
  assert.doesNotMatch(stripComments(cartPage), /Secure UPI|Pay online|pay now/i);
});

test("every page has the WhatsApp button (layout mounts the FAB)", () => {
  const layout = read("apps/web/src/app/layout.tsx");
  assert.match(layout, /WhatsappFab/);
  assert.match(fab, /data-testid="whatsapp-fab"/);
  assert.match(fab, /wa\.me/);
});

test("checkout funnel events DB + sheet me jaate hain", () => {
  assert.match(checkout, /checkout\.started/);
  assert.match(checkout, /order\.failed/);
  assert.match(checkout, /\/api\/checkout\/events/);
});
