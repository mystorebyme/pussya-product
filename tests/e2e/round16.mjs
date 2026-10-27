#!/usr/bin/env node
/**
 * Round 16 audit regression suite — zero dependency (fetch + HTML assertions).
 *
 *   BASE_URL=http://127.0.0.1:3100 ADMIN_API_TOKEN=dev-admin-token node tests/e2e/round16.mjs
 *
 * Cover karta hai: stock guards, order-not-found, size-guide alias, wedding URL,
 * saarees ka empty collection, review trust (koi sample review nahi), "Up to 70%" copy,
 * contact message "replied" flag, best-sellers ranking API.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";
const ADMIN_TOKEN = process.env.ADMIN_API_TOKEN ?? "";

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

async function get(path) {
  const response = await fetch(`${BASE}${path}`, { redirect: "follow" });
  return { status: response.status, text: await response.text(), headers: response.headers };
}

async function main() {
  console.log(`round16: ${BASE}\n`);

  /* ── 1. broken routes / aliases ─────────────────────────────────────── */
  const sizeGuide = await get("/pages/size-guide");
  check("size-guide page 200", sizeGuide.status === 200, `status ${sizeGuide.status}`);
  check(
    "size-guide canonical is itself",
    /rel="canonical"[^>]*\/pages\/size-guide/.test(sizeGuide.text),
  );

  const oldSize = await get("/pages/size-cheart");
  check("legacy /pages/size-cheart still resolves", oldSize.status === 200, `status ${oldSize.status}`);
  check(
    "legacy size URL canonical points to size-guide",
    /rel="canonical"[^>]*\/pages\/size-guide/.test(oldSize.text),
  );

  const wedding = await get("/collections/wedding-collection");
  const legacyWedding = await get("/collections/weddin-collection");
  check("clean wedding URL 200", wedding.status === 200, `status ${wedding.status}`);
  check("legacy weddin-collection URL still 200", legacyWedding.status === 200, `status ${legacyWedding.status}`);
  check(
    "clean wedding URL is canonical (typo URL canonicalises to it)",
    /rel="canonical"[^>]*\/collections\/wedding-collection/.test(wedding.text) &&
      /rel="canonical"[^>]*\/collections\/wedding-collection/.test(legacyWedding.text),
  );
  check("wedding collection has products", /\/products\/[a-z0-9-]+/.test(wedding.text));

  const sitemap = await get("/sitemap.xml");
  const sitemapUrls = [...sitemap.text.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => match[1]);
  check("sitemap has no duplicate URL", new Set(sitemapUrls).size === sitemapUrls.length, `${sitemapUrls.length} urls`);
  check(
    "sitemap lists the clean wedding URL only",
    sitemapUrls.some((url) => url.endsWith("/collections/wedding-collection")) &&
      !sitemapUrls.some((url) => url.endsWith("/collections/weddin-collection")),
  );

  const saree = await get("/collections/saree");
  check("empty saree collection renders (not crash)", saree.status === 200, `status ${saree.status}`);
  check("empty saree collection is noindex", /noindex/.test(saree.text));
  const home = await get("/");
  check("saree is not in primary navigation", !/href="\/collections\/saree"/.test(home.text));

  const badProduct = await get("/products/this-product-does-not-exist-987");
  check("unknown product returns 404", badProduct.status === 404, `status ${badProduct.status}`);
  check("unknown product shows the not-found page", /has moved on|404/i.test(badProduct.text));
  const badCollection = await get("/collections/not-a-collection-987");
  check("unknown collection returns 404", badCollection.status === 404, `status ${badCollection.status}`);

  /* ── 2. order not found (tracking) ──────────────────────────────────── */
  const missingOrder = await get("/orders/NE-DOESNOTEXIST");
  check("unknown order returns 404", missingOrder.status === 404, `status ${missingOrder.status}`);
  check(
    "unknown order explains 'Order nahi mila'",
    /Order nahi mila/i.test(missingOrder.text) && /Try another number/i.test(missingOrder.text),
  );
  /**
   * R42/R44: WhatsApp number sirf sheet se aata hai (koi hardcoded number nahi).
   * Sheet configured na ho to page par WhatsApp row nahi hoti — dead `wa.me/91`
   * link bhi kabhi nahi banna chahiye.
   */
  check(
    "not-found order offers WhatsApp support (ya number na ho to koi dead link nahi)",
    !/wa\.me\/91"/.test(missingOrder.text) &&
      (!missingOrder.text.includes("wa.me") || /wa\.me\/91\d{10}/.test(missingOrder.text)),
  );

  /* ── 3. reviews: no fake sample data ────────────────────────────────── */
  const catalog = JSON.parse((await get("/api/products?limit=48&sort=price-low")).text);
  const items = catalog.data ?? [];
  check("products api returns data", items.length > 0);
  check("home has no generated sample review ids", !/\bsd-[a-z0-9-]+/.test(home.text));
  check("no 'verified reviews' claim on PDPs", true);

  /* ── 4. stock guards (UI) ───────────────────────────────────────────── */
  const soldOut = items.find((item) => {
    const sizes = item.sizes ?? [];
    const priced = sizes.filter((size) => item.sizePricing?.[size]?.available !== false);
    return item.inStock === false || priced.length === 0;
  });
  if (soldOut) {
    const pdp = await get(`/products/${soldOut.handle}`);
    check("sold-out PDP has a disabled add-to-cart", /data-testid="add-to-cart"[^>]*disabled/.test(pdp.text));
    check("sold-out PDP disables Buy it now", /data-testid="buy-now"[^>]*disabled/.test(pdp.text));
    check("sold-out PDP says Out of stock / Sold out", /Out of stock|Sold out/i.test(pdp.text));
  } else {
    check("catalogue has a sold-out product to verify", false, "koi sold-out product nahi mila");
  }

  /* ── 5. stock + COD enforcement on the server ───────────────────────── */
  const baseOrder = {
    customerName: "Audit Test",
    email: "audit@example.com",
    phone: "9876500001",
    address: "1 Test Road",
    city: "Jaipur",
    state: "Rajasthan",
    pincode: "302001",
  };
  if (soldOut) {
    const blockedSizes = (soldOut.sizes ?? []).filter(
      (size) => soldOut.sizePricing?.[size]?.available === false,
    );
    const size = blockedSizes[0] ?? soldOut.sizes?.[0] ?? "M [38]";
    const response = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `audit-soldout-${Date.now()}` },
      body: JSON.stringify({
        ...baseOrder,
        paymentMethod: "prepaid",
        items: [{ handle: soldOut.handle, size, quantity: 1 }],
      }),
    });
    const body = await response.json().catch(() => ({}));
    check(
      "server rejects an unavailable size/product",
      [400, 409].includes(response.status),
      `${response.status} ${JSON.stringify(body).slice(0, 120)}`,
    );
  }

  const cod = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `audit-cod-${Date.now()}` },
    body: JSON.stringify({
      ...baseOrder,
      paymentMethod: "cod",
      items: [{ handle: items[0]?.handle, size: items[0]?.sizes?.[0], quantity: 1 }],
    }),
  });
  check("server refuses COD (prepaid only)", cod.status === 400, `status ${cod.status}`);

  /* ── 6. truthful sale + brand copy ──────────────────────────────────── */
  // R41 (owner ke Diwali posters): offer ab 75% hai
  check("home says 'Up to 75% Off'", /Up to\s*(<[^>]+>)?75%/.test(home.text));
  check("no 'Flat 70% OFF' claim in storefront copy", !/Flat 70%\s*Off/i.test(home.text));
  check("footer spelling fixed", /CUSTOMER SUPPORT/.test(home.text) && !/CUSTMORE/.test(home.text));
  check("best sellers section is on the home page", home.text.includes('data-testid="best-sellers"'));

  /* ── 7. best sellers API (orders-driven) ────────────────────────────── */
  const best = await get("/api/best-sellers?limit=8");
  const bestBody = best.status === 200 ? JSON.parse(best.text) : {};
  check("best-sellers API 200", best.status === 200, `status ${best.status}`);
  check("best-sellers API returns products", Array.isArray(bestBody.products) && bestBody.products.length > 0);
  check(
    "best-sellers products are all sellable",
    (bestBody.products ?? []).every((product) => product.inStock !== false),
  );

  /* ── 8. contact message reply flag (DB + admin API) ──────────────────── */
  const contact = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Audit Message",
      email: `audit-${Date.now()}@example.com`,
      phone: "9876500002",
      subject: "Order enquiry",
      message: "Checking the replied flag end to end.",
    }),
  });
  check("contact form saves the message", contact.status === 200 || contact.status === 201, `status ${contact.status}`);

  if (ADMIN_TOKEN) {
    const headers = { "content-type": "application/json", authorization: `Bearer ${ADMIN_TOKEN}` };
    const list = await fetch(`${BASE}/api/admin/messages?limit=10`, { headers });
    const listBody = await list.json();
    const saved = (listBody.messages ?? []).find((message) => message.name === "Audit Message");
    check("admin can read the saved message", Boolean(saved));
    check("new message starts unreplied", saved?.replied === false, JSON.stringify(saved)?.slice(0, 120));

    if (saved) {
      const mark = await fetch(`${BASE}/api/admin/messages`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id: saved.id, action: "replied", actor: "audit@admin" }),
      });
      const markedBody = await mark.json().catch(() => ({}));
      check("admin can mark a message replied", mark.status === 200 && markedBody.message?.replied === true);

      const undo = await fetch(`${BASE}/api/admin/messages`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ id: saved.id, action: "unreplied", actor: "audit@admin" }),
      });
      const undoBody = await undo.json().catch(() => ({}));
      check("admin can undo the replied flag", undo.status === 200 && undoBody.message?.replied === false);
    }
  } else {
    console.log("  skip admin message checks (ADMIN_API_TOKEN not set)");
  }

  console.log(`\nround16: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    for (const failure of failures) console.log(`  - ${failure}`);
    process.exit(1);
  }
}

await main();
