/**
 * R36 guards — owner (27 Oct 2026):
 *   1. "ek baar address card ki detail fill kare to sab cache me save kar lena,
 *      next time direct recommend ho jaaye"
 *   2. "payment ka alag se page nahi khulna chahiye — wahi 3rd step me kaam kare,
 *      back jaane par bhi, aur wapis usi order me payment par jaane par bhi"
 *   3. "payment page par jaate hi UPI par redirect na kare — 'Pay on UPI' kare
 *      tab jaakar UPI detect ho"
 *   4. Site abhi **Vercel** par hai (project `noor-clothing` →
 *      noorethnicwear.in), isliye sheet ka real-time update wahan bhi chale.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import {
  clearCheckoutDetails,
  normaliseCheckoutDetails,
  phoneLast4,
  readCheckoutDetails,
  saveCheckoutDetails,
} from "../../apps/web/src/lib/checkout-details";
import { paymentUrl, reviewUrl } from "../../apps/web/src/lib/checkout-session";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

const FORM = "apps/web/src/components/checkout-form.tsx";
const UPI = "apps/web/src/components/upi-payment.tsx";
const STEP3 = "apps/web/src/components/checkout-payment-step.tsx";
const CONTEXT_ROUTE = "apps/web/src/app/api/orders/[orderNumber]/payment-context/route.ts";
const PAY_PAGE = "apps/web/src/app/orders/[orderNumber]/pay/page.tsx";
const WATCHER = "apps/web/src/components/payment-status-watcher.tsx";

const DETAILS = {
  customerName: "Asha Sharma",
  email: "Asha@Example.com",
  phone: "+91 98765-43210",
  address: "12, MG Road, C-Scheme",
  city: "Jaipur",
  state: "Rajasthan",
  pincode: "302001",
  notes: "shaam ko deliver kariye",
};

/* ───────────────── 1. saved details (address recommend) ───────────────── */

test("R36: checkout URL step 3 ke liye banta hai (review + payment)", () => {
  assert.equal(reviewUrl("NE-ABC123"), "/checkout?step=review&order=NE-ABC123");
  assert.equal(paymentUrl("NE-ABC123"), "/checkout?step=payment&order=NE-ABC123");
});

test("R36: saved details normalise hoti hain (saaf + sirf zaroori fields)", () => {
  const saved = normaliseCheckoutDetails(DETAILS, new Date("2026-10-27T10:00:00.000Z"));
  assert.ok(saved);
  assert.equal(saved.customerName, "Asha Sharma");
  assert.equal(saved.email, "asha@example.com", "email lowercase");
  assert.equal(saved.phone, "9876543210", "mobile sirf digits");
  assert.equal(saved.pincode, "302001");
  assert.equal(saved.state, "Rajasthan");
  assert.equal(saved.savedAt, "2026-10-27T10:00:00.000Z");
  // koi payment/UPI/card detail isme jaati hi nahi
  assert.deepEqual(Object.keys(saved).sort(), [
    "address",
    "city",
    "customerName",
    "email",
    "notes",
    "phone",
    "pincode",
    "savedAt",
    "state",
  ]);
});

test("R36: adhoori details recommend nahi hoti (galat address par order na jaaye)", () => {
  assert.equal(normaliseCheckoutDetails(null), null);
  assert.equal(normaliseCheckoutDetails("Asha"), null);
  assert.equal(normaliseCheckoutDetails({ ...DETAILS, customerName: "A" }), null, "naam chhota");
  assert.equal(normaliseCheckoutDetails({ ...DETAILS, phone: "98765" }), null, "mobile adhoora");
  assert.equal(normaliseCheckoutDetails({ ...DETAILS, address: "12" }), null, "address chhota");
  assert.equal(normaliseCheckoutDetails({ ...DETAILS, pincode: "30200" }), null, "pincode 5 digit");
});

test("R36: lambi/gandi value clip hoti hai (storage + XSS safe)", () => {
  const saved = normaliseCheckoutDetails({
    ...DETAILS,
    customerName: "A".repeat(400),
    address: `<script>alert(1)</script>${"B".repeat(400)}`,
    pincode: "3020019999",
  });
  assert.ok(saved);
  assert.ok(saved.customerName.length <= 80, "naam 80 char tak");
  assert.ok(saved.address.length <= 200, "address 200 char tak");
  assert.ok(!saved.address.includes("<"), "HTML tag nahi bachta");
  assert.equal(saved.pincode, "302001", "pincode sirf 6 digit");
});

test("R36: save → read → clear localStorage par chalta hai, 6 mahine baad expire", () => {
  const store = new Map<string, string>();
  const fakeWindow = {
    localStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  const globals = globalThis as unknown as { window?: unknown };
  const previous = globals.window;
  globals.window = fakeWindow;
  try {
    assert.equal(saveCheckoutDetails(DETAILS), true);
    assert.equal(readCheckoutDetails()?.city, "Jaipur");
    assert.equal(saveCheckoutDetails({ ...DETAILS, phone: "98" }), false, "adhoori save nahi hoti");
    assert.equal(readCheckoutDetails()?.phone, "9876543210", "purani sahi details bachhi rahti hain");
    // 6 mahine + 1 din purani → recommend nahi
    const future = Date.now() + 181 * 24 * 60 * 60 * 1000;
    assert.equal(readCheckoutDetails(future), null);
    clearCheckoutDetails();
    assert.equal(readCheckoutDetails(), null);
  } finally {
    globals.window = previous;
  }
});

test("R36: window/storage na ho to bhi crash nahi (SSR / private mode)", () => {
  const globals = globalThis as unknown as { window?: unknown };
  const previous = globals.window;
  delete globals.window;
  try {
    assert.equal(saveCheckoutDetails(DETAILS), false);
    assert.equal(readCheckoutDetails(), null);
    clearCheckoutDetails();
  } finally {
    globals.window = previous;
  }
  assert.equal(phoneLast4("9876543210"), "3210");
  assert.equal(phoneLast4("+91 98765-43210"), "3210");
  assert.equal(phoneLast4("98"), "");
});

test("R36: checkout form saved details prefill karta hai + batata hai + clear hota hai", () => {
  const form = read(FORM);
  assert.match(form, /readCheckoutDetails\(\)/, "mount par saved details padhta hai");
  assert.match(form, /saveCheckoutDetails\(form\)/, "review/order par details yaad hoti hain");
  assert.match(form, /setUsedSavedDetails\(true\)/);
  assert.match(form, /data-testid="saved-address"/, "customer ko dikhta hai ki address pehle se bhara hai");
  assert.match(form, /data-testid="saved-address-clear"/, "ek tap me naya address");
  assert.match(form, /clearCheckoutDetails\(\)/);
  // browser ka apna autofill bhi
  assert.match(form, /autoComplete="street-address"/);
  assert.match(form, /autoComplete="postal-code"/);
  assert.match(form, /autoComplete="tel"/);
  assert.match(form, /autoComplete="address-level1"/);
});

/* ───────────── 2. payment step 3 — isi page par, alag page nahi ───────────── */

/**
 * R50 replaced the in-checkout payment step with a WhatsApp hand-off, so the
 * R36 payment-step guards are retired. What must still hold: the order URL
 * (`?order=…&step=review`) reopens the same order, in English, with the
 * WhatsApp CTA ready.
 */

test("R50: no in-checkout payment step exists any more", () => {
  const form = read(FORM);
  assert.doesNotMatch(form, /CheckoutPaymentStep/);
  assert.doesNotMatch(form, /data-testid="checkout-payment-step"/);
  assert.doesNotMatch(form, /payment-context/);
  assert.match(form, /data-testid="checkout-submit"/);
});

test("R50: URL se order dobara khulta hai (review) aur WhatsApp hand-off taiyaar hota hai", () => {
  const form = read(FORM);
  assert.match(form, /const wantsReview = searchParams\.get\("step"\) === "review"/);
  assert.match(form, /setStep\(wantsReview \? "review" : "sent"\)/);
  assert.match(form, /setHandoff\(\{/);
  assert.match(form, /I am following up on order/);
});

test("R50: hand-off page par live order ka raasta hai (payment context nahi)", () => {
  const pay = read(PAY_PAGE);
  assert.match(pay, /data-testid="pay-order-number"/);
  assert.match(pay, /data-testid="pay-amount"/);
  assert.match(pay, /data-testid="confirm-whatsapp"/);
  assert.doesNotMatch(pay, /PaymentStatusWatcher|UpiPayment/);
});

/* ───────────── 4. Vercel par sheet real-time (after() se background) ───────────── */

test("R36: Vercel par background refresh `after()` se hota hai (lambda freeze se bachta)", () => {
  const sheets = read("apps/web/src/lib/google-sheets.ts");
  const settings = read("apps/web/src/lib/store-settings.ts");
  assert.match(sheets, /import \{ runInBackground \} from "\.\/background"/);
  assert.match(sheets, /runInBackground\(\(\) => readNow\(\)\.catch\(\(\) => undefined\)\)/);
  assert.match(settings, /runInBackground\(\(\) => merge\(\{ fresh: false \}\)\.catch\(\(\) => undefined\)\)/);
  // sheet read ke knobs env se tunable (R35) — Vercel par bhi wahi
  assert.match(sheets, /SHEET_READ_TIMEOUT_MS/);
  assert.match(sheets, /SHEET_SETTINGS_TTL_MS/);
});

test("R36: eslint build output ko globally ignore karta hai (warna bundle lint hota hai)", () => {
  const config = read("apps/web/eslint.config.mjs");
  // flat config: global ignore sirf tab jab object me `ignores` **akela** ho
  const ignoreObject = /\{\s*ignores:[\s\S]*?\n {2}\},/.exec(config)?.[0] ?? "";
  assert.ok(ignoreObject.length > 0, "ignores ka apna object mila");
  assert.doesNotMatch(ignoreObject, /rules:/, "ignores wale object me rules nahi (warna global ignore nahi hota)");
  for (const pattern of [".next/**", ".cloudflare/**", ".vinext/**", "out/**"]) {
    assert.ok(ignoreObject.includes(`"${pattern}"`), `${pattern} ignore hai`);
  }
  // aur rules wale object me ignores na aa jaaye (wahi purani galti)
  const rulesObject = /\{\s*rules:[\s\S]*?\n {2}\},/.exec(config)?.[0] ?? "";
  assert.ok(rulesObject.length > 0, "rules ka object mila");
  assert.doesNotMatch(rulesObject, /ignores:/, "rules wale object me ignores nahi");
});

test("R36: docs me naya flow + Vercel sheet config likha hai", () => {
  const report = read("docs/00-overview/owner-report-round36.md");
  assert.match(report, /step 3/i, "payment step 3");
  assert.match(report, /Pay on UPI/, "auto redirect nahi");
  assert.match(report, /noor-clothing/, "Vercel project ka naam");
  assert.match(report, /GOOGLE_SHEETS_WEBAPP_URL/);
  const sheetsDoc = read("docs/09-devops/google-sheets.md");
  assert.match(sheetsDoc, /noor-clothing/, "Vercel project");
  assert.match(sheetsDoc, /payment-context|step 3/i);
});
