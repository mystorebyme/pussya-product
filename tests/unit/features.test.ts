/**
 * R32 guards — owner ke do asks ka code-level proof:
 *
 *   1. Payment page par "Order details dekhein" link **highlight** ho aur saaf
 *      likha ho ki payment ke baad aage badhne ke liye yahin click karna hai.
 *   2. Customer ke order page se **invoice download abhi band** — sirf tracking
 *      dikhe (PDF/API aur admin ka button pehle jaisa chalta rahe).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { customerFeatures } from "../../apps/web/src/lib/features";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");
const payPage = read("apps/web/src/app/orders/[orderNumber]/pay/page.tsx");
const orderPage = read("apps/web/src/app/orders/[orderNumber]/page.tsx");

test("R32: customer ke liye invoice download abhi band hai", () => {
  assert.equal(customerFeatures.invoice, false);
});

test("R32: order page invoice block flag ke peeche hai (aadha text nahi bachta)", () => {
  assert.match(orderPage, /\{customerFeatures\.invoice \? \(/);
  assert.match(orderPage, /\) : null\}/);
  assert.equal((orderPage.match(/data-testid="download-invoice"/g) ?? []).length, 1);
});

test("R50: order page par WhatsApp hand-off block highlight hai", () => {
  assert.match(orderPage, /data-testid="order-whatsapp-block"/);
  assert.match(orderPage, /data-testid="complete-payment"/);
  // highlight = gold callout + animated WhatsApp CTA, sirf underline text nahi
  assert.match(orderPage, /bg-\[#fdf9ee\]/);
  assert.match(orderPage, /wa-cta/);
});

test("R50: the block says plainly that the order is completed on WhatsApp", () => {
  assert.match(orderPage, /Confirm on WhatsApp/);
  assert.match(orderPage, /orderWhatsAppLink\(order, siteUrl\)/);
  assert.match(orderPage, /share the payment details there/);
});

test("R32: callout ka link order page hi kholta hai (bahar nahi)", () => {
  const linkBlock = payPage.slice(payPage.indexOf('data-testid="order-details-link"') - 400);
  assert.match(linkBlock, /href=\{`\/orders\/\$\{order\.orderNumber\}`\}/);
});

test("R32: payment page par invoice ka zikr nahi", () => {
  assert.doesNotMatch(payPage, /Download invoice/);
  assert.doesNotMatch(payPage, /GST invoice/);
});

test("R32: invoice PDF ka API aur admin button abhi bhi maujood hai", () => {
  const api = read("apps/web/src/app/api/orders/[orderNumber]/invoice/route.ts");
  assert.match(api, /export async function GET/);
  const adminOrder = read("apps/admin/src/app/(admin)/orders/[id]/page.tsx");
  assert.match(adminOrder, /Download GST invoice \(PDF\)/);
});
