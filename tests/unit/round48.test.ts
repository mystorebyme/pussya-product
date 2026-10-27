/**
 * Round 48 — owner ke 5 kaam:
 *
 *   1. "Size guide me saari cheezein chahiye" — 3 tabs (Measurements Chart /
 *      Find My Size / How to Measure), inches↔cm toggle, XS–XXL chart,
 *      bust se recommended size, unstitched suit ka fabric note, pro-tips.
 *   2. PDP par hover → purani image hat jaye, zoom wali dikhe; cursor hatne par
 *      image wapas pehle jaisi.
 *   3. Har category circle ki **apni, alag image** (repeat nahi).
 *   4. Site ke colours + proper animation.
 *   5. YouPI PG gateway **uske system ke hisaab se** integrate (youpi.js +
 *      HMAC webhook + server-to-server verify).
 */
import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import {
  FIT_LABEL,
  MEASURE_STEPS,
  SIZE_COLUMNS,
  SIZE_ROWS,
  SIZE_TABS,
  UNSTITCHED_NOTE,
  findSizeForBust,
} from "../../apps/web/src/lib/size-chart";
import { pickCircleImages } from "../../apps/web/src/lib/circle-art";
import {
  hmacSha256Hex,
  verifyYoupiSignature,
  verifyYoupiSignatureV2,
  verifyYoupiWebhook,
  youpiAmountMatches,
} from "../../apps/web/src/lib/youpi-signature";

const root = process.cwd();
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");
const exists = (file: string) => fs.existsSync(path.join(root, file));

/* ─────────────────────────── R48-1: size guide ─────────────────────────── */

test("R48-1a: chart XS–XXL hai — inches aur cm dono owner ke diye numbers par", () => {
  assert.deepEqual(
    SIZE_ROWS.map((row) => row.size),
    ["XS", "S", "M", "L", "XL", "XXL"],
  );
  assert.deepEqual(SIZE_ROWS.map((row) => row.bust), [34, 36, 38, 40, 42, 44]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.waist), [32, 34, 36, 38, 40, 42]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.hip), [36, 38, 40, 42, 44, 46]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.frontLength), [46, 46, 46, 46, 46, 46]);

  // cm column owner ke chart se **verbatim** (round-trip conversion nahi)
  assert.deepEqual(SIZE_ROWS.map((row) => row.cm.bust), [85, 91, 95, 100, 105, 110]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.cm.waist), [80, 86, 90, 95, 100, 105]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.cm.hip), [90, 96.5, 100, 105, 110, 115]);
  assert.deepEqual(SIZE_ROWS.map((row) => row.cm.frontLength), [115, 117, 115, 115, 115, 115]);

  assert.deepEqual(
    SIZE_COLUMNS.map((column) => column.label),
    ["Bust", "Waist", "Hips", "Front Length"],
  );
  assert.equal(FIT_LABEL, "Regular Comfort Fit • Ready to Wear");
});

test("R48-1b: 3 tabs + unit toggle + Find My Size + unstitched note + pro-tips", () => {
  assert.deepEqual(
    SIZE_TABS.map((tab) => tab.label),
    ["Measurements Chart", "Find My Size", "How to Measure"],
  );

  const content = read("apps/web/src/components/size-guide-content.tsx");
  for (const required of [
    "size-guide-tabs",
    "size-tab-${item.id}",
    "size-guide-panel-chart",
    "size-guide-panel-find",
    "size-guide-panel-how",
    "size-unit-toggle",
    "size-unit-${option.value}",
    'label: "Inches (in)"',
    'label: "Centimeters (cm)"',
    "find-size-input",
    "find-size-submit",
    "find-size-quick",
    "find-size-result",
    "Best fit",
    "unstitched-note",
    "Pro tip:",
    "BUST_QUICK_PICKS",
  ]) {
    assert.ok(content.includes(required), `size guide content me ${required} missing`);
  }

  // unstitched note owner ke metres + tailor range ke saath
  const note = JSON.stringify(UNSTITCHED_NOTE);
  assert.match(note, /2\.5 m/, "kurti top fabric");
  assert.match(note, /2\.25 m/, "dupatta fabric");
  assert.match(note, /XS se 5XL/, "tailor XS–5XL tak custom");

  // 4 steps, har step par pro tip
  assert.equal(MEASURE_STEPS.length, 4);
  assert.deepEqual(
    MEASURE_STEPS.map((step) => step.title),
    ["Bust", "Waist", "Hips", "Front Length"],
  );
  for (const step of MEASURE_STEPS) {
    assert.ok(step.proTip.length > 20, `${step.title} ka pro-tip chhota hai`);
  }

  // panel aur page dono ek hi body use karte hain
  assert.match(read("apps/web/src/components/size-guide-dialog.tsx"), /<SizeGuideContent/);
  assert.match(read("apps/web/src/app/pages/[slug]/page.tsx"), /<SizeGuideContent/);
});

test("R48-1c: Find My Size — bust se recommended size (inches aur cm dono)", () => {
  const m = findSizeForBust(38, "in");
  assert.equal(m?.size, "M");
  assert.equal(m?.bust, 38);
  assert.match(m?.message ?? "", /Graceful regular fit for 38″ bust/);

  assert.equal(findSizeForBust(34, "in")?.size, "XS");
  assert.equal(findSizeForBust(37, "in")?.size, "M", "37″ → agla size M (comfort fit)");
  assert.equal(findSizeForBust(44, "in")?.size, "XXL");
  assert.equal(findSizeForBust(46, "in")?.outsideChart, "large");
  assert.equal(findSizeForBust(30, "in")?.outsideChart, "small");
  // 95 cm ≈ 37.4″ → M
  assert.equal(findSizeForBust(95, "cm")?.size, "M");
  assert.equal(findSizeForBust(Number.NaN), null);
  assert.equal(findSizeForBust(0), null);
});

/* ───────────────────── R48-2: PDP hover = zoom image ───────────────────── */

test("R48-2: hover par base image hat jaye aur zoom layer dikhe, leave par wapas", () => {
  const gallery = read("apps/web/src/components/product-gallery.tsx");
  assert.match(
    gallery,
    /zoom \? "opacity-0" : "opacity-100"/,
    "hover par active slide ki opacity 0 honi chahiye",
  );
  assert.match(gallery, /data-testid="pdp-zoom-layer"/, "zoom layer maujood ho");
  assert.match(gallery, /data-zoom=\{zoom \? "on" : "off"\}/, "frame par zoom state");
  assert.match(gallery, /onMouseEnter=\{\(\) => setZoom\(true\)\}/, "hover par zoom on");
  assert.match(
    gallery,
    /onMouseLeave=\{\(\) => \{\s*\n\s*setZoom\(false\);\s*\n\s*setOrigin\("50% 50%"\);/,
    "mouse leave par zoom off + origin reset",
  );

  const css = read("apps/web/src/app/globals.css");
  assert.match(css, /\.gallery-slide \{[^}]*transition: opacity/);
  assert.match(css, /\.gallery-zoom \{[^}]*transition: opacity/);
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.gallery-slide,\s*\n\s*\.gallery-zoom/, "reduced motion me transition band");
});

/* ─────────────────── R48-3: unique category circle images ─────────────────── */

test("R48-3: 7 categories — 7 alag images (repeat nahi)", () => {
  // synthetic test: overlapping collections bhi unique images dein
  const specs = [
    { handle: "a", candidates: [{ image: "x1", color: "Red" }, { image: "x2", color: "Red" }] },
    { handle: "b", candidates: [{ image: "x1", color: "Red" }, { image: "x2", color: "Blue" }] },
    { handle: "c", candidates: [{ image: "x1", color: "Red" }, { image: "x3", color: "Red" }] },
  ];
  assert.deepEqual(pickCircleImages(specs), ["x1", "x2", "x3"]);

  // asli catalog par bhi 7 unique
  const catalog = JSON.parse(read("database/seeds/catalog.json")) as {
    products: { images?: string[]; color?: string; collections?: string[] }[];
  };
  const handles = [
    "party-wear-gown",
    "lehnga-choli",
    "printed-suit-set",
    "new-arrivals",
    "noors-choice",
    "sale",
    "weddin-collection",
  ];
  const images = pickCircleImages(
    handles.map((handle) => ({
      handle,
      candidates: catalog.products
        .filter((product) => (product.collections ?? []).includes(handle))
        .flatMap((product) =>
          (product.images ?? []).slice(0, 2).map((image) => ({ image, color: product.color ?? null })),
        ),
    })),
  );
  assert.equal(images.length, 7);
  assert.equal(new Set(images).size, 7, "do categories ki image same hai");
  for (const image of images) assert.ok(image, "kisi category ka image khaali hai");

  const home = read("apps/web/src/app/page.tsx");
  assert.match(home, /pickCircleImages/, "home page unique selection use karta hai");
  assert.doesNotMatch(home, /circleImage\(/, "purana (repeat karne wala) helper hat gaya");
});

/* ────────────────── R48-4: colours + proper animation ────────────────── */

test("R48-4: palette + animation CSS (reduced-motion safe)", () => {
  const css = read("apps/web/src/app/globals.css");
  for (const token of ["--noor-ivory", "--noor-gold", "--noor-hairline"]) {
    assert.ok(css.includes(token), `${token} token missing`);
  }
  assert.match(css, /@keyframes ctaSheen/);
  assert.match(css, /\.cta-sheen::after/);
  assert.match(css, /\.link-underline::after/);
  assert.match(css, /\.gold-hairline/);
  assert.match(css, /::selection \{/, "text selection brand colour me");
  const reduced = css.slice(css.lastIndexOf("@media (prefers-reduced-motion: reduce)"));
  assert.match(reduced, /\.cta-sheen::after \{\s*\n\s*display: none;/, "reduced motion me sheen band");

  // animation classes asli elements par lagaye gaye hain
  assert.match(read("apps/web/src/app/page.tsx"), /cta-sheen/);
  assert.match(read("apps/web/src/components/product-detail.tsx"), /cta-sheen/);
  assert.match(read("apps/web/src/components/site-header.tsx"), /link-underline/);
});

/* ───────────────────────── R48-5: YouPI PG ───────────────────────── */

test("R48-5a: webhook signature — V1 aur V2 dono verify hote hain, tampering reject", () => {
  const secret = "youpi-test-secret";
  const body = JSON.stringify({ event: "SUCCESS", orderId: "NE-ABCD1234", amountPaise: 149900 });

  const v1 = hmacSha256Hex(secret, body);
  assert.equal(verifyYoupiSignature(body, v1, secret), true);
  assert.equal(verifyYoupiSignature(body, `sha256=${v1}`, secret), true);
  assert.equal(verifyYoupiSignature(body, v1, "wrong-secret"), false);
  assert.equal(verifyYoupiSignature(`${body} `, v1, secret), false, "raw bytes badle to fail");
  assert.equal(verifyYoupiSignature(body, "", secret), false);

  const timestamp = String(Date.UTC(2026, 9, 27, 10, 0, 0));
  const v2 = hmacSha256Hex(secret, `${timestamp}.${body}`);
  assert.equal(verifyYoupiSignatureV2(body, v2, secret, timestamp), true);
  assert.equal(verifyYoupiSignatureV2(body, v2, secret, `${timestamp}9`), false);
  assert.equal(verifyYoupiWebhook(body, { v1, v2: "", timestamp: "" }, secret), true);
  assert.equal(verifyYoupiWebhook(body, { v1: "", v2, timestamp }, secret), true);
  assert.equal(verifyYoupiWebhook(body, { v1: "deadbeef", v2: "deadbeef", timestamp }, secret), false);

  // timing-safe compare use hota hai
  assert.match(read("apps/web/src/lib/youpi-signature.ts"), /timingSafeEqual/);
  assert.equal(youpiAmountMatches(149900, 149900), true);
  assert.equal(youpiAmountMatches(149900, 149901), false);
});

test("R48-5b: gateway client — youpi.js embed, sheet-driven config, server-side verify", () => {
  const client = read("apps/web/src/components/youpi-pay.tsx");
  for (const required of [
    "/youpi.js",
    "data-youpi-key",
    "window.Youpi",
    "youpiPayUrl",
    "youpiMerchantId",
    "order_id",
    "/api/payments/youpi/confirm",
    "youpi-pay-button",
  ]) {
    assert.ok(client.includes(required), `youpi client me ${required} missing`);
  }
  assert.match(client, /dataset\.youpiKey = merchantId/, "merchant id script tag par");
  assert.match(client, /metadata: \{ orderNumber \}/, "order id metadata me");
  // config na ho to kuch render na ho (purana UPI flow chalta rahe)
  assert.match(client, /if \(!configured\) return null;/);

  // payment step me laga hua hai — aur UPI ID na hone par bhi gateway available rahe
  const upi = read("apps/web/src/components/upi-payment.tsx");
  assert.ok(
    (upi.match(/<YoupiPayButton/g) ?? []).length >= 2,
    "gateway button normal card aur empty-UPI (pause) card dono me ho",
  );
  const pauseCard = upi.slice(upi.indexOf('data-testid="upi-unavailable"') - 700, upi.indexOf('data-testid="upi-unavailable"'));
  assert.match(pauseCard, /<YoupiPayButton/, "UPI ID na ho to bhi gateway se payment ho sake");

  const server = read("apps/web/src/lib/youpi.ts");
  for (const required of [
    "/api/v1/payments",
    "x-merchant-id",
    "idempotency-key",
    "fetchYoupiPayment",
    "resolveYoupiConfig",
  ]) {
    assert.ok(server.includes(required), `youpi server module me ${required} missing`);
  }
  assert.match(server, /import "server-only"/, "secret wala module server-only hai");

  // webhook route dono gateways handle karta hai
  const webhook = read("apps/web/src/app/api/payments/webhook/[gateway]/route.ts");
  assert.match(webhook, /gateway === "youpi"/);
  assert.match(webhook, /verifyYoupiWebhook/);
  assert.match(webhook, /seenYoupiDelivery/, "retry dedupe");
  assert.match(webhook, /ORDER_AMOUNT_MISMATCH/, "amount mismatch par confirm nahi");
  assert.match(webhook, /actor: "youpi-webhook"/);

  // session **server se** banti hai (amount order se, browser se nahi)
  const create = read("apps/web/src/app/api/payments/youpi/create/route.ts");
  assert.match(create, /createYoupiPayment/, "gateway ki POST /api/v1/payments server se");
  assert.match(create, /amountPaise: order\.total/, "amount order se aata hai");
  assert.match(create, /`noor-\$\{order\.orderNumber\}-\$\{order\.total\}`/, "idempotency key");
  assert.match(create, /getOrderForPayment/, "order server par verify hota hai");
  assert.match(create, /RATE_LIMITS\.payments/);
  assert.match(create, /existing: true/, "409 duplicate par wahi session dobara khule");
  assert.match(client, /\/api\/payments\/youpi\/create/, "client pehle server session maangta hai");
  assert.match(client, /checkoutUrl: session\.checkoutUrl/, "server ka checkoutUrl SDK ko jaata hai");
  assert.doesNotMatch(client, /successUrl:/, "successUrl se page redirect na ho (SPA state bacha rahe)");
  for (const status of ["SUCCESS", "RECONCILED", "OBSERVED_SUCCESS", "MANUAL_REVIEW", "EXPIRED", "FAILED", "CANCELLED"]) {
    assert.ok(client.includes(status), `client ${status} handle karta hai`);
  }

  // static hosting fallback: server hi gateway se verify karta hai
  const confirm = read("apps/web/src/app/api/payments/youpi/confirm/route.ts");
  assert.match(confirm, /fetchYoupiPayment/);
  assert.match(confirm, /youpiAmountMatches/);
  assert.match(confirm, /actor: "youpi-confirm"/);
  assert.match(confirm, /RATE_LIMITS\.payments/, "rate limited");
});

test("R48-5d: gateway origin — absolute URL, same-origin path, aur server-only internal URL", () => {
  const server = read("apps/web/src/lib/youpi.ts");

  /*
   * `youpi.ts` server-only hai (browser ke liye `youpi-pay.tsx`) — isliye
   * behaviour parh kar check karte hain, import karke nahi.
   */
  assert.match(server, /export function normalisePayUrl/, "normalisePayUrl exported");
  assert.match(server, /value\.startsWith\("\/"\)/, "same-origin path (reverse proxy) support");
  assert.match(server, /\^https\?:\\\/\\\//, "bare domain par https lagta hai");
  assert.match(server, /replace\(\/\\\/\+\$\/, ""\)/, "trailing slash hatta hai");
  assert.match(server, /YOUPI_PAY_URL_INTERNAL/, "server-only internal origin support");
  assert.match(server, /config\.internalUrl \|\| config\.payUrl/, "internal na ho to public URL se call");

  // CSP frame-src/script-src gateway ko allow kare, warna checkout iframe block hoga
  const nextConfig = read("apps/web/next.config.ts");
  assert.match(nextConfig, /frame-src/);
  assert.match(nextConfig, /youpiOrigin/);
  assert.match(nextConfig, /script-src 'self' 'unsafe-inline'/);
  assert.match(nextConfig, /connect-src 'self'/);
});

test("R48-5c: config sheet se live aati hai, secret public API me nahi jaata", () => {
  const settings = read("apps/web/src/lib/store-settings.ts");
  for (const field of ["youpiEnabled", "youpiPayUrl", "youpiMerchantId", "youpiWebhookSecret"]) {
    assert.ok(settings.includes(field), `${field} store settings me missing`);
  }
  const sheet = read("apps/web/src/lib/sheet-format.ts");
  for (const key of ["youpi_enabled", "youpi_pay_url", "youpi_merchant_id", "youpi_webhook_secret"]) {
    assert.ok(sheet.includes(key), `sheet key ${key} parse nahi hoti`);
  }

  const publicRoute = read("apps/web/src/app/api/settings/route.ts");
  assert.match(publicRoute, /youpiPayUrl: settings\.youpiPayUrl/);
  assert.doesNotMatch(publicRoute, /youpiWebhookSecret/, "webhook secret public API me nahi");

  const provider = read("apps/web/src/components/store-settings-provider.tsx");
  assert.doesNotMatch(provider, /youpiWebhookSecret/, "client provider secret nahi jaanta");

  const gas = read("scripts/google-apps-script/noor-sheets.gs");
  for (const key of ["youpi_pay_url", "youpi_merchant_id", "youpi_enabled"]) {
    assert.ok(gas.includes(key), `Apps Script defaults me ${key} missing`);
  }
  const publicKeys = gas
    .slice(gas.indexOf("var PUBLIC_SETTING_KEYS"), gas.indexOf("];", gas.indexOf("var PUBLIC_SETTING_KEYS")))
    // comments hata do — sirf asli array keys check honi chahiye
    .replace(/\/\/.*$/gm, "");
  assert.match(publicKeys, /youpi_pay_url/);
  assert.doesNotMatch(publicKeys, /youpi_webhook_secret/, "secret public keys me nahi");

  assert.ok(exists("docs/09-devops/youpi-payment-gateway.md"), "setup doc missing");
});
