/**
 * R33 guards — naya domain + checkout back-navigation.
 *
 * Owner (26 Oct 2026):
 *   1. Domain `noorethnicwear.in` khareed liya → poori site usi ke hisaab se.
 *   2. Flow: address (step 1) → review (step 2) → payment (step 3) — checkout
 *      karte hi pehle address, phir review, phir payment.
 *   3. Payment se **back** karne par review (step 2) par aana chahiye.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { CANONICAL_ADMIN_ORIGIN, CANONICAL_ORIGIN, isOwnHost } from "../../apps/web/src/lib/domain";
import { LIVE_STORE_URL } from "../../apps/web/src/lib/api-base";
import { normaliseReferrer } from "../../apps/web/src/lib/traffic-format";
import { readPlacedOrder, reviewUrl, savePlacedOrder, clearPlacedOrder } from "../../apps/web/src/lib/checkout-session";

const read = (relative: string) => fs.readFileSync(path.join(process.cwd(), relative), "utf8");

test("R33: canonical origin env se aata hai (code me domain hardcoded nahi)", () => {
  const domain = read("apps/web/src/lib/domain.ts");
  assert.match(domain, /process\.env\.NEXT_PUBLIC_SITE_URL/);
  assert.doesNotMatch(domain, /"https:\/\/[a-z0-9.-]+\.(in|com|fashion)"/, "koi brand domain hardcoded nahi");
  assert.ok(CANONICAL_ORIGIN.startsWith("http"), "origin env ya dev default se banta hai");
  assert.equal(CANONICAL_ADMIN_ORIGIN, (process.env.NEXT_PUBLIC_ADMIN_URL ?? "").replace(/\/+$/, "") || CANONICAL_ORIGIN);
});

test("R33: site config ka fallback naya domain hai (purana/borrowed site kabhi nahi)", () => {
  const site = read("apps/web/src/config/site.ts");
  assert.match(site, /CANONICAL_ORIGIN/);
  assert.doesNotMatch(site, /"https:\/\/www\.noorclothing\.com"/);
});

test("R33: live store fallback bhi naya domain", () => {
  if (!process.env.NEXT_PUBLIC_LIVE_STORE_URL && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    assert.equal(LIVE_STORE_URL, CANONICAL_ORIGIN);
  }
  assert.match(read("apps/web/src/lib/api-base.ts"), /CANONICAL_ORIGIN/);
});

test("R33: apne hosts pehchane jaate hain (env domain + www + platform preview)", () => {
  const host = new URL(CANONICAL_ORIGIN).hostname.replace(/^www\./, "");
  assert.equal(isOwnHost(host), true);
  assert.equal(isOwnHost(`www.${host}`), true);
  assert.equal(isOwnHost(`${CANONICAL_ORIGIN}/checkout`), true);
  assert.equal(isOwnHost("noor-ethnic-wear.vercel.app"), true);
  assert.equal(isOwnHost("someone-else-store.example"), false);
  assert.equal(isOwnHost("google.com"), false);
  assert.equal(isOwnHost(null), false);
});

test("R33: traffic me apna domain internal gina jaata hai", () => {
  assert.equal(normaliseReferrer(`${CANONICAL_ORIGIN}/products/x`), "internal");
  assert.equal(normaliseReferrer("https://google.com/search?q=x"), "google");
});

test("R33: policies naye domain ka naam leti hain", () => {
  const privacy = read("apps/web/src/content/policies/privacy-policy.md");
  const terms = read("apps/web/src/content/policies/terms-and-conditions.md");
  // placeholder domain (asli domain lagne par policies regenerate hongi)
  assert.match(privacy, /noorethnicwear\.in/);
  assert.match(terms, /noorethnicwear\.in/);
  assert.match(privacy, /Noor Ethnic Wear/);
});

test("R33: review URL order ke saath banta hai", () => {
  assert.equal(reviewUrl("NE-ABC123"), "/checkout?step=review&order=NE-ABC123");
});

test("R50: the hand-off page links back to the live order page", () => {
  const pay = read("apps/web/src/app/orders/[orderNumber]/pay/page.tsx");
  assert.match(pay, /\/orders\/\$\{/);
  assert.match(pay, /data-testid="pay-order-number"/);
});

test("R50: checkout order place par snapshot save karta hai (back ke liye)", () => {
  const form = read("apps/web/src/components/checkout-form.tsx");
  assert.match(form, /savePlacedOrder\(snapshot\)/);
  // ek purana `?order=` link review step kholta hai aur usi order ka WhatsApp hand-off dikhata hai
  assert.match(form, /resumeOrderNumber/);
  assert.match(form, /wantsReview/);
  assert.match(form, /data-testid="checkout-submit"/);
});

test("R50: checkout 3 step — delivery → review → WhatsApp", () => {
  const form = read("apps/web/src/components/checkout-form.tsx");
  const delivery = form.indexOf('label: "Delivery"');
  const review = form.indexOf('label: "Review"');
  const whatsapp = form.indexOf('label: "WhatsApp"');
  assert.ok(delivery > 0 && review > delivery && whatsapp > review, "step order delivery → review → WhatsApp");
  assert.doesNotMatch(form, /label: "Payment"/);
  assert.doesNotMatch(form, /checkout-payment-step/);
});

test("R33: snapshot sessionStorage me chalta hai (permanent nahi)", () => {
  const items = [{ title: "Suit", image: "/x.jpg", size: "M", quantity: 1, price: 599 }];
  const snapshot = {
    orderNumber: "NE-TEST01",
    total: 599,
    placedAt: new Date().toISOString(),
    items,
    customer: { name: "Asha", phone: "9876543210", email: "a@b.co", address: "1 Road", city: "Jaipur", state: "Rajasthan", pincode: "302001" },
  };
  const store = new Map<string, string>();
  const fakeWindow = {
    sessionStorage: {
      getItem: (key: string) => store.get(key) ?? null,
      setItem: (key: string, value: string) => void store.set(key, value),
      removeItem: (key: string) => void store.delete(key),
    },
  };
  const globals = globalThis as unknown as { window?: unknown };
  const previous = globals.window;
  globals.window = fakeWindow;
  try {
    savePlacedOrder(snapshot);
    assert.equal(readPlacedOrder("NE-TEST01")?.total, 599);
    assert.equal(readPlacedOrder("NE-OTHER"), null, "doosre order ka snapshot nahi milta");
    // 6 ghante purana snapshot expire
    assert.equal(readPlacedOrder("NE-TEST01", Date.now() + 7 * 60 * 60 * 1000), null);
    clearPlacedOrder();
    assert.equal(readPlacedOrder("NE-TEST01"), null);
  } finally {
    globals.window = previous;
  }
});

test("R33: sheet script ke demo images naye domain par hain", () => {
  const gs = read("scripts/google-apps-script/noor-sheets.gs");
  assert.match(gs, /https:\/\/[^"']+\/images\/brand\/logo-desktop\.png/);
});

test("R33: admin login ka email env se aata hai (hardcoded brand email nahi)", async () => {
  const { readFileSync } = await import("node:fs");
  const auth = readFileSync("apps/admin/src/lib/auth.ts", "utf8");
  assert.match(auth, /process\.env\.ADMIN_EMAIL/);
  assert.doesNotMatch(auth, /"admin@[a-z0-9.-]+"/i, "koi email hardcoded nahi");
  const { checkCredentials } = await import("../../apps/admin/src/lib/auth");
  const password = process.env.ADMIN_PASSWORD ?? "noor2026";
  // ADMIN_EMAIL khaali = koi bhi email, par password phir bhi zaroori
  assert.equal(checkCredentials("owner@example.com", "wrong-password"), false);
  assert.equal(checkCredentials("owner@example.com", password), true);
});
