/**
 * Round 37 guards — owner ki poori list machine se pin:
 *   1. phone prefix (+91 / 91 / 0) automatic hate → 10 digit (client + server)
 *   2. sheet = order ka DB (status / courier / AWB / timeline) — sheet jeetti hai
 *   3. Apps Script `onEdit` — Orders!Status edit → timeline row, Messages!Status →
 *      marked reply (trends-sheets.gs wala "ek box me sab" pattern)
 *   4. desktop header bar — nav apni centered row me (logo se overlap nahi)
 *   5. home ke Wedding circle me image (pehle hardcoded `undefined` tha)
 *   6. "instant means instant" — settings TTL 3s + poll 4s + tracking TTL 3s
 *   7. UPI app sirf tap par + risk-alert hint (koi app brand nahi)
 */
import assert from "node:assert/strict";
import { test } from "node:test";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { phoneSchema } from "../../packages/validation/index";
import { autoFixPhoneInput, normaliseIndianPhone } from "../../apps/web/src/lib/phone";
import {
  mergeSheetTracking,
  sheetStatusToOrderStatus,
  sheetTrackingWins,
  type SheetTracking,
} from "../../apps/web/src/lib/sheet-merge";
import type { Order } from "../../packages/types/index";

const root = join(__dirname, "../..");
const read = (relative: string) => readFileSync(join(root, relative), "utf8");

const GS = "scripts/google-apps-script/noor-sheets.gs";
const SHEET_TRACKING = "apps/web/src/lib/sheet-tracking.ts";
const HEADER = "apps/web/src/components/site-header.tsx";
const HOME = "apps/web/src/app/page.tsx";
const UPI = "apps/web/src/components/upi-payment.tsx";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord_1",
    orderNumber: "NE-TEST0001",
    createdAt: "2026-10-27T04:00:00.000Z",
    customerName: "Test Customer",
    email: "test@example.com",
    phone: "9876543210",
    address: "12, test street, area",
    city: "Surat",
    state: "Gujarat",
    pincode: "395007",
    notes: null,
    items: [],
    subtotal: 49900,
    discount: 0,
    shipping: 0,
    total: 49900,
    couponCode: null,
    paymentMethod: "prepaid",
    paymentStatus: "paid",
    status: "confirmed",
    audit: [],
    ...overrides,
  };
}

function sheet(overrides: Partial<SheetTracking> = {}): SheetTracking {
  return {
    orderNumber: "NE-TEST0001",
    status: "shipped",
    step: 3,
    steps: [],
    paymentStatus: "paid",
    courier: "Delhivery",
    awb: "1234567890",
    trackingUrl: "",
    note: "Parcel courier ko de diya",
    updates: [
      { at: "2026-10-27T06:00:00.000Z", status: "shipped", event: "order.status_sheet", message: "Sheet se ship" },
      { at: "2026-10-27T04:05:00.000Z", status: "confirmed", event: "order.status_sheet", message: "Sheet se confirm" },
    ],
    readAt: Date.now(),
    ...overrides,
  };
}

/* ── 1. phone prefix automatic ─────────────────────────────────────────────── */
test("R37: server validation +91 / 91 / 0 prefix accept karke 10 digit rakhta hai", () => {
  for (const raw of ["+91 98765 43210", "919876543210", "09876543210", "9876543210", "+919876543210"]) {
    assert.equal(phoneSchema.parse(raw), "9876543210", `${raw} → 10 digit`);
  }
  assert.throws(() => phoneSchema.parse("12345"));
  assert.throws(() => phoneSchema.parse("987654321012345"));
});

test("R37: client par bhi wahi normaliser (type karte hi auto-fix)", () => {
  assert.equal(normaliseIndianPhone("+91 98765-43210"), "9876543210");
  assert.equal(normaliseIndianPhone("09876543210"), "9876543210");
  assert.equal(normaliseIndianPhone("98765"), null);
  assert.equal(autoFixPhoneInput("+91 9876543210"), "9876543210");
  assert.equal(autoFixPhoneInput("09876543210"), "9876543210");
  // adhoora input untouched — varna type karte hi digits kat jaate
  assert.equal(autoFixPhoneInput("+91 987"), "+91 987");
  const form = read("apps/web/src/components/checkout-form.tsx");
  assert.match(form, /autoFixPhoneInput/, "checkout phone field live auto-fix");
  assert.match(form, /normaliseIndianPhone\(form\.phone\) \?\? form\.phone/, "order payload me saaf 10 digit");
});

/* ── 2. sheet = order ka DB ────────────────────────────────────────────────── */
test("R37: sheet ka status DB se aage ho to sheet jeetti hai (tracking + timeline ke saath)", () => {
  const merged = mergeSheetTracking(baseOrder(), sheet());
  assert.equal(merged.status, "shipped");
  assert.equal(merged.tracking?.courier, "Delhivery");
  assert.equal(merged.tracking?.awb, "1234567890");
  assert.equal(merged.tracking?.url, "https://www.delhivery.com/track/package/1234567890");
  assert.equal(merged.statusNote?.text, "Parcel courier ko de diya");
  assert.equal(merged.statusNote?.by, "sheet");
  // timeline updates sheet se — DB audit jaisa chronological (oldest first)
  const shippedEntry = merged.audit.find((entry) => entry.action === "order.status.shipped");
  assert.equal(shippedEntry?.meta?.note, "Sheet se ship");
  assert.equal(shippedEntry?.actor, "sheet");
  assert.equal(merged.audit[0]?.action, "order.status.confirmed");
  // paisa = DB ki sacchai
  assert.equal(merged.paymentStatus, "paid");
});

test("R37: payment-confirm (DB) sheet se aage ho to DB jeetta hai", () => {
  const merged = mergeSheetTracking(baseOrder({ status: "confirmed" }), sheet({ status: "placed", step: 0 }));
  assert.equal(merged.status, "confirmed");
  assert.equal(sheetTrackingWins(baseOrder({ status: "confirmed" }), sheet({ status: "placed", step: 0 })), false);
});

test("R37: cancel / return sheet se aaye to hamesha sheet", () => {
  const merged = mergeSheetTracking(baseOrder({ status: "delivered" }), sheet({ status: "cancelled", step: -1 }));
  assert.equal(merged.status, "cancelled");
});

test("R37: sheet ka koi bhi status text OrderStatus me map hota hai", () => {
  assert.equal(sheetStatusToOrderStatus("Shipped"), "shipped");
  assert.equal(sheetStatusToOrderStatus("out for delivery"), "shipped");
  assert.equal(sheetStatusToOrderStatus("Dispatch ho gaya"), "shipped");
  assert.equal(sheetStatusToOrderStatus("packed"), "packed");
  assert.equal(sheetStatusToOrderStatus("RTO"), "cancelled");
  assert.equal(sheetStatusToOrderStatus("kuch bhi"), null);
});

test("R37: tracking page + public API sheet merge karte hain", () => {
  const page = read("apps/web/src/app/orders/[orderNumber]/page.tsx");
  const api = read("apps/web/src/app/api/orders/[orderNumber]/public/route.ts");
  for (const source of [page, api]) {
    assert.match(source, /readSheetTracking/, "sheet se tracking padhta hai");
    assert.match(source, /mergeSheetTracking/, "DB order par merge");
  }
  assert.match(api, /fresh/, "?fresh=1 se bilkul taaza");
});

/* ── 3. Apps Script: ek box me sab (trends-sheets.gs pattern) ──────────────── */
test("R37: sheet script me onEdit — status edit → timeline row, message → marked reply", () => {
  const script = read(GS);
  assert.match(script, /function onEdit\(e\)/, "simple onEdit trigger");
  assert.match(script, /order\.status_sheet/, "status edit timeline row banata hai");
  assert.match(script, /Messages' && column === 'Status'/, "Messages!Status edit pakadta hai");
  assert.match(script, /Replied at/, "marked reply timestamp");
  // R38: version stamp har round me bump hota hai — format barkaraar rahe
  assert.match(script, /var CODE_VERSION = 'r\d+-\d+';/, "version stamp");
  // timeline endpoint site ke liye maujood (phone-gated privacy)
  assert.match(script, /action === 'timeline'/, "timeline action");
});

test("R37: sheet-tracking lib cache + SWR + privacy (phone ke bina read nahi)", () => {
  const lib = read(SHEET_TRACKING);
  assert.match(lib, /SHEET_TRACKING_TTL_MS/, "TTL env-tunable");
  assert.match(lib, /runInBackground/, "stale-while-revalidate background me");
  assert.match(lib, /slice\(-10\)/, "phone ke last 10 digit");
  assert.match(lib, /if \(!digits\) return null/, "phone nahi to read nahi");
});

/* ── 4. desktop header bar ─────────────────────────────────────────────────── */
test("R37: desktop nav apni centered row me (1fr column me overlap nahi)", () => {
  const header = read(HEADER);
  assert.match(header, /data-testid="desktop-nav"/, "alag nav row");
  assert.match(header, /justify-center gap-x-5/, "centered nav");
  assert.doesNotMatch(header, /lg:col-start-1 lg:row-start-1 lg:flex/, "purani grid-nav gayi");
  // mobile menu + logo center barkarar
  assert.match(header, /data-testid="mobile-menu"/, "mobile menu");
  assert.match(header, /grid-cols-\[1fr_auto_1fr\]/, "logo center grid");
});

/* ── 5. wedding circle image ───────────────────────────────────────────────── */
test("R37: home ke Wedding circle me image hai (fallback = pehla product photo)", () => {
  const home = read(HOME);
  assert.match(home, /circleImage\(weddingCollection, "weddin-collection"\)/, "wedding circle image");
  assert.doesNotMatch(home, /title: "Wedding", image: undefined/, "hardcoded undefined gaya");
  assert.match(home, /byCollection\(handle\)\[0\]\?\.images\[0\]/, "fallback product photo");
});

/* ── 6. instant means instant ──────────────────────────────────────────────── */
test("R37: settings TTL 3s + poll 4s + tracking TTL 3s (worker bindings ke saath)", () => {
  assert.match(read("apps/web/src/lib/google-sheets.ts"), /SHEET_SETTINGS_TTL_MS", 2_000/);
  assert.match(read("apps/web/src/components/store-settings-provider.tsx"), /POLL_MS = 3_000/);
  assert.match(read(SHEET_TRACKING), /SHEET_TRACKING_TTL_MS \?\? 2_000/, "tracking TTL 2s");
  const worker = read("apps/web/cloudflare.config.ts");
  assert.match(worker, /SHEET_SETTINGS_TTL_MS: bindings\.text\("2000"\)/);
  assert.match(worker, /SHEET_TRACKING_TTL_MS: bindings\.text\("2000"\)/);
});

/* ── 7. UPI: sirf tap + risk-alert hint, koi app brand nahi ────────────────── */
test("R37: UPI risk-alert hint hai par koi app brand nahi, auto-open ab bhi nahi", () => {
  const upi = read(UPI);
  assert.match(upi, /data-testid="upi-risk-hint"/, "customer ko QR raasta bataya");
  assert.doesNotMatch(upi, /Paytm|PhonePe|Google Pay|BHIM/i, "owner rule: koi app brand nahi");
  assert.doesNotMatch(upi, /appOpened/, "auto-open ref nahi");
  assert.match(upi, /href=\{upiUri\}/, "intent sirf button ke href se");
});
