/**
 * Payment reference (UTR) ka data rule — regression guard.
 *
 * Production bug (R22): `payments` par `unique (provider, gateway_payment_id)` tha,
 * isliye ek UTR doosre order par daalte hi Postgres unique violation deta tha aur
 * customer ko generic "Could not save the payment reference" 500 dikhta tha —
 * jabki payment app se paisa kat chuka hota tha. Ab niyam hai:
 *   • DB me unique sirf (order_id, provider, reference) — per order.
 *   • Doosre order par wahi UTR = saaf 409 message (500 nahi).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (relative: string) =>
  fs.readFileSync(path.join(process.cwd(), relative), "utf8");

const ordersLib = read("apps/web/src/lib/orders.ts");
const dbSchema = read("apps/web/src/lib/db-schema.ts");
const schemaSql = read("database/schema.sql");
const migration = read("database/migrations/0008_payments_reference_per_order.sql");

test("schema: UTR per order unique hai, globally nahi", () => {
  assert.match(schemaSql, /unique \(order_id, provider, gateway_payment_id\)/);
  assert.ok(
    !/unique \(provider, gateway_payment_id\)/.test(schemaSql),
    "global (provider, reference) unique dobara na aaye",
  );
  assert.match(migration, /payments_order_reference_uniq/);
  assert.match(migration, /drop constraint if exists payments_provider_gateway_payment_id_key/);
});

test("migration 0008 boot par apply hoti hai (serverless me koi manual step nahi)", () => {
  assert.match(dbSchema, /0008_payments_reference_per_order\.sql/);
});

test("doosre order par wahi UTR = 409 saaf message, 500 nahi", () => {
  assert.match(ordersLib, /reference_in_use/);
  assert.match(ordersLib, /other\.orderNumber !== wanted && other\.payment\?\.reference === reference/);
  assert.match(ordersLib, /409/);
});
