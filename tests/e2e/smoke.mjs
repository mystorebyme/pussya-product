#!/usr/bin/env node
/**
 * Zero-dependency smoke test — build ke baad chalta hai.
 *   npm run build:web && npm run start --workspace @noor/web &
 *   npm run test:smoke            (default http://localhost:3000)
 *   BASE_URL=https://noorethnicwear.in npm run test:smoke
 *
 * Koi browser nahi chahiye — HTML/JSON par assertions. CI me Playwright se pehle yeh fast gate hai.
 */
const BASE = process.env.BASE_URL ?? "http://localhost:3000";

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
  const text = await response.text();
  return { status: response.status, text, headers: response.headers };
}

async function main() {
  console.log(`smoke: ${BASE}\n`);

  const health = await get("/api/health");
  const healthBody = JSON.parse(health.text);
  check("health 200", health.status === 200, `status ${health.status}`);
  // 287 noor products + extra store (guest) products daily sync se
  check(
    "health reports the live catalogue size",
    healthBody.data?.products >= 287,
    String(healthBody.data?.products),
  );

  // R38: sheet pipeline ka public report card — owner browser me khol kar khud
  // diagnose karta hai (settings kahan se aa rahi, script version/token/sheet,
  // last write ka nateeja). Secret (URL/token) kabhi expose nahi hona chahiye.
  const sheetHealth = await get("/api/sheet-health");
  check("sheet-health 200", sheetHealth.status === 200, `status ${sheetHealth.status}`);
  const sheetBody = JSON.parse(sheetHealth.text);
  check("sheet-health no-store", /no-store/.test(sheetHealth.headers.get("cache-control") ?? ""));
  check("sheet-health orders store batata hai", ["postgres", "file"].includes(sheetBody.ordersStore), String(sheetBody.ordersStore));
  check("sheet-health help array deta hai", Array.isArray(sheetBody.help));
  check("sheet-health expectedSheetId deta hai", typeof sheetBody.sheet?.expectedSheetId === "string" && sheetBody.sheet.expectedSheetId.length > 10);
  check("sheet-health secret expose nahi karta", !/script\.google\.com\/macros|GOOGLE_SHEETS_TOKEN=/.test(sheetHealth.text));

  const home = await get("/");
  check("home 200", home.status === 200, `status ${home.status}`);
  check("home lists products", /\/products\/[a-z0-9-]+/.test(home.text));
  check("home has brand name", /Noor Ethnic Wear/i.test(home.text));
  check("home has support number", /wa\.me\/91\d{10}/.test(home.text) || /WhatsApp \d{10}/.test(home.text));
  check("home has the live announcement bar", /announcement-bar/.test(home.text));
  check(
    "home has no service-tile strip (removed on request)",
    !/100% SECURE PAYMENT/i.test(home.text) && !/7 DAYS REPLACEMENT/i.test(home.text),
  );
  check("home shows category counts from the live store", /ANARKALI SUIT/i.test(home.text) && /Products/i.test(home.text));
  check("home hero pricing paragraph removed (Round 12)", !/No hidden charges/i.test(home.text));
  // R37: desktop header bar — nav apni centered row me (logo se overlap nahi)
  check("home has the desktop nav row", home.text.includes('data-testid="desktop-nav"'));
  // R37 (owner): "wedding wale circle me image nahi dikh rhi" — ab har circle me img hai
  const circles = /data-testid="category-circles"[\s\S]*?<\/section>/.exec(home.text)?.[0] ?? "";
  const circleLinks = (circles.match(/href="\/collections\/[a-z-]+"/g) ?? []).length;
  const circleImages = (circles.match(/<img/g) ?? []).length;
  check(
    "home wedding circle me image hai (saare circles me)",
    circles.includes("/collections/wedding-collection") && circleImages >= circleLinks && circleLinks >= 7,
    `links ${circleLinks} images ${circleImages}`,
  );
  check("tab title carries the brand name", /<title>[^<]*Noor Ethnic Wear[^<]*<\/title>/i.test(home.text));

  const manifest = await get("/manifest.webmanifest");
  check("manifest served for installed app", manifest.status === 200 && /Noor Ethnic Wear/.test(manifest.text), `status ${manifest.status}`);

  const collection = await get("/collections/lehnga-choli");
  check("collection 200", collection.status === 200, `status ${collection.status}`);
  check("collection has products", /\/products\/[a-z0-9-]+/.test(collection.text));

  const catalog = JSON.parse(await (await fetch(`${BASE}/api/products?perPage=60&sort=price-low`)).text());
  const items = catalog.data ?? [];
  // order ke liye: multi-size product (size validation test karta hai)
  const product = items.find((item) => (item.sizes?.length ?? 0) > 1 && item.price <= 350_000) ?? items[0];
  // PDP gallery ke liye: jiski live gallery me kai images hain
  const galleryProduct = items.find((item) => (item.images?.length ?? 0) >= 3) ?? product;
  check("products api returns data", Boolean(product), JSON.stringify(catalog).slice(0, 120));

  if (product) {
    const pdp = await get(`/products/${galleryProduct.handle}`);
    check("PDP 200", pdp.status === 200, `status ${pdp.status}`);
    check("PDP shows price", pdp.text.includes("Rs."));
    check("PDP has add to cart", /Add to cart/i.test(pdp.text));
    check("PDP has size options", /\[3[4-9]\]|\[4[0-9]\]|Free Size/.test(pdp.text));
    const gallerySlides = (pdp.text.match(/gallery-slide/g) ?? []).length;
    check(
      "PDP renders a real gallery (multiple images)",
      gallerySlides >= 2,
      `${gallerySlides} slides for ${galleryProduct.handle} (${galleryProduct.images?.length ?? 0} images)`,
    );
    check("PDP shows the live description", /Product Details/i.test(pdp.text));
    // badi image cut nahi honi chahiye — frame contain karta hai
    check(
      "PDP main image is contained (no crop)",
      pdp.text.includes('data-testid="pdp-main-image-frame"') && /pdp-main-image-frame[^>]*/.test(pdp.text),
    );
    const containCount = (pdp.text.match(/object-contain/g) ?? []).length;
    check("PDP gallery uses object-contain", containCount >= 1, `${containCount} matches`);
    // reviews: sirf asli Trustoo data. Rating 0/na ho to JSON-LD me aggregateRating nahi hona chahiye
    check("PDP has a review block", pdp.text.includes('data-testid="product-reviews"'));
    const liveReviews = Number(galleryProduct.reviewCount ?? 0);
    check(
      "PDP aggregateRating appears only with real reviews",
      liveReviews > 0 ? /"aggregateRating"/.test(pdp.text) : !/"aggregateRating"/.test(pdp.text),
      `${liveReviews} reviews for ${galleryProduct.handle}`,
    );
    // koi generated "verified" sample review public page par nahi
    check("PDP shows no sample reviews", !/sample review|Verified buyer[\s\S]{0,40}sd-/.test(pdp.text));
    check("PDP has WhatsApp order beside Buy now", pdp.text.includes('data-testid="pdp-whatsapp-order"'));
  }

  // ── phone OTP + GST invoice + tracking ──
  const otpStatus = JSON.parse(await (await fetch(`${BASE}/api/otp/status`)).text());
  check("otp status endpoint responds", typeof otpStatus.required === "boolean", JSON.stringify(otpStatus));

  let phoneToken;
  if (otpStatus.mode === "dev") {
    const start = await fetch(`${BASE}/api/otp/start`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "9876543210" }),
    });
    const started = await start.json();
    check("dev OTP code issued", Boolean(started.devCode), JSON.stringify(started).slice(0, 120));
    const verified = await fetch(`${BASE}/api/otp/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", code: started.devCode }),
    });
    const verifiedBody = await verified.json();
    check("OTP verify issues a phone token", verified.status === 200 && Boolean(verifiedBody.phoneToken));
    phoneToken = verifiedBody.phoneToken;

    const wrong = await fetch(`${BASE}/api/otp/verify`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ phone: "9876543210", code: "000000" }),
    });
    check("wrong OTP is rejected", wrong.status === 401, `status ${wrong.status}`);
  }

  const search = JSON.parse(await (await fetch(`${BASE}/api/search?q=anarkali`)).text());
  const searchCount = search.results?.length ?? search.data?.length ?? 0;
  check("search returns hits", searchCount > 0, String(searchCount));

  const orderPayload = {
      customerName: "Smoke Test",
      email: "smoke@example.com",
      phone: "9876543210",
      address: "12 MI Road, Panch Batti",
      city: "Jaipur",
      state: "Rajasthan",
      pincode: "302001",
      paymentMethod: "prepaid",
    items: [{ handle: product?.handle, size: product?.sizes?.[1] ?? product?.sizes?.[0], quantity: 1 }],
  };

  if (otpStatus.required) {
    const blocked = await fetch(`${BASE}/api/orders`, {
      method: "POST",
      headers: { "content-type": "application/json", "idempotency-key": `smoke-blocked-${Date.now()}` },
      body: JSON.stringify({ ...orderPayload, phoneToken: undefined }),
    });
    check("order without verified phone is blocked", blocked.status === 400, `status ${blocked.status}`);
  } else {
    check("checkout has no OTP gate (Round 12)", otpStatus.required === false);
  }

  const order = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `smoke-${Date.now()}` },
    body: JSON.stringify({ ...orderPayload, ...(phoneToken ? { phoneToken } : {}) }),
  });
  const orderBody = await order.json();
  check("order created", order.status === 201, `status ${order.status} ${JSON.stringify(orderBody).slice(0, 140)}`);

  // R37 (owner): "+91 / 91 / 0 prefix accept karo, 10 digit save karo"
  const prefixedOrder = await fetch(`${BASE}/api/orders`, {
    method: "POST",
    headers: { "content-type": "application/json", "idempotency-key": `smoke-prefix-${Date.now()}` },
    body: JSON.stringify({ ...orderPayload, phone: "+91 98765 43210" }),
  });
  const prefixedBody = await prefixedOrder.json();
  check(
    "order with +91 prefixed phone accepted",
    prefixedOrder.status === 201 && Boolean(prefixedBody.orderNumber),
    `status ${prefixedOrder.status} ${JSON.stringify(prefixedBody).slice(0, 120)}`,
  );

  if (orderBody.orderNumber) {
    const page = await get(`/orders/${orderBody.orderNumber}`);
    // R39 (owner): AWB se pehle note-box sheet-driven — default "Waiting for confirmation"
    check(
      "order page note-box default text dikhata hai",
      page.text.includes('data-testid="order-note-box"') && page.text.includes("Waiting for confirmation"),
    );
    check("order page 200", page.status === 200, `status ${page.status}`);
    check("order page shows number", page.text.includes(orderBody.orderNumber));
    check("order page has a tracking timeline", page.text.includes('data-testid="order-tracking"'));
    // R37: sheet = order ka DB — public tracking `?fresh=1` par bhi 200 deta hai
    const publicFresh = await get(`/api/orders/${orderBody.orderNumber}/public?fresh=1`);
    check("public tracking fresh read 200", publicFresh.status === 200, `status ${publicFresh.status}`);
    // R32 (owner): customer page se invoice download abhi band — sirf tracking.
    check(
      "order page has no invoice download (R32: only tracking)",
      !page.text.includes(`/orders/${orderBody.orderNumber}/invoice`) && !page.text.includes("Download invoice"),
    );
    check("order page shows the tracking section", page.text.includes("Order tracking"));

    const invoiceBlocked = await fetch(`${BASE}/api/orders/${orderBody.orderNumber}/invoice`);
    check("invoice needs phone verification", invoiceBlocked.status === 403, `status ${invoiceBlocked.status}`);

    const invoice = await fetch(`${BASE}/api/orders/${orderBody.orderNumber}/invoice?phone=3210`);
    const pdfBytes = new Uint8Array(await invoice.arrayBuffer());
    const pdfMagic = String.fromCharCode(...pdfBytes.slice(0, 5));
    check("GST invoice PDF downloads", invoice.status === 200 && pdfMagic === "%PDF-", `${invoice.status} ${pdfMagic}`);
    check("invoice PDF has content", pdfBytes.length > 1500, `${pdfBytes.length} bytes`);

    // R36 (owner): payment ab checkout ke **step 3** par hai, alag page nahi —
    // client ko amount/live UPI/status/return token isi API se milta hai.
    const payContext = await get(`/api/orders/${orderBody.orderNumber}/payment-context`);
    const payContextBody = JSON.parse(payContext.text);
    check("payment-context 200", payContext.status === 200, `status ${payContext.status}`);
    check(
      "payment-context carries the live UPI (sheet-first, not env default)",
      typeof payContextBody.data?.upi?.id === "string" && payContextBody.data.upi.id.includes("@"),
      JSON.stringify(payContextBody.data?.upi),
    );
    check("payment-context has a signed UPI return token", Boolean(payContextBody.data?.returnToken));
    check(
      "payment-context keeps email/address/full phone out (privacy)",
      !("email" in (payContextBody.data?.customer ?? {})) &&
        !("address" in (payContextBody.data?.customer ?? {})) &&
        typeof payContextBody.data?.customer?.phoneMasked === "string",
      JSON.stringify(payContextBody.data?.customer),
    );
    check("payment-context is never cached", /no-store/.test(payContext.headers.get("cache-control") ?? ""));
    const unknownContext = await get("/api/orders/NE-NOTREAL1/payment-context");
    check("payment-context 404 for an unknown order", unknownContext.status === 404, `status ${unknownContext.status}`);

    // step 3 ka URL — wahi order dobara kholne par payment yahin chalta hai.
    // (Checkout ka form client-side hai: server HTML me sirf Suspense fallback aata
    // hai, steps client par render hote hain — isliye yahan status check kaafi hai.)
    const stepThree = await get(`/checkout?step=payment&order=${orderBody.orderNumber}`);
    check("checkout step 3 URL renders", stepThree.status === 200, `status ${stepThree.status}`);
    check("checkout plain URL bhi 200", (await get("/checkout")).status === 200);

    // purane deep links (WhatsApp/email/QR) safe — wahi UPI card, par auto-redirect nahi
    const payPage = await get(`/orders/${orderBody.orderNumber}/pay`);
    check("payment deep link still works", payPage.status === 200, `status ${payPage.status}`);
    check(
      "R50: hand-off page ek WhatsApp CTA dikhata hai (koi payment card nahi)",
      payPage.text.includes('data-testid="confirm-whatsapp"') && /wa\.me\//.test(payPage.text),
    );
    check(
      "R50: hand-off page par koi UPI / payment UI nahi",
      !payPage.text.includes('data-testid="upi-open"') && !/Pay on UPI/.test(payPage.text),
    );
  }

  // admin → customer parity: status note aur payment verification
  const adminToken =
    process.env.ADMIN_API_TOKEN ?? (/localhost|127\.0\.0\.1/.test(BASE) ? "dev-admin-token" : "");
  if (orderBody.orderNumber && adminToken) {
    const adminPatch = (body) =>
      fetch(`${BASE}/api/admin/orders/${orderBody.orderNumber}`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
        body: JSON.stringify(body),
      });

    const noteResponse = await adminPatch({ action: "note", text: "Delhivery pickup kal subah", actor: "smoke@admin" });
    check("admin can save an order note", noteResponse.status === 200, `status ${noteResponse.status}`);

    const noted = await get(`/orders/${orderBody.orderNumber}`);
    check("customer page shows the admin note", noted.text.includes('data-testid="order-note"'));
    check("customer page renders the note text", noted.text.includes("Delhivery pickup kal subah"));

    const paidResponse = await adminPatch({
      action: "payment",
      reference: "UPI-SMOKE-1",
      amount: Math.round((orderBody.order?.total ?? orderBody.total ?? 0) || 0),
      actor: "smoke@admin",
    });
    const paidBody = await paidResponse.json().catch(() => ({}));
    check("admin can verify a manual payment", paidResponse.status === 200, `status ${paidResponse.status}`);
    check(
      "verified payment marks the order paid",
      paidBody.order?.paymentStatus === "paid",
      JSON.stringify(paidBody).slice(0, 140),
    );

    const paidPage = await get(`/orders/${orderBody.orderNumber}`);
    check("customer page shows verified payment", paidPage.text.includes('data-testid="payment-status"'));
    check("customer page shows the UTR reference", paidPage.text.includes("UPI-SMOKE-1"));

    const invoices = await fetch(`${BASE}/api/admin/invoices`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
      body: JSON.stringify({
        createdBy: "smoke@admin",
        customerName: "Smoke Invoice Customer",
        phone: "9876543210",
        address: "12 MI Road",
        city: "Jaipur",
        state: "Rajasthan",
        pincode: "302001",
        items: [{ title: "Chikankari Kurta", size: "M", quantity: 1, price: 199900 }],
      }),
    });
    const invoiceBody = await invoices.json().catch(() => ({}));
    check("admin can create a manual invoice", invoices.status === 201, `status ${invoices.status}`);
    check("manual invoice gets a series number", /^LK\/MANUAL\/\d+$/.test(invoiceBody.invoice?.number ?? ""));

    const invoiceList = await fetch(`${BASE}/api/admin/invoices`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const invoiceListBody = await invoiceList.json().catch(() => ({}));
    check(
      "manual invoices are listed back",
      invoiceList.status === 200 &&
        (invoiceListBody.invoices ?? []).some((row) => row.number === invoiceBody.invoice?.number),
      `status ${invoiceList.status}`,
    );

    const noToken = await fetch(`${BASE}/api/admin/invoices`);
    check("invoices API needs a token", noToken.status === 401, `status ${noToken.status}`);
  }

  // ── contact form (message save + admin inbox) ──
  const contact = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      name: "Smoke Visitor",
      email: "smoke-visitor@example.com",
      phone: "9876543210",
      subject: "Sizing help",
      message: "Smoke test message — size guide chahiye is product ke liye.",
    }),
  });
  const contactBody = await contact.json().catch(() => ({}));
  check("contact form accepts a message", contact.status === 201 && contactBody.ok === true, `status ${contact.status}`);
  check(
    "contact response gives a WhatsApp channel (no email on the site)",
    Boolean(contactBody.channels?.whatsapp) && !contactBody.channels?.mailto,
    JSON.stringify(contactBody).slice(0, 120),
  );

  const badContact = await fetch(`${BASE}/api/contact`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ name: "x", email: "not-an-email", message: "short" }),
  });
  check("contact form rejects invalid input", badContact.status === 400, `status ${badContact.status}`);

  if (adminToken) {
    const inbox = await fetch(`${BASE}/api/admin/messages`, {
      headers: { authorization: `Bearer ${adminToken}` },
    });
    const inboxBody = await inbox.json().catch(() => ({}));
    const saved = (inboxBody.messages ?? []).find((row) => row.email === "smoke-visitor@example.com");
    check("message reaches the admin inbox", Boolean(saved), `status ${inbox.status}`);
    if (saved) {
      const handled = await fetch(`${BASE}/api/admin/messages`, {
        method: "PATCH",
        headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` },
        body: JSON.stringify({ id: saved.id, action: "handled", actor: "smoke@admin" }),
      });
      const handledBody = await handled.json().catch(() => ({}));
      check("admin can mark a message handled", handledBody.message?.handled === true, `status ${handled.status}`);
    }
    const privateInbox = await fetch(`${BASE}/api/admin/messages`);
    check("messages API needs a token", privateInbox.status === 401, `status ${privateInbox.status}`);
  }

  // ── pincode message: koi internal data-source wording nahi ──
  const unknownPin = await get("/api/delivery/check?pincode=595454");
  const unknownBody = JSON.parse(unknownPin.text);
  check(
    "unknown pincode gets a neutral message",
    /valid indian pincode/i.test(unknownBody.data?.message ?? "") &&
      !/india post|record|admin|automated/i.test(unknownBody.data?.message ?? ""),
    unknownBody.data?.message,
  );

  // ── home rails har 10 minute me rotate hote hain ──
  const railA = await get("/api/rotation?rail=trendy&bucket=1000");
  const railB = await get("/api/rotation?rail=trendy&bucket=1001");
  const railABody = JSON.parse(railA.text);
  const railBBody = JSON.parse(railB.text);
  const handlesA = (railABody.products ?? []).map((product) => product.handle);
  const handlesB = (railBBody.products ?? []).map((product) => product.handle);
  check("rotation api returns products", handlesA.length > 0, String(handlesA.length));
  check("rotation changes with the 10-minute bucket", handlesA.join(",") !== handlesB.join(","));
  check("rotation payload is compact (max 2 images)", (railABody.products ?? []).every((product) => (product.images ?? []).length <= 2));

  const homeRails = await get("/");
  check("home renders rotating rails", homeRails.text.includes('data-testid="product-carousel"'));

  const missing = await get("/orders/NE-NOTREAL1");
  check("unknown order gives 404 page", missing.status === 404, `status ${missing.status}`);

  // delivery / pincode serviceability — asli data par
  const validPin = await get("/api/delivery/check?pincode=302001");
  const validBody = JSON.parse(validPin.text);
  check("valid pincode is serviceable", validBody.data?.serviceable === true, validPin.text.slice(0, 120));
  check("valid pincode resolves state", validBody.data?.state === "Rajasthan");

  const fakePin = await get("/api/delivery/check?pincode=999999");
  const fakeBody = JSON.parse(fakePin.text);
  check("fake pincode is rejected", fakeBody.data?.serviceable === false, fakePin.text.slice(0, 120));

  const shortPin = await get("/api/delivery/check?pincode=0123");
  check("invalid pincode returns 400", shortPin.status === 400, `status ${shortPin.status}`);

  const settings = await get("/api/settings");
  check("public settings 200", settings.status === 200, `status ${settings.status}`);
  const settingsBody = JSON.parse(settings.text);
  check(
    "settings expose the UPI id customers pay to",
    typeof settingsBody.data?.upiId === "string" && settingsBody.data.upiId.includes("@"),
    settingsBody.data?.upiId,
  );
  check(
    "settings expose support WhatsApp only (owner rule: no email anywhere)",
    Boolean(settingsBody.data?.whatsapp) && !("supportEmail" in (settingsBody.data ?? {})),
    JSON.stringify(settingsBody.data).slice(0, 160),
  );

  // festive sale: hero poster + ₹499–₹699 final prices
  // hero: teen device-specific poster (mobile/tablet/desktop) — ek hi download hota hai
  check("home hero ships a mobile banner", home.text.includes("/images/banners/banner-mobile.webp"));
  check("home hero ships a tablet banner", home.text.includes("/images/banners/banner-tablet.webp"));
  check("home hero ships a desktop banner", home.text.includes("/images/banners/banner-desktop.webp"));
  check(
    "hero uses <picture> with min-width media queries",
    /<picture>[\s\S]{0,600}min-width:1024px[\s\S]{0,600}min-width:768px/.test(home.text),
  );
  // logo: device-specific variants, ek hi <picture> me
  check("header logo has desktop/tablet/mobile variants", ["logo-desktop.png", "logo-tablet.png", "logo-mobile.png"].every((file) => home.text.includes(file)));
  check("tab icon points at the brand logo", /rel="icon"[^>]*\/images\/brand\/logo-mark/i.test(home.text));
  const salePrices = [...home.text.matchAll(/Rs\. (499|549|599|649|699)\b/g)].map((match) => match[1]);
  check("home lists sale prices (499/549/599/649/699)", salePrices.length > 0, String(salePrices.length));
  check(
    "no old full-price MRP leaks as selling price",
    !/Rs\. 2,999/.test(home.text) || home.text.includes("Rs. 499"),
  );

  // track order — footer link se 404 nahi aata
  const trackPage = await get("/pages/track-order");
  check("track-order page 200", trackPage.status === 200, `status ${trackPage.status}`);
  check("track-order has the form", trackPage.text.includes('data-testid="track-order-form"'));
  const trackShort = await get("/track-order");
  check("/track-order 200", trackShort.status === 200, `status ${trackShort.status}`);

  // UPI payment reference validation
  const badReference = await fetch(`${BASE}/api/payments/manual`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber: "NE-NOTREAL1", reference: "x" }),
  });
  check("payment reference validation rejects junk", badReference.status === 400, `status ${badReference.status}`);
  const unknownOrder = await fetch(`${BASE}/api/payments/manual`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ orderNumber: "NE-NOTREAL1", reference: "412345678901" }),
  });
  check("payment reference for unknown order is 404", unknownOrder.status === 404, `status ${unknownOrder.status}`);

  const privateDelivery = await get("/api/admin/delivery");
  check("admin delivery API needs token", privateDelivery.status === 401, `status ${privateDelivery.status}`);

  const sitemap = await get("/sitemap.xml");
  check("sitemap 200", sitemap.status === 200, `status ${sitemap.status}`);
  check("sitemap has product urls", sitemap.text.includes("/products/"));

  console.log(`\nsmoke: ${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.error(failures.map((failure) => ` - ${failure}`).join("\n"));
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("smoke crashed:", error);
  process.exit(1);
});
