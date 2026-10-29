# Round 17 — checkout, sheet-live content, titles (2026-10-24)

Owner ke R17 points + wo audit (jo mostly **purane deploy** par based tha). Neeche sirf
wo cheezein hain jo is round me actually badli/verify hui.

---

## 1. Kya badla

| # | Owner ka point | Kya hua | File(s) |
|---|---|---|---|
| 1 | Checkout par UPI detail **bilkul nahi** | checkout se UPI ID/QR/brand-name hata; sirf "prepaid" note. Payment page sirf order place hone ke baad (`/orders/<NE-…>?pay=1`) | `components/checkout-form.tsx`, `components/upi-apps.tsx` (deleted) |
| 2 | Payment app turant khule | order page par mobile UA par 600ms baad `window.location.href = upi://…`; QR + UPI ID fallback + refresh hint | `components/upi-payment.tsx` |
| 3 | **Call option nahi, sirf WhatsApp** | header, footer, contact, order page — `tel:` links 0; sab `wa.me` + sheet ka number | `site-header.tsx`, `site-footer.tsx`, `contact-details.tsx` |
| 4 | **Location public par nahi** | JSON-LD address sirf `addressCountry: IN`; invoice/config/PDF "India"; admin header "Noor Ethnic Wear · India" | `app/page.tsx`, `config/site.ts`, `lib/invoice*.ts` |
| 5 | **Sheet me badla → site par live** | naye `ShippingNote` / `WhatsAppLink` / `SupportChannels`; `StoreSettingsProvider` 30s + tab-focus refresh; hardcoded free-shipping/phone/email copy hata | `components/shipping-note.tsx`, `whatsapp-link.tsx`, `store-settings-provider.tsx`, `app/cart`, `app/checkout`, `pages/[slug]` |
| 6 | **Product titles theek** | typo map (Slik→Silk, Havy→Heavy, Desiner→Designer, Beutifull→Beautiful, Plazo→Palazzo, Frendy→Trendy, Duppta→Dupatta, Pent→Pant, Jari→Zari), backtick/curly apostrophe, ALL CAPS → Title Case (hyphen ke baad bhi), lagatar duplicate word, 85+ char description-titles trim, duplicate titles colour/style-code se unique | `scripts/build-catalog.mjs` |
| 7 | Order page crash par samajh na aaye | naya route error boundary — "Order abhi load nahi ho paya" + retry + WhatsApp (generic crash nahi) | `app/orders/[orderNumber]/error.tsx` |
| 8 | SEO | PDP canonical + OG url + Twitter card + **BreadcrumbList** schema | `app/products/[handle]/page.tsx` |

### Title cleanup ka result (catalog.json, 446 products)

- 136 titles badle, **446/446 unique** (pehle 49 duplicate).
- `Slik` 5, `Havy` 6, `Desiner` 2, `Beutifull` 3, `Plazo` 6, `Fendy/Frendy` 5, all-caps 57,
  duplicate-word 7 — sab 0 bache.
- Sabse lamba title 89 chars (pehle 156) — wo bhi ek unique suffix ke saath.
- Handle/URL **nahi badle** (purane links zinda), price/stock/images untouched.

## 2. Audit ke jo point code me pehle se theek the (verify kiya, dobara nahi chheda)

- **Sold-out "Add to cart"** — card button disabled + "Sold out", PDP buy-now disabled, server 409.
- **COD** — storefront copy me kahin nahi; server `cod` ko 400 deta hai.
- **COD/UPI contradiction** — PDP par "prepaid only, COD available nahi" clear hai.
- **Reviews** — koi generated/sample review nahi; badge sirf `verified === true`; count 0 par stars hide.
- **Empty saree collection** — nav/sitemap me nahi, direct URL par friendly empty + `noindex`.
- **Wedding URL** — `/collections/wedding-collection` 200, canonical asli handle par.
- **`/pages/size-cheart`** — ab `/pages/size-guide`, purana slug alias + canonical.
- **Banners** — mobile 860×1290, tablet 1200×900 (blur composite, chehre safe), desktop 1779×594;
  wrapper ka `aspect-ratio` assets se exactly match karta hai → stretch/crop nahi, CLS 0.
- **Infinite scroll** — IntersectionObserver + agla page preload + click fallback; static preview
  par `catalog-lite.json` fallback.
- **Contact messages** — DB me save, `replied` flag + admin mark/undo + sheet status.
- **Best sellers** — asli orders ke qty se rank, curated fallback.

## 3. Owner action chahiye (code se nahi hoga)

1. **Render deployment** — `https://noorclothing.onrender.com` abhi **har** path par
   `Not Found` (`/api/health` bhi). Isliye live site par order place / order page / tracking /
   admin sab nahi chalte. Render dashboard → service → **Manual Deploy**; agar free Postgres
   expire hua hai to naya DB + `DATABASE_URL`. Ye hi wajah hai "order page nahi khul raha".
2. **Domain** — `NEXT_PUBLIC_SITE_URL` set karke domain jodna hai (aapne kaha "baad me").
3. **Banner artwork** — R17 me aapne "banner artwork ki zarurat nahi" kaha tha, isliye abhi
   tak poster hero hi hai. Neeche 4 options hain.
4. **Location policy** — invoice/dispatch par state nahi chhapti (sirf "India"). GST invoice ke
   liye seller ka poora address + GSTIN chahiye — sheet `gstin` + admin settings se aata hai.
5. **Marketing email / socials** — abhi source store wala `owner ka apna Google account` aur
   `instagram.com/noorethnicwear`. Naya brand email chahiye to bataiye (sheet se badal jayega).

## 4. Tests (is round me chalaye gaye)

| Test | Result |
|---|---|
| `npx tsc --noEmit -p apps/web` (+ admin) | ✅ clean |
| `next build` (web) | ✅ 446 product pages + 11 collections + policies/pages |
| `tests/e2e/smoke.mjs` | **87 / 0** |
| `tests/e2e/responsive.mjs` | **42 / 0** |
| `tests/e2e/round16.mjs` | **37 / 0** |
| `tests/e2e/breakpoints.mjs` | **48 / 0** (18 viewports) |
| `tests/e2e/links.mjs` | **40 pages crawled / 0 broken** |
| GitHub Actions CI + Pages preview | ✅ (commit `1ead6db`) |

Screenshot caveat wahi hai: sandbox me headless browser nahi, isliye verification HTML/CSS +
asset geometry level par hai.
