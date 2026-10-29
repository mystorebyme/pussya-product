#!/usr/bin/env node
/**
 * R23 e2e — owner ke 5 asks ka live proof:
 *
 *  1. Galat state (pincode ke state se alag) → order block, sahi state bataye.
 *  2. Order create + payment page **fast** (milliseconds budget).
 *  3. UTR na mila → "payment hui hai" claim submit (202, processing) + WhatsApp
 *     screenshot option page par hamesha.
 *  4. Admin ke numbers clickable (tel: + wa.me) customers/orders pages par.
 *  5. Admin customer details edit (address/phone badalna) → audit entry.
 *
 * Server chahiye:  PORT=3100 ADMIN_API_TOKEN=dev-admin-token npm run start --workspace @noor/web
 * Chalao:          BASE_URL=http://127.0.0.1:3100 ADMIN_API_TOKEN=dev-admin-token node tests/e2e/round23.mjs
 */
const BASE = (process.env.BASE_URL || "http://127.0.0.1:3000").replace(/\/+$/, "");
const TOKEN =
  process.env.ADMIN_API_TOKEN ??
  (/^(https?:\/\/)?(localhost|127\.0\.0\.1)/.test(BASE) ? "dev-admin-token" : "");
const CAN_ADMIN = TOKEN.length > 0;
/** admin panel ka URL (local run par 3200) — na ho to admin UI checks skip */
const ADMIN = (process.env.ADMIN_URL ?? "").replace(/\/+$/, "");
/** local admin run par session cookie: ADMIN_COOKIE=noor_admin=<token> */
const ADMIN_COOKIE = process.env.ADMIN_COOKIE ?? "";
const adminFetch = async (path) => {
  try {
    return await fetch(`${ADMIN}${path}`, {
      headers: ADMIN_COOKIE ? { cookie: ADMIN_COOKIE } : {},
      redirect: "manual",
    });
  } catch (error) {
    // admin band hai / URL galat — suite crash na ho, sirf check fail ho
    console.log(`  warn admin unreachable: ${error.message}`);
    return { status: 0, text: async () => "" };
  }
};

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

// ── 0. ek buyable product ────────────────────────────────────────────────────
const productResponse = await getJson("/api/products?limit=24");
const list = productResponse.body?.products ?? productResponse.body?.items ?? productResponse.body?.data ?? [];
const candidate = list.find((product) => {
  const sizes = product.sizes ?? [];
  return sizes.some((size) => product.sizePricing?.[size]?.available !== false) && product.inStock !== false;
});
check("catalogue has a buyable product", Boolean(candidate));
if (!candidate) {
  console.log("round23: cannot continue without a product");
  process.exit(1);
}
const size = candidate.sizes.find((option) => candidate.sizePricing?.[option]?.available !== false);

const phone = "9876500011";
const basePayload = {
  customerName: "Round23 Test",
  email: "round23-test@example.com",
  phone,
  address: "22 Test Street, Near Market",
  city: "Jaipur",
  pincode: "302001", // Jaipur = Rajasthan
  paymentMethod: "prepaid",
  items: [{ handle: candidate.handle, size, quantity: 1 }],
};

const createOrder = (extra = {}) =>
  fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ...basePayload, ...extra }),
  });

// ── 1. state ↔ pincode guard (server) ───────────────────────────────────────
const wrongState = await createOrder({ state: "Gujarat" });
const wrongBody = await wrongState.json();
check("galat state par order 400 se block hota hai", wrongState.status === 400, String(wrongState.status));
check("error code state_mismatch hai", wrongBody.code === "state_mismatch", String(wrongBody.code ?? ""));
check(
  "error message me pincode ka sahi state hai",
  /Rajasthan/i.test(String(wrongBody.error ?? "")),
  String(wrongBody.error ?? "").slice(0, 90),
);

const spellingOk = await createOrder({ state: "Rajasthan", city: "Jaipur" });
const spellingBody = await spellingOk.json();
check(
  "sahi state par order ban jaata hai",
  spellingOk.status === 201 && Boolean(spellingBody.orderNumber),
  String(spellingOk.status),
);

// ── 2. speed budget ─────────────────────────────────────────────────────────
const timeIt = async (fn) => {
  const started = Date.now();
  const value = await fn();
  return { ms: Date.now() - started, value };
};
const createTimed = await timeIt(() => createOrder({ state: "Rajasthan", customerName: "Round23 Speed" }));
const createdBody = await createTimed.value.json();
check("order create 2s ke andar", createTimed.ms < 2000, `${createTimed.ms}ms`);
const number = createdBody.orderNumber ?? spellingBody.orderNumber;
const payTimed = await timeIt(() => fetch(`${BASE}/orders/${number}/pay`));
const payHtml = await payTimed.value.text();
console.log(`       order create ${createTimed.ms}ms · pay page ${payTimed.ms}ms · tracking ${"(next)"}`);
check("payment page 2s ke andar khulta hai", payTimed.ms < 2000, `${payTimed.ms}ms`);
check("payment page 200 deta hai", payTimed.value.status === 200, String(payTimed.value.status));
const orderTimed = await timeIt(() => fetch(`${BASE}/orders/${number}`));
await orderTimed.value.text();
console.log(`       tracking page ${orderTimed.ms}ms`);
check("order/tracking page 2s ke andar khulta hai", orderTimed.ms < 2000, `${orderTimed.ms}ms`);

// ── 3. R50 — pay page is a WhatsApp hand-off (no UTR / last-4 / claim UI) ────
check("pay page par WhatsApp CTA hai", payHtml.includes('data-testid="confirm-whatsapp"'));
check("pay page par owner ka WhatsApp link hai", /wa\.me\/\d{10,}/.test(payHtml));
check("pay page par koi UTR / last-4 input nahi", !/data-testid="upi-utr"|data-testid="upi-last4"/.test(payHtml));

const badLast4 = await fetch(`${BASE}/api/payments/claim`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ orderNumber: number, phoneLast4: "9999" }),
});
check("galat last-4 par claim reject hota hai", badLast4.status === 403, String(badLast4.status));

const claim = await fetch(`${BASE}/api/payments/claim`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ orderNumber: number, phoneLast4: phone.slice(-4), note: "UTR nahi mila" }),
});
const claimBody = await claim.json();
check("claim accept hota hai (202)", claim.status === 202 && claimBody.ok === true, JSON.stringify(claimBody).slice(0, 120));
const state = await getJson(`/api/orders/${number}/payment`);
check("claim ke baad payment processing ho jaata hai", state.body?.paymentStatus === "processing", state.body?.paymentStatus);
check("claim se order paid nahi banta (admin verify karega)", state.body?.paymentStatus !== "paid");

const claimAgain = await fetch(`${BASE}/api/payments/claim`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ orderNumber: number, phoneLast4: phone.slice(-4) }),
});
check("dobara claim bhi safely handle hota hai", [202, 409].includes(claimAgain.status), String(claimAgain.status));

// ── 4. admin: numbers clickable + contact edit ──────────────────────────────
if (CAN_ADMIN) {
  const patched = await fetch(`${BASE}/api/admin/orders/${number}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({
      action: "contact",
      city: "Ajmer",
      address: "45 Naya Bazaar, Near Clock Tower",
      pincode: "305001",
    }),
  });
  const patchedBody = await patched.json();
  check("admin customer details edit kar sakta hai", patched.ok, String(patched.status));
  check("naya city save hua", patchedBody.order?.city === "Ajmer", String(patchedBody.order?.city ?? ""));
  check("naya address save hua", /Naya Bazaar/.test(String(patchedBody.order?.address ?? "")));
  check(
    "contact change audit log me hai",
    (patchedBody.order?.audit ?? []).some((entry) => entry.action === "order.contact_updated"),
  );

  const badPin = await fetch(`${BASE}/api/admin/orders/${number}`, {
    method: "PATCH",
    headers: { "content-type": "application/json", authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ action: "contact", pincode: "12" }),
  });
  const badPinBody = await badPin.json();
  check("galat pincode ignore hota hai", badPinBody.order?.pincode === "305001", String(badPinBody.order?.pincode ?? ""));
}

if (ADMIN) {
  const customers = await adminFetch("/customers");
  const customersHtml = await customers.text();
  check("admin customers page khulta hai", customers.status === 200, String(customers.status));
  check("customers page par tel: link hai", customersHtml.includes("tel:+91"));
  check("customers page par wa.me link hai", customersHtml.includes("wa.me/91"));
  check("customers page se customer detail khulti hai", customersHtml.includes("/customers?phone="));

  const detail = await adminFetch(`/customers?phone=${phone}`);
  const detailHtml = await detail.text();
  check("customer detail view render hota hai", detail.status === 200 && detailHtml.includes('data-testid="customer-detail"'));

  const orderPage = await adminFetch(`/orders/${number}`);
  const orderHtml = await orderPage.text();
  check("admin order page khulta hai", orderPage.status === 200, String(orderPage.status));
  check("order page par clickable phone hai", orderHtml.includes('data-testid="phone-links"'));
  check("order page par details edit form hai", orderHtml.includes("Save details"));
} else {
  console.log("  skip admin panel checks (ADMIN_URL not set)");
}

console.log(`\nround23: ${passed} passed, ${failures.length} failed`);
if (failures.length) {
  for (const failure of failures) console.log(`  - ${failure}`);
  process.exit(1);
}
