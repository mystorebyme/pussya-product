import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

/**
 * Checkout = **3 steps** (owner requirement, R36 me update):
 *   1. delivery details → 2. review → 3. payment — **isi page par** (alag page nahi).
 *
 * Address aur payment ek saath dikhte nahi: step 1/2 par UPI ka koi zikr nahi,
 * payment sirf step 3 par (`CheckoutPaymentStep`). `/orders/<number>/pay` deep
 * links (WhatsApp/email/QR) ke liye bacha hai aur wahi `UpiPayment` render karta hai.
 */

const root = process.cwd();
const checkout = fs.readFileSync(
  path.join(root, "apps/web/src/components/checkout-form.tsx"),
  "utf8",
);
const payPage = fs.readFileSync(
  path.join(root, "apps/web/src/app/orders/[orderNumber]/pay/page.tsx"),
  "utf8",
);
const upiPayment = fs.readFileSync(
  path.join(root, "apps/web/src/components/upi-payment.tsx"),
  "utf8",
);
const upiLib = fs.readFileSync(path.join(root, "apps/web/src/lib/upi.ts"), "utf8");
/** comments hata kar check karo — UI copy + code me UPI ka zikr na ho */
const stripComments = (source: string) =>
  source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/[^\n]*$/gm, "");
const checkoutCode = stripComments(checkout);

test("checkout has a 3-step indicator", () => {
  assert.match(checkout, /data-testid="checkout-steps"/);
  assert.match(checkout, /Delivery/);
  assert.match(checkout, /Review/);
  assert.match(checkout, /Payment/);
});

test("checkout step 1 continues to review, order is placed only from review", () => {
  assert.match(checkout, /data-testid="checkout-continue"/);
  assert.match(checkout, /data-testid="checkout-review"/);
  assert.match(checkout, /setStep\("review"\)/);
  // submit button sirf review step me dikhta hai (R36: payment step alag shell me hai)
  assert.match(checkout, /const showDetails = !isPayment && !resumed && step === "details"/);
  assert.match(checkout, /\)\s*:\s*showDetails \? \(\s*<button\s+type="button"/);
});

test("step 1/2 me UPI ID / QR / 'pay here' nahi — payment sirf step 3 par", () => {
  // checkout form khud UPI render nahi karta — step 3 ka component karta hai
  assert.ok(!checkout.includes('data-testid="upi-payment"'), "checkout form me UPI block nahi");
  assert.ok(!/UpiApps|upi-apps/.test(checkout), "koi UPI app chip nahi");
  assert.ok(!/UpiQr/.test(checkout), "checkout form me UPI QR nahi");
  assert.ok(!/buildUpiUri/.test(checkout), "checkout form me upi:// link nahi");
  assert.ok(!/upi:\/\//.test(checkout), "checkout form me UPI scheme nahi");
  assert.ok(!/UPI ID/i.test(checkoutCode), "step 1/2 par 'UPI ID' text nahi");
  assert.ok(!/dhakadgourav/.test(checkout), "UPI ID hard-code nahi");
  // step 3 wahin khulta hai, sirf isPayment par
  assert.match(checkout, /<CheckoutPaymentStep/);
  assert.match(checkout, /\{isPayment \? \(/);
  assert.match(payPage, /UpiPayment/);
});

test("payment par ek hi 'Pay on UPI' button + auto status detection (koi app brand nahi)", () => {
  assert.match(upiLib, /export function buildUpiUri/);
  assert.match(upiPayment, /data-testid="upi-open"/);
  assert.match(upiPayment, /data-testid="upi-recheck"/);
  assert.match(upiPayment, /Pay on UPI/);
  // owner rule: GPay/PhonePe/Paytm ke naam kahin nahi
  assert.ok(!/Google Pay|PhonePe|Paytm|BHIM/i.test(upiPayment), "payment page par app brand nahi");
  assert.ok(!/tez:\/\/|phonepe:\/\/|paytmmp:\/\//.test(upiPayment), "app-specific schemes nahi");
  assert.match(payPage, /PaymentStatusWatcher/);
});

test("order place hote hi payment step 3 checkout ke andar khulta hai (alag page nahi)", () => {
  assert.match(checkout, /goToPayment\(result\.data\.orderNumber\)/);
  assert.match(checkout, /window\.history\.pushState\(\{\}, "", paymentUrl\(target\)\)/);
  assert.doesNotMatch(checkout, /router\.push\(`\/orders\//, "payment page par redirect nahi");
  assert.doesNotMatch(checkout, /\?pay=1/, "UPI auto-open wala flag hata diya gaya");
});

test("checkout funnel events DB + sheet me jaate hain", () => {
  assert.match(checkout, /checkout\.started/);
  assert.match(checkout, /order\.failed/);
  assert.match(checkout, /\/api\/checkout\/events/);
});
