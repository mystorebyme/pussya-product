#!/usr/bin/env node
/**
 * Payment flow e2e — owner ka exact flow:
 *
 *   place order → payment page (alag) → order number wahan → pending
 *   → customer mobile ke last 4 digit se claim → processing
 *   → admin UPI statement se verify → paid + order confirmed
 *   → tracking page par wahi status
 *
 * Server chahiye:  PORT=3100 ADMIN_API_TOKEN=dev-admin-token npm run start --workspace @noor/web
 * Chalao:          BASE_URL=http://127.0.0.1:3100 ADMIN_API_TOKEN=dev-admin-token node tests/e2e/payments.mjs
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
/** local run par default dev token; live (Vercel) par token na ho to admin steps skip */
const TOKEN =
  process.env.ADMIN_API_TOKEN ??
  (/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(BASE) ? "dev-admin-token" : "");
/** admin token na ho (public/live run) to admin wale steps skip — baaki flow test hota hai */
const CAN_ADMIN = TOKEN.length > 0;

let passed = 0;
const failures = [];

function check(name, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`  ok   ${name}`);
  } else {
    failures.push(`${name}${detail ? ` — ${detail}` : ""}`);
    console.log(`  FAIL ${name}${detail ? ` — ${detail}` : ""}`);
  }
}

const getJson = async (path) => {
  const response = await fetch(`${BASE}${path}`, { headers: { "cache-control": "no-store" } });
  let body = null;
  try {
    body = await response.json();
  } catch {
    body = null;
  }
  return { status: response.status, body };
};

const adminPatch = (path, payload) =>
  fetch(`${BASE}${path}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify(payload),
  });

// ── 1. ek available product chuno ────────────────────────────────────────────
const products = await getJson("/api/products?limit=24");
const list = products.body?.products ?? products.body?.items ?? products.body?.data ?? [];
const candidate = list.find((product) => {
  const sizes = product.sizes ?? [];
  return sizes.some((size) => product.sizePricing?.[size]?.available !== false) && product.inStock !== false;
});
check("catalogue has a buyable product", Boolean(candidate));
if (!candidate) {
  console.log("payments: cannot continue without a product");
  process.exit(1);
}
const size = candidate.sizes.find((option) => candidate.sizePricing?.[option]?.available !== false);

// ── 2. order place (server validation) ───────────────────────────────────────
const phone = "9876543210";
const create = await fetch(`${BASE}/api/orders`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    customerName: "Payment Test",
    email: "payment-test@example.com",
    phone,
    address: "12 Test Street",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    paymentMethod: "prepaid",
    items: [{ handle: candidate.handle, size, quantity: 1 }],
  }),
});
const order = await create.json();
check("order creates with a generated order number", create.status === 201 && /^NE-[A-Z0-9]{6,}$/.test(order.orderNumber ?? ""), `${create.status}`);
check("new order starts as payment pending", order.paymentStatus === "pending", order.paymentStatus);
check("new order is not confirmed before payment", order.status === "placed", order.status);

const number = order.orderNumber;

// ── 3. R50: the /pay route is a WhatsApp hand-off, not a payment page ────────
const payPage = await fetch(`${BASE}/orders/${number}/pay`);
const payHtml = await payPage.text();
check("hand-off page renders separately", payPage.status === 200, String(payPage.status));
check("hand-off page shows the order number", payHtml.includes(number));
check("hand-off page has the WhatsApp CTA", payHtml.includes('data-testid="confirm-whatsapp"'));
check("hand-off page has a wa.me link", /wa\.me\//.test(payHtml));
check("no UPI screen anywhere on the hand-off page", !payHtml.includes('data-testid="upi-payment"'));
check("no UPI deep link on the hand-off page", !/upi:\/\/pay/.test(payHtml));
check("no hardcoded payee", !/dhakadgourav/i.test(payHtml));
check("hand-off page has no invoice download", !/Download invoice/i.test(payHtml));

// ── 3a. the live order page shows the same WhatsApp block ────────────────────
const orderPageHtml = await (await fetch(`${BASE}/orders/${number}`)).text();
check("order page has the WhatsApp block", orderPageHtml.includes('data-testid="order-whatsapp-block"'));
check("order page CTA opens WhatsApp", /wa\.me\//.test(orderPageHtml));

// ── 3b. tracking — order number se page khulta hai (lowercase bhi) ───────────
const lower = await fetch(`${BASE}/orders/${number.toLowerCase()}`);
const lowerHtml = await lower.text();
check("tracking page opens for the order number (case-insensitive)", lower.status === 200 && lowerHtml.includes(number));
const missingOrder = await fetch(`${BASE}/orders/NE-NOTFOUND`);
const missingOrderHtml = await missingOrder.text();
check(
  "unknown order number shows a friendly not-found page",
  missingOrder.status === 404 && /Order nahi mila/i.test(missingOrderHtml),
  String(missingOrder.status),
);

// ── 3c. checkout funnel → DB + sheet ────────────────────────────────────────
const eventPost = await fetch(`${BASE}/api/checkout/events`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    event: "checkout.started",
    step: "details",
    items: [{ handle: candidate.handle, size, quantity: 2 }],
    subtotal: 99800,
    phone,
  }),
});
check("checkout event accepted", eventPost.status === 202, String(eventPost.status));
const rejected = await fetch(`${BASE}/api/checkout/events`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ event: "hack.attempt" }),
});
check("unknown checkout event rejected", rejected.status === 400, String(rejected.status));
if (CAN_ADMIN) {
  const funnelResponse = await fetch(`${BASE}/api/admin/checkout-events?limit=50`, {
    headers: { authorization: `Bearer ${TOKEN}`, "cache-control": "no-store" },
  });
  const funnel = { status: funnelResponse.status, body: await funnelResponse.json() };
  const events = funnel.body?.events ?? [];
  check(
    "checkout funnel is stored (admin API)",
    funnel.status === 200 && events.some((event) => event.event === "checkout.started"),
    JSON.stringify(funnel.body).slice(0, 120),
  );
}

// ── 4. status API (polling) ──────────────────────────────────────────────────
const status1 = await getJson(`/api/orders/${number}/payment`);
check("payment status API returns pending first", status1.body?.paymentStatus === "pending", status1.body?.paymentStatus);

// ── 5. customer claim (last 4 digit) → processing ───────────────────────────
// Owner rule: customer sirf mobile ke last 4 digit deta hai, UTR kabhi nahi.
const claimPost = (last4) =>
  fetch(`${BASE}/api/payments/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber: number, phoneLast4: last4 }),
  });

const wrongClaim = await claimPost("0000");
const wrongBody = await wrongClaim.json();
check("wrong last-4 is rejected (403)", wrongClaim.status === 403, `${wrongClaim.status} ${JSON.stringify(wrongBody).slice(0, 80)}`);

const claim = await claimPost(phone.slice(-4));
const claimBody = await claim.json();
check("correct last-4 claim is accepted", claim.status === 202 && claimBody.ok === true, `${claim.status} ${JSON.stringify(claimBody).slice(0, 120)}`);
check("claim response asks for no UTR", !/utr|reference/i.test(JSON.stringify(claimBody)));

const status2 = await getJson(`/api/orders/${number}/payment`);
check("status becomes processing (awaiting verification)", status2.body?.paymentStatus === "processing", status2.body?.paymentStatus);
check("order still not confirmed while payment is processing", status2.body?.status === "placed", status2.body?.status);

// admin verify ke liye reference: claim me UTR nahi aata, isliye synthetic
const utr = String(Date.now()).slice(-12);

// ── 6-8. admin wale steps (token chahiye) ───────────────────────────────────
let paidOk = false;
if (CAN_ADMIN) {
  const blocked = await adminPatch(`/api/admin/orders/${number}`, { action: "status", status: "packed" });
  const blockedBody = await blocked.json();
  check(
    "unpaid order cannot be packed",
    blocked.status === 409 && blockedBody.code === "payment_pending",
    `${blocked.status} ${blockedBody.code ?? ""}`,
  );

  const paid = await adminPatch(`/api/admin/orders/${number}`, {
    action: "payment",
    reference: utr,
    amount: order.total,
    note: "e2e",
  });
  const paidBody = await paid.json();
  check("admin can mark payment verified", paid.ok, String(paid.status));
  check("payment is paid in DB", paidBody.order?.paymentStatus === "paid", paidBody.order?.paymentStatus);
  check("order becomes confirmed only after payment", paidBody.order?.status === "confirmed", paidBody.order?.status);
  const status3 = await getJson(`/api/orders/${number}/payment`);
  check("status API reports paid + confirmed", status3.body?.paymentStatus === "paid" && status3.body?.status === "confirmed");
  paidOk = status3.body?.paymentStatus === "paid";

  const payAfter = await fetch(`${BASE}/orders/${number}/pay`, { redirect: "manual" });
  check("paid order skips the payment page", payAfter.status === 307 || payAfter.status === 308, String(payAfter.status));

  // ── 8b. tracking lifecycle: packed → courier/AWB → shipped ────────────────
  const packed = await adminPatch(`/api/admin/orders/${number}`, { action: "status", status: "packed" });
  check("paid order can be packed", packed.ok, String(packed.status));
  // AWB gandagi (spaces + lowercase) bhej rahe hain — server saaf karta hai
  const trackingSave = await adminPatch(`/api/admin/orders/${number}`, {
    action: "tracking",
    courier: "Delhivery",
    awb: " 1abc 2345 678 ",
  });
  const trackingBody = await trackingSave.json();
  const savedTracking = trackingBody.order?.tracking ?? {};
  check("courier + AWB save hota hai", trackingSave.ok && savedTracking.courier === "Delhivery", String(trackingSave.status));
  check("AWB clean + uppercase hota hai", savedTracking.awb === "1ABC2345678", String(savedTracking.awb));
  check(
    "tracking link khud ban jaata hai (admin URL ke bina)",
    /delhivery\.com\/track\/package\/1ABC2345678/.test(String(savedTracking.url)),
    String(savedTracking.url),
  );

  const shipped = await adminPatch(`/api/admin/orders/${number}`, { action: "status", status: "shipped" });
  check("packed order can be shipped", shipped.ok, String(shipped.status));

  const trackPage = await fetch(`${BASE}/orders/${number}`);
  const trackHtml = await trackPage.text();
  check("tracking page shows the courier", /data-testid="tracking-courier"[^>]*>Delhivery/.test(trackHtml));
  check("tracking page shows the AWB", /data-testid="tracking-awb"[^>]*>1ABC2345678/.test(trackHtml));
  const courierLink = /<a[^>]*data-testid="track-courier"[^>]*>/.exec(trackHtml)?.[0] ?? "";
  check(
    "tracking page has a working courier link",
    courierLink.includes("https://www.delhivery.com/track/package/1ABC2345678"),
    courierLink.slice(0, 120),
  );
  check("tracking page lists the update history", trackHtml.includes('data-testid="tracking-updates"'));
  check("tracking page shows the shipped step", /data-testid="tracking-status"[^>]*>Shipped/.test(trackHtml));
  check("customer phone is masked on the tracking page", !trackHtml.includes(`+91 ${phone}`));
} else {
  console.log("  skip admin-only checks (no ADMIN_API_TOKEN)");
}

// ── 8c. cancelled order par saaf banner (aadha timeline nahi) ───────────────
if (CAN_ADMIN) {
  const cancelPhone = "9876500011";
  const cancelCreate = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      customerName: "Cancel Test",
      email: "cancel-test@example.com",
      phone: cancelPhone,
      address: "4 Cancel Street",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      paymentMethod: "prepaid",
      items: [{ handle: candidate.handle, size, quantity: 1 }],
    }),
  });
  const cancelOrder = await cancelCreate.json();
  const cancelNumber = cancelOrder.orderNumber;
  check("cancel-test order bana", cancelCreate.status === 201 && Boolean(cancelNumber), String(cancelCreate.status));

  const cancelled = await adminPatch(`/api/admin/orders/${cancelNumber}`, { action: "status", status: "cancelled" });
  const cancelBody = await cancelled.json();
  check("placed → cancelled allowed hai", cancelled.ok && cancelBody.order?.status === "cancelled", String(cancelled.status));

  const cancelPage = await fetch(`${BASE}/orders/${cancelNumber}`);
  const cancelHtml = await cancelPage.text();
  check("cancelled order par stop banner dikhta hai", cancelHtml.includes('data-testid="tracking-stopped"'));
  check("cancelled order par galat progress steps nahi", !/data-testid="tracking-status"[^>]*>Shipped/.test(cancelHtml));

  const badTransition = await adminPatch(`/api/admin/orders/${cancelNumber}`, { action: "status", status: "shipped" });
  check("cancelled order aage nahi badh sakta (409)", badTransition.status === 409, String(badTransition.status));
}

// ── 9. order page = tracking, same status ───────────────────────────────────
const orderPage = await fetch(`${BASE}/orders/${number}`);
const orderHtml = await orderPage.text();
check("order page opens (tracking works)", orderPage.status === 200, String(orderPage.status));
check("order page shows the order number", orderHtml.includes(number));
check(
  "order page shows the WhatsApp block (R50)",
  orderHtml.includes('data-testid="order-whatsapp-block"'),
);
check("order page has the tracking timeline", orderHtml.includes('data-testid="order-tracking"'));

// ── 10. failed payment bhi DB me save hota hai ──────────────────────────────
const create2 = await fetch(`${BASE}/api/orders`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({
    customerName: "Failure Test",
    email: "payment-fail@example.com",
    phone,
    address: "9 Test Street",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
    paymentMethod: "prepaid",
    items: [{ handle: candidate.handle, size, quantity: 1 }],
  }),
});
const order2 = await create2.json();
const failBody = await (
  await fetch(`${BASE}/api/payments/failed`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber: order2.orderNumber, phoneLast4: phone.slice(-4), reason: "e2e failure" }),
  })
).json();
check("failed payment is recorded", failBody.ok === true, JSON.stringify(failBody).slice(0, 120));
const statusFail = await getJson(`/api/orders/${order2.orderNumber}/payment`);
check("failed status saved in DB", statusFail.body?.paymentStatus === "failed", statusFail.body?.paymentStatus);
check("failed order still unconfirmed", statusFail.body?.status === "placed", statusFail.body?.status);

// ── 11. unknown order = clean 404 ───────────────────────────────────────────
const missing = await fetch(`${BASE}/orders/NE-DOESNOTEXIST`);
check("unknown order shows the not-found page", missing.status === 404, String(missing.status));
const missingPay = await getJson("/api/orders/NE-DOESNOTEXIST/payment");
check("unknown order payment API is 404", missingPay.status === 404, String(missingPay.status));

console.log(`\npayments: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
