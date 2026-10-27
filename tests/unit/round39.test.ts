/**
 * Round 39 (27 Oct 2026) — owner, live order ke baad:
 *
 *  1. "Placed · 27 Oct, 2:16 am — **yha timezone india ka chalna chiye**."
 *     (order 7:46 IST ka tha; site/admin Vercel ke UTC server par render hoti
 *     thi, isliye 5:30 peeche.)
 *  2. "Jis box me 'AWB number yahan aur WhatsApp par turant dikh jaayega…'
 *     likha hai — **yha pr sheet se kuch bi likha ja sakta hai**, default
 *     'Waiting for confirmation', aur **isko every order ke liye sheet se
 *     change kiya ja sakta hai**."
 *  3. "Abhi ki **final sheet Vercel se live hai — dekh lena**; aur vaha saare
 *     secret/variable update kar dena, check karna updated hai ki nahi."
 *
 * Jawab:
 *  • har date formatter ab `Asia/Kolkata` pin karta hai (web + admin).
 *  • sheet ke Orders tab me naya `Admin Note` column (script r39-1 auto-add
 *    karta hai) → timeline response `adminNote` → site ka note-box
 *    (`order-note-box`): sheet text, warna default "Waiting for confirmation".
 *  • final sheet id `1b8DReh2…` code + selfcheck + Vercel env
 *    (SHEET_EXPECTED_ID) me — `/api/sheet-health` par idMatch:true.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { formatDate, STORE_TIME_ZONE } from "../../apps/web/src/lib/format";
import { estimatedDelivery, trackingTimeLabel } from "../../apps/web/src/lib/tracking";
import { mergeSheetTracking, type SheetTracking } from "../../apps/web/src/lib/sheet-merge";
import { dateTime as adminDateTime, dateOnly as adminDateOnly } from "../../apps/admin/src/lib/format";
import type { Order } from "@noor/types";

const ROOT = path.join(__dirname, "..", "..");
const read = (rel: string) => fs.readFileSync(path.join(ROOT, rel), "utf8");

/** Owner ki FINAL sheet (27 Oct) — script + site + selfcheck sab isi par. */
const FINAL_SHEET_ID = "1b8DReh2RF5JeOSJeknWmH1KSE1RZgmBjatgkCDS9w_4";
const OLD_SHEET_ID = "1k8fsea04WpbrGjiyXuDrrS2Eewt9W7wx9X2lUQc5qMo";

function baseOrder(overrides: Partial<Order> = {}): Order {
  return {
    id: "ord_1",
    orderNumber: "NE-TEST0001",
    createdAt: "2026-10-26T20:30:00.000Z",
    customerName: "Test Customer",
    email: "test@example.com",
    phone: "9876543210",
    address: "12, test street, area",
    city: "Alwar",
    state: "Rajasthan",
    pincode: "301001",
    notes: null,
    items: [],
    subtotal: 49900,
    discount: 0,
    shipping: 0,
    total: 49900,
    couponCode: null,
    paymentMethod: "prepaid",
    paymentStatus: "pending",
    status: "placed",
    audit: [],
    ...overrides,
  };
}

function sheet(overrides: Partial<SheetTracking> = {}): SheetTracking {
  return {
    orderNumber: "NE-TEST0001",
    status: "placed",
    step: 0,
    steps: [],
    paymentStatus: "",
    courier: "",
    awb: "",
    trackingUrl: "",
    note: "",
    updates: [],
    readAt: Date.now(),
    ...overrides,
  };
}

/* ── 1. India timezone ─────────────────────────────────────────────────────── */

test("R39: 26 Oct 20:30 UTC = 27 Oct 2:00 am IST — wahi order owner ka", () => {
  assert.equal(STORE_TIME_ZONE, "Asia/Kolkata");
  // UTC me ye 26 Oct hota; India me 27 Oct, 2:00 am.
  assert.match(formatDate("2026-10-26T20:30:00.000Z"), /27 Oct 2026/);
  const label = trackingTimeLabel("2026-10-26T20:30:00.000Z");
  assert.match(label, /27 Oct/);
  assert.match(label, /2:00 am/);
  // owner ka asli case: 26 Oct 21:16 UTC → 27 Oct 2:46 am IST (7:46 IST subah ka
  // order UTC me "2:16 am" dikh raha tha — IST me sahi 7:46 am dikhega)
  assert.match(trackingTimeLabel("2026-10-27T02:16:00.000Z"), /7:46 am/);
  // ETA: +6 din IST me (UTC-date arithmetic wala 1-din off-by-one bhi gaya)
  assert.equal(estimatedDelivery("2026-10-26T20:30:00.000Z"), "2 November");
  // admin ke formatter bhi IST
  assert.match(adminDateTime("2026-10-26T20:30:00.000Z"), /27 Oct/);
  assert.match(adminDateTime("2026-10-26T20:30:00.000Z"), /2:00 am/);
  assert.match(adminDateOnly("2026-10-26T20:30:00.000Z"), /27 Oct 2026/);
});

test("R39: har date formatter source me timezone pin karta hai", () => {
  assert.match(read("apps/web/src/lib/format.ts"), /timeZone: STORE_TIME_ZONE/);
  const tracking = read("apps/web/src/lib/tracking.ts");
  assert.equal(tracking.match(/timeZone: STORE_TIME_ZONE/g)?.length, 2, "time label + ETA");
  assert.match(read("apps/web/src/lib/invoice-pdf.ts"), /timeZone: "Asia\/Kolkata"/);
  const adminFormat = read("apps/admin/src/lib/format.ts");
  assert.equal(adminFormat.match(/timeZone: STORE_TIME_ZONE/g)?.length, 2, "dateTime + dateOnly");
  assert.match(read('apps/admin/src/app/(admin)/invoices/[number]/page.tsx'), /timeZone: STORE_TIME_ZONE/);
  // invoices list + product page ab central helpers use karte hain
  assert.match(read("apps/admin/src/app/(admin)/invoices/page.tsx"), /dateOnly\(invoice\.createdAt\)/);
  assert.match(read("apps/admin/src/app/(admin)/products/[id]/page.tsx"), /dateTime\(stats\.lastPublishedAt\)/);
});

/* ── 2. note-box sheet se (default: Waiting for confirmation) ──────────────── */

test("R39: sheet ka Admin Note status merge jeete ya na jeete — hamesha dikhta hai", () => {
  // placed order + placed sheet — status merge ho ya na ho, adminNote hamesha dikhega
  const merged = mergeSheetTracking(baseOrder(), sheet({ adminNote: "Payment aate hi parcel niklega" }));
  assert.equal(merged.statusNote?.text, "Payment aate hi parcel niklega");
  assert.equal(merged.statusNote?.by, "sheet");
  assert.equal(merged.status, "placed", "status wahi (sheet aage nahi)");

  // adminNote + note dono → adminNote jeetta (owner ka apna message)
  const both = mergeSheetTracking(baseOrder(), sheet({ note: "customer note", adminNote: "owner message" }));
  assert.equal(both.statusNote?.text, "owner message");

  // adminNote khaali → purana behaviour (note wins par statusNote banta hai)
  const noAdmin = mergeSheetTracking(baseOrder(), sheet({ note: "customer note" }));
  assert.equal(noAdmin.statusNote?.text, "customer note");

  // sheet hi null → order untouched
  assert.equal(mergeSheetTracking(baseOrder(), null).statusNote ?? null, null);
});

test("R39: note-box order page par — sheet text warna default; purana static AWB waada gaya", () => {
  const page = read("apps/web/src/app/orders/[orderNumber]/page.tsx");
  assert.match(page, /data-testid="order-note-box"/);
  assert.match(page, /Waiting for confirmation/, "owner ka default text");
  assert.match(page, /noteText/, "box sheet/admin note se banta hai");
  assert.ok(
    !page.includes("AWB number yahan aur WhatsApp par turant dikh jaayega"),
    "static AWB placeholder hat gaya — ab sheet se likha jaata hai",
  );
  // fetch layer adminNote parse karti hai
  assert.match(read("apps/web/src/lib/sheet-tracking.ts"), /adminNote: String\(payload\.adminNote \?\? ""\)/);
});

/* ── 3. Apps Script r39-1 + final sheet id ─────────────────────────────────── */

test("R39: script r39-1 — Admin Note column, timeline adminNote, onEdit, /exec panel", () => {
  const gs = read("scripts/google-apps-script/noor-sheets.gs");
  assert.match(gs, /var CODE_VERSION = 'r39-1';/);
  assert.match(gs, /'Tracking URL', 'Notes', 'Admin Note', 'Source', 'Device',/, "Orders headers me Admin Note");
  assert.match(gs, /adminNote: adminNote,/, "timeline response me adminNote");
  assert.match(gs, /row\['Admin Note'\]/, "timeline Admin Note column padhta hai");
  assert.match(gs, /column === 'Admin Note'/, "onEdit Admin Note branch");
  assert.match(gs, /order\.admin_note/, "note edit ka event row");
  assert.match(gs, /function controlPanel_/, "plain /exec → HTML panel");
  assert.match(gs, /HtmlService\.createHtmlOutput/, "panel HTML deta hai");
  assert.match(gs, /if \(!action\) return controlPanel_\(\);/, "action ke bina panel");
  assert.match(gs, /Waiting for confirmation/, "panel hint me default text");
  // settings ke default urls — panel ke buttons sheet se override ho sakte hain
  assert.match(gs, /\['store_url', 'https:\/\/noorethnicwear\.in'\]/);
  assert.match(gs, /\['admin_url', 'https:\/\/admin\.noorethnicwear\.in'\]/);
});

test("R39: sheet id code me hardcoded nahi — sirf env se", () => {
  for (const rel of [
    "scripts/google-apps-script/noor-sheets.gs",
    "apps/web/src/lib/google-sheets.ts",
    "scripts/sheets-selfcheck.mjs",
  ]) {
    const src = read(rel);
    // koi asli sheet id code me nahi (owner apni sheet banata hai)
    assert.ok(!/[a-zA-Z0-9_-]{40,}/.test(src.replace(/^\s*\*.*$/gm, "")), `${rel} me lambi sheet-id jaisi string`);
  }
  assert.match(read("apps/web/src/lib/google-sheets.ts"), /SHEET_EXPECTED_ID/);
  assert.match(read("apps/web/src/lib/google-sheets.ts"), /export const EXPECTED_SHEET_ID = ""/);
});

test("R39: sheet-health — version gate r39, probe-timeout akela failure nahi, warnings alag", () => {
  const route = read("apps/web/src/app/api/sheet-health/route.ts");
  assert.match(route, /major < 39/, "purana script version flag hota hai");
  assert.match(route, /probeTimedOut/, "timeout detect hota hai");
  assert.match(route, /pipelineAlive/, "settings+write chal rahe ho to timeout sirf warning");
  assert.match(route, /warnings,/, "payload me warnings");
  assert.match(route, /ok: help\.length === 0/, "ok sirf help (failures) se banta hai");
});
