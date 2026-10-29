# Round 16 — full-site audit, fixes & verification (2026-10-24)

Owner ka audit prompt: trust/inventory, broken routes, brand consistency, responsive QA,
checkout/DB, performance. Neeche **jo actually verify hua** wahi likha hai; jo browser me
test nahi ho saka (screenshots) wo alag se marked hai.

---

## 1. Confirmed issues → kya fix hua

| # | Issue | File(s) | Status |
|---|---|---|---|
| 1 | 1,273 generated "sample" reviews public pages par dikh sakte the, aur badge `verified !== false` se **fake verified** ban sakta tha | `apps/web/src/lib/reviews.ts`, `components/product-reviews.tsx` | ✅ seed data delete, badge sirf `verified === true`, copy "customer reviews" |
| 2 | Review totals mismatch: `review-aggregates.json` me `rating: 0` + `count: 31` → UI "0.0 / 5, based on 31" | `reviews.ts`, sync script, PDP JSON-LD | ✅ rating 0 par stars/avg hide, JSON-LD aggregateRating sirf real rating par |
| 3 | Sold-out product ka "Add to cart" active tha (18 products, 17 `inStock:false`) | `components/product-card.tsx`, `product-detail.tsx`, `lib/orders.ts` | ✅ button disabled + "Sold out", buy-now disabled, server 409 |
| 4 | Server COD accept karta tha, site prepaid-only | `lib/orders.ts` | ✅ `paymentMethod: "cod"` → 400 `cod_not_allowed` |
| 5 | `/pages/size-cheart` typo account + sitemap me | `app/account/page.tsx`, `app/sitemap.ts`, `app/pages/[slug]/page.tsx` | ✅ correct URL + legacy alias (200, canonical → size-guide) |
| 6 | `/collections/saree` khaali | `app/collections/*`, `lib/store.ts` | ✅ nav me nahi, page friendly empty + `noindex`, sitemap se bahar |
| 7 | Wedding URL `weddin-collection` | `app/collections/[handle]/page.tsx`, `lib/store.ts`, footer/home | ✅ `/collections/wedding-collection` 200 + canonical to real handle, purana URL bhi chalta hai |
| 8 | "Flat 70% OFF" jabki 86 products 60% par | `app/page.tsx`, announcement defaults | ✅ copy/alt "Up to 70% OFF" (banner artwork owner ka hai, usme text baked hai — neeche decisions) |
| 9 | Footer `CUSTMORE SUPPORT` | `components/site-footer.tsx` | ✅ `CUSTOMER SUPPORT` |
| 10 | Admin branding "Noor Admin" | `apps/admin/src/app/layout.tsx` | ✅ "Noor Ethnic Wear Admin" |
| 11 | Order tracking link 404 par generic "page moved on" | `app/orders/[orderNumber]/not-found.tsx` (naya) | ✅ "Order nahi mila" + WhatsApp support + try another number |
| 12 | Order number lowercase par na khule | `lib/orders.ts` (`normalizeOrderNumber`) | ✅ trim + uppercase, saare lookups |
| 13 | Pages preview par "Load more" fail (`/api/products` static export me nahi) | `components/collection-browser.tsx`, `scripts/pages/build-preview.mjs` | ✅ client-side `catalog-lite.json` fallback + prefetch |
| 14 | Contact form preview/API-down par bas "network error" | `components/contact-form.tsx`, `site-footer.tsx` | ✅ email + WhatsApp fallback prefilled |
| 15 | "Send us a message" ka reply track nahi hota tha | `lib/messages.ts`, `api/admin/messages`, admin UI, `0006_message_replies.sql` | ✅ `replied` flag (DB + sheet + admin mark/undo) |
| 16 | Best sellers static list | `lib/best-sellers.ts`, `/api/best-sellers`, `best-sellers-rail.tsx`, home | ✅ ranking asli orders (qty sold) se, curated fallback |
| 17 | Tracking CTA dead live-store par bhi "open" dikhta tha | `components/track-order-form.tsx` | ✅ health check (2.5s) → offline par honest message + WhatsApp |
| 18 | Pages preview canonical live store par jaata tha | `.github/workflows/pages.yml` | ✅ `NEXT_PUBLIC_SITE_URL` = Pages URL |

## 2. Audit ke jo points **code me galat nahi the** (verify karke chhode)

- **COD/prepaid contradiction PDP par:** storefront copy me kahin "COD available" nahi tha;
  ab shipping accordion aur bhi explicit hai ("prepaid only, COD available nahi"). Jaisa
  audit me tha waisa text nahi mila — server-side COD hole (#4) asli issue tha, wo band.
- **Contact/WhatsApp/socials:** phone/WhatsApp , Instagram `noorethnicwear`,
  UPI `` — owner-approved values hi hain.
- **Product titles ("Slik", "Havy")** source catalogue ke asli Shopify titles hain. Owner ne
  kaha tha "genuine product names bina verify kiye change mat karo" — isliye chhode, list
  neeche decisions me.
- **`/pages/privacy-policy` vs `/policies/privacy-policy`:** ab sirf `/policies/*` exist
  karta hai (sitemap/canonical wahi); purana route 404 deta hai — duplicate thin page nahi.

## 3. Owner confirmation chahiye (main invent nahi karunga)

1. **Business location:** structured data + invoice + dispatch copy = **Jaipur, Rajasthan**;
   About Us me pehle "studio in Surat" likha tha (ab city hata di, contradiction khatam).
   Confirm karein: Jaipur ya Surat? Address/GSTIN invoice par chhapta hai.
2. **Sale wording:** HTML copy ab "Up to 70% OFF". Banner artwork me "FLAT 70% OFF" baked hai —
   agar artwork bhi badalna hai to naya poster chahiye (ya hum text overlay karke bana dein).
3. **Support email:** abhi `owner ka apna Google account` (source store se). Naya brand email
   dena ho to `SELLER_EMAIL` / sheet settings se badal jayega.
4. **Render deployment:** `https://noorclothing.onrender.com` abhi har path par plain
   `Not Found` de raha hai (health check bhi). Ye code ka bug nahi — Render service
   suspend/deleted/mis-configured lagti hai. Owner ko Render dashboard → service →
   Manual Deploy karna hoga; tab tak GitHub Pages preview browse ke liye chalta rahega
   aur tracking CTA "Live store abhi offline hai" dikhayega.
5. **Product title cleanup** ("Slik" → "Silk", "Havy" → "Heavy") — owner approval par
   `scripts/build-catalog.mjs` ke overrides se hoga, source data chhua nahi jayega.

## 4. Tests (jo actually chale)

- `npm test` → **89/89**
- `tests/e2e/smoke.mjs` → **86/0** (production build, local server)
- `tests/e2e/responsive.mjs` → **40/0** (local + static preview)
- `tests/e2e/breakpoints.mjs` → **48/0** (18 viewports; local + static preview with base path)
- `tests/e2e/round16.mjs` (naya) → **37/0** — routes, stock, COD, reviews, "Up to 70%",
  order-not-found, best-sellers, contact replied flag
- `tests/e2e/links.mjs` (naya) → **45 pages crawled, 0 broken**
- `next build` web ✅, admin ✅, GitHub Pages export ✅ (`dist/`)
- Typecheck web + admin ✅

**Screenshot caveat:** sandbox me headless browser nahi chalta (chromium network-blocked),
isliye responsive verification HTML/CSS + asset-geometry level par hai — real device
screenshots nahi. Live URL par manually confirm karna hoga.
