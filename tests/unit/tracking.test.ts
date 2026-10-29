/**
 * Tracking ka pure logic — courier link, 5-step timeline, update history.
 *
 * Owner rule (R31): "tracking perfect work karni chahiye" — matlab AWB se seedha
 * courier ka tracking page khule, har step ki date dikhe, cancelled/returned par
 * aadha-adhoora timeline na dikhe, aur admin ka comment history me rahe.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  cleanAwb,
  courierTrackingUrl,
  estimatedDelivery,
  knownCouriers,
  orderTrackingUrl,
  STATUS_LABELS,
  statusLabel,
  TRACKING_STEPS,
  trackingSteps,
  trackingTimeLabel,
  trackingUpdates,
} from "../../apps/web/src/lib/tracking";

const baseOrder = {
  createdAt: "2026-10-20T05:00:00.000Z",
  status: "shipped" as const,
  audit: [
    { at: "2026-10-20T05:00:00.000Z", actor: "customer", action: "order.placed" },
    { at: "2026-10-20T06:10:00.000Z", actor: "admin", action: "payment.verified" },
    { at: "2026-10-20T06:10:00.000Z", actor: "admin", action: "order.status.confirmed" },
    { at: "2026-10-21T07:30:00.000Z", actor: "admin", action: "order.status.packed", meta: { note: "Packing ho gayi" } },
    { at: "2026-10-22T09:00:00.000Z", actor: "admin", action: "order.status.shipped" },
    {
      at: "2026-10-22T09:01:00.000Z",
      actor: "admin",
      action: "order.tracking_updated",
      meta: { courier: "Delhivery", awb: "1ABC2345678", url: null },
    },
  ],
  tracking: {
    courier: "Delhivery",
    awb: "1ABC2345678",
    url: null,
    shippedAt: "2026-10-22T09:00:00.000Z",
    deliveredAt: null,
    updatedAt: "2026-10-22T09:01:00.000Z",
    updatedBy: "admin",
  },
  statusNote: { text: "Aaj shaam tak deliver ho jaayega", at: "2026-10-23T04:00:00.000Z", by: "admin", status: "shipped" },
};

test("AWB saaf hota hai (space, dash, lowercase)", () => {
  assert.equal(cleanAwb(" 1abc 2345-678 "), "1ABC2345-678");
  assert.equal(cleanAwb("AWB#123!!"), "AWB123");
  assert.equal(cleanAwb(""), "");
  assert.equal(cleanAwb(null), "");
  assert.equal(cleanAwb("x".repeat(60)).length, 32);
});

test("courier naam + AWB se tracking link banta hai", () => {
  assert.match(String(courierTrackingUrl("Delhivery", "12345")), /delhivery\.com\/track\/package\/12345$/);
  assert.match(String(courierTrackingUrl("blue dart", "999")), /bluedart\.com/);
  assert.match(String(courierTrackingUrl("BlueDart", "999")), /bluedart\.com/);
  assert.match(String(courierTrackingUrl("DTDC", "A1")), /dtdc\.in/);
  assert.match(String(courierTrackingUrl("Speed Post", "EE1")), /indiapost\.gov\.in/);
  assert.match(String(courierTrackingUrl("Ekart Logistics", "F1")), /ekartlogistics\.com/);
  assert.match(String(courierTrackingUrl("XpressBees", "X1")), /xpressbees\.com/);
  assert.match(String(courierTrackingUrl("Shadowfax", "S1")), /shadowfax/);
  assert.match(String(courierTrackingUrl("Ecom Express", "E1")), /ecomexpress\.in/);
  assert.match(String(courierTrackingUrl("Shiprocket", "SR1")), /shiprocket\.co/);
  assert.match(String(courierTrackingUrl("The Professional Couriers", "P1")), /tpcindia\.com/);
  assert.match(String(courierTrackingUrl("Amazon", "AM1")), /track\.amazon\.in/);
  assert.match(String(courierTrackingUrl("FedEx", "FX1")), /fedex\.com/);
  assert.match(String(courierTrackingUrl("DHL", "DH1")), /dhl\.com/);
});

test("courier/AWB na ho ya naam anjaan ho to jhoota link nahi", () => {
  assert.equal(courierTrackingUrl("Delhivery", ""), null);
  assert.equal(courierTrackingUrl("", "12345"), null);
  assert.equal(courierTrackingUrl("Local Bicycle Courier", "12345"), null);
  assert.equal(courierTrackingUrl(null, null), null);
});

test("admin ka diya URL pehle chalta hai, warna courier se bana link", () => {
  assert.equal(
    orderTrackingUrl({ tracking: { ...baseOrder.tracking, url: "https://custom.example/track/1" } }),
    "https://custom.example/track/1",
  );
  assert.match(String(orderTrackingUrl({ tracking: baseOrder.tracking })), /delhivery\.com/);
  assert.equal(orderTrackingUrl({ tracking: null }), null);
  assert.equal(orderTrackingUrl({ tracking: { ...baseOrder.tracking, courier: "Unknown", url: "javascript:alert(1)" } }), null);
});

test("known couriers list me wo sab hai jinke link bante hain", () => {
  const list = knownCouriers();
  assert.ok(list.includes("Delhivery"));
  assert.ok(list.includes("Blue Dart"));
  for (const name of list) {
    assert.ok(courierTrackingUrl(name, "TEST123"), `${name} ka tracking link nahi bana`);
  }
});

test("5 step timeline — dates aur done flags sahi", () => {
  const { steps, stopped } = trackingSteps(baseOrder as never);
  assert.equal(stopped, null);
  assert.equal(steps.length, TRACKING_STEPS.length);
  assert.deepEqual(
    steps.map((step) => step.done),
    [true, true, true, true, false],
  );
  assert.equal(steps[0]?.at, "2026-10-20T05:00:00.000Z");
  assert.equal(steps[2]?.note, "Packing ho gayi");
  assert.equal(steps[4]?.at, null);
});

test("delivered order me saare step done", () => {
  const { steps } = trackingSteps({
    ...baseOrder,
    status: "delivered",
    audit: [...baseOrder.audit, { at: "2026-10-24T09:00:00.000Z", actor: "admin", action: "order.status.delivered" }],
  } as never);
  assert.ok(steps.every((step) => step.done));
  assert.equal(steps[4]?.at, "2026-10-24T09:00:00.000Z");
});

test("cancelled order par stopped set hota hai aur current step -1", () => {
  const { stopped, currentStep, steps } = trackingSteps({
    ...baseOrder,
    status: "cancelled",
    audit: [...baseOrder.audit, { at: "2026-10-23T09:00:00.000Z", actor: "admin", action: "order.status.cancelled" }],
  } as never);
  assert.equal(stopped, "cancelled");
  assert.equal(currentStep, -1);
  // jo step mil chuke the wo done rehte hain (customer ko galat lagta hai warna)
  assert.equal(steps[0]?.done, true);
  assert.equal(steps[4]?.done, false);
});

test("returned order bhi stopped hota hai", () => {
  const { stopped } = trackingSteps({ ...baseOrder, status: "returned", audit: [] } as never);
  assert.equal(stopped, "returned");
});

test("audit khaali ho to bhi placed ka time createdAt se aata hai", () => {
  const { steps } = trackingSteps({ status: "placed", audit: [], createdAt: "2026-10-01T00:00:00.000Z", tracking: null } as never);
  assert.equal(steps[0]?.done, true);
  assert.equal(steps[0]?.at, "2026-10-01T00:00:00.000Z");
});

test("update history newest pehle, note aur courier detail ke saath", () => {
  const updates = trackingUpdates(baseOrder as never);
  assert.ok(updates.length >= 4);
  const times = updates.map((update) => update.at);
  assert.deepEqual(times, [...times].sort().reverse(), "newest pehle hona chahiye");

  const note = updates.find((update) => update.kind === "note");
  assert.equal(note?.text, "Aaj shaam tak deliver ho jaayega");

  const courierUpdate = updates.find((update) => update.kind === "tracking");
  assert.equal(courierUpdate?.text, "Delhivery · AWB 1ABC2345678");

  const statuses = updates.map((update) => update.label);
  assert.ok(statuses.includes("Packed"));
  assert.ok(statuses.includes("Shipped"));
  assert.ok(statuses.includes("Payment received"));
});

test("update history limit lagta hai (text wall nahi)", () => {
  assert.ok(trackingUpdates(baseOrder as never, 2).length <= 2);
});

test("status label aur time label safe hain", () => {
  assert.equal(statusLabel("shipped"), "Shipped");
  assert.equal(statusLabel("kuch-naya"), "kuch-naya");
  assert.equal(Object.keys(STATUS_LABELS).length >= 7, true);
  assert.equal(trackingTimeLabel(null), "");
  assert.equal(trackingTimeLabel("not-a-date"), "");
  assert.ok(trackingTimeLabel("2026-10-22T09:00:00.000Z").length > 5);
});

test("estimated delivery placed + 6 din", () => {
  const label = estimatedDelivery("2026-10-20T05:00:00.000Z");
  assert.ok(label.includes("26"), label);
  assert.equal(estimatedDelivery("garbage"), "");
});
