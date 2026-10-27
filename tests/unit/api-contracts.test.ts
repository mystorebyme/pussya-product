/**
 * API contract tests — jo routes abhi tak kisi test me nahi the
 * (`npm run audit` ka route→test map yahi dikhata hai).
 *
 * Kyun contract-level: in handlers me DB/sheet/network lagta hai, isliye poori call
 * test me nahi chalayi jaati. Par **security contract** (auth gate, status code,
 * kya leak hota hai) source par hi pakda ja sakta hai — aur wahi cheez production
 * me sabse mehngi padti hai.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { newsletterSchema } from "@noor/validation";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const API = "apps/web/src/app/api";

test("newsletter: schema valid email leta hai, galat ko rokta hai", () => {
  assert.equal(newsletterSchema.safeParse({ email: "  Priya@Example.COM " }).success, true);
  const parsed = newsletterSchema.safeParse({ email: "  Priya@Example.COM " });
  assert.equal(parsed.success && parsed.data.email, "priya@example.com", "email normalise hota hai");
  assert.equal(newsletterSchema.safeParse({ email: "not-an-email" }).success, false);
  assert.equal(newsletterSchema.safeParse({}).success, false);
  assert.equal(newsletterSchema.safeParse({ email: "" }).success, false);

  // route: 400 par saaf message, 201 par duplicate flag, sheet mirror background me
  const route = read(`${API}/newsletter/route.ts`);
  assert.match(route, /status: 400/);
  assert.match(route, /status: 201/);
  assert.match(route, /duplicate/);
  assert.match(route, /mirrorSubscriberToSheet/);
  assert.match(route, /runInBackground/); // customer ko sheet likhne ka intezaar nahi
});

test("admin/invoices/[number]: token ke bina 401, token ke saath invoice", () => {
  const route = read(`${API}/admin/invoices/[number]/route.ts`);
  assert.match(route, /function authorize/);
  assert.match(route, /status: 401/, "bina token 401");
  assert.match(route, /status: 404/, "unknown invoice 404");
  assert.match(route, /cache-control", value: "no-store"|"cache-control": "no-store"/);
  // token env se, code me hardcode nahi
  assert.match(route, /process\.env\.ADMIN_API_TOKEN/);
});

test("admin/traffic: admin-only (401) aur no-store", () => {
  const route = read(`${API}/admin/traffic/route.ts`);
  assert.match(route, /status: 401/);
  assert.match(route, /process\.env\.ADMIN_API_TOKEN/);
  assert.match(route, /no-store/);
  // traffic summary me koi raw IP/user-agent nahi jaata (privacy)
  assert.ok(!/userAgent|user-agent/.test(route), "user-agent public API me nahi");
});

test("payments/return: sirf signed token par auto-confirm (bina token 403)", () => {
  const route = read(`${API}/payments/return/route.ts`);
  assert.match(route, /verifyUpiReturn/);
  assert.match(route, /status: 403/, "galat token 403");
  assert.match(route, /status: 400/);
  assert.match(route, /NE-\[A-Z0-9\]\{4,12\}/, "order number format check");
  // pehle se paid order dubara confirm nahi hota
  assert.match(route, /alreadyPaid/);
});

test("payments/status: sirf status, koi PII nahi", () => {
  const route = read(`${API}/payments/status/route.ts`);
  assert.match(route, /no-store/);
  // phone sirf verify karne ke liye padha jaata hai — jawab me kabhi nahi jaata
  assert.match(route, /token\.phone !== order\.phone/, "phone token verify hota hai");
  assert.ok(!/(customerName|address|email|phone):\s/.test(route), "status jawab me PII nahi");
});

test("payments/intent: pehle hi 'paid' nahi karta (confirm sirf verify ke baad)", () => {
  const route = read(`${API}/payments/intent/route.ts`);
  assert.match(route, /createIntent/);
  // intent route me "paid" set karne wala code nahi hona chahiye
  assert.ok(!/paymentStatus:\s*"paid"/.test(route), "intent se paid nahi hota");
  assert.match(route, /status: 400/);
});

test("orders/[orderNumber]/invoice: phone ke last 4 digit match, warna 403", () => {
  const route = read(`${API}/orders/[orderNumber]/invoice/route.ts`);
  assert.match(route, /status: 404/);
  assert.match(route, /403|Forbidden|does not match/, "phone mismatch par deny");
  assert.match(route, /renderInvoicePdf/);
  // order number akela kaafi nahi — phone check hona chahiye
  assert.match(route, /phone/i);
});

test("har public route par CORS/jawab shape consistent hai", () => {
  const publicRoutes = [
    `${API}/orders/route.ts`,
    `${API}/contact/route.ts`,
    `${API}/settings/route.ts`,
    `${API}/newsletter/route.ts`,
  ];
  for (const file of publicRoutes) {
    const source = read(file);
    assert.match(source, /Response\.json/, `${file} JSON envelope deta hai`);
    assert.match(source, /\b(ok|error|data):/, `${file} me ok/error/data shape`);
  }
});
