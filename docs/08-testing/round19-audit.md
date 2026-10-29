# Round 19 — full production audit (findings, fixes, owner actions)

Date: 2026-10-25 · Branch: `arena/f713eef1-tannu-product` · Commits: `c6e0194` … `bcc8be9`
Live: **https://noor-ethnic-wear.vercel.app** (store) · **https://noor-admin.vercel.app** (admin)
Static preview: https://mystorebyme.github.io/tannu-product-/

Yeh round ek **audit** tha: har point ko code + live site par verify kiya gaya. Neeche har claim ka
faisla hai — jo pehle hi fix tha, jo is round me fix hua, aur jo owner ke bina nahi ho sakta.

---

## 1. Audit claims — ek-ek ka verdict

| # | Audit ka point | Verdict | Proof |
| --- | --- | --- | --- |
| 1 | Empty **Saree** collection / dead links | ✅ Already fixed | `getCollections()` `saree` ko filter karta hai; `/collections` sirf `count > 0` cards dikhata hai; header/footer me saree link nahi. `links.mjs` 40/40 |
| 2 | **404 / broken routes** | ⚠️ Ek gap tha → fix | Saare internal links green (40/40). Naya gap: `/orders` (bina number) 404 deta tha → ab `307` → `/track-order`. |
| 3 | **Order tracking page "nahi khul raha"** | ✅ Root cause fix | (a) `/orders` (bina number) 404 deta tha → ab `307` → `/track-order`. (b) **Pages preview ka "Open live tracking" purane marhoom Render host par jaata tha** (`NEXT_PUBLIC_LIVE_STORE_URL` default) → ab `https://noor-ethnic-wear.vercel.app`. (c) Preview par form ab health check ke baad **khud** live tracking kholta hai. Production par `/orders/NE-…` seedha khulta hai (live verify). |
| 4 | **Reviews: fake/generated reviews strip karo, "verified" badge misuse** | ✅ Already clean | `src/data/reviews.json` sirf Trustoo se sync (151 products, 1690 reviews, real photos). `lib/reviews.ts` me koi seed/sample nahi. Badge `review.verified === true` par hi. |
| 5 | **Out-of-stock product "Add to cart"** | ✅ Already guarded | `product-card.tsx` (disabled + "Sold out" + `data-testid="sold-out-button"`), `product-detail.tsx` (size-level + product-level guard), server `createOrder()` stock check. |
| 6 | **`/pages/size-cheart` 404** | ✅ Already aliased | `pages/[slug]` me `size-cheart → size-guide` alias, canonical `/pages/size-guide`. PDP "Size guide" link live par 200. |
| 7 | **`/collections/wedding-collection` 404** | ✅ Already aliased | `lib/store.ts` alias map `wedding-collection → weddin-collection` (real Shopify handle). |
| 8 | **Preview/live confusion + stale deployment** | ⚠️ Real cause | GitHub Pages build purani commit par ruka hua tha → ab latest commit se rebuild (workflow). Pages par checkout/order **nahi** chalta by design; `/track-order` wahan live store ka link deta hai. |
| 9 | **"FLAT 70% OFF" galat claim** | ✅ Already correct | Live copy: "Diwali Sale — **Up to** 70% OFF · Final price ₹499 onwards". Poster artwork owner ka hai (change nahi kiya). |
| 10 | **COD contradiction** | ✅ Already prepaid-only | Catalog/pricing me COD hataya ja chuka; PDP copy: "Cash on Delivery available nahi hai"; checkout me sirf prepaid; `checkout-form.tsx` comment: "sirf prepaid". |
| 11 | **Brand name inconsistency (Noor Ethnic Wear vs Noor)** | ✅ Resolved | Store ka asli naam **Noor Ethnic Wear** hai (IG `noorethnicwear`, UPI name, invoice). "Noor" sirf domain/legacy handle hai. Poori site par ek hi naam — audit ka "Noor Clothing" assumption galat tha. |
| 12 | **"CUSTMORE SUPPORT" typo** | ✅ Not in code | Grep clean — sirf poster artwork ka text hai (owner ka original). Copy me kahin nahi. |
| 13 | **Checkout: total re-validate, order DB me save** | ✅ Done (R18) | `POST /api/orders` server par price/size/stock/pincode dobara check karta hai, phir `orders` + `order_items` + `order_status_history` me save. |
| 14 | **Payment confirm / pending / failed DB me** | ✅ Done (R18) | `payments` table + `orders.payment_status`; states `pending → processing → paid/failed/refunded`. Live proof `NE-MR4WO829RT` (processing), `NE-MR53QNMP83` (failed). |
| 15 | **Admin payment confirm + undo** | ✅ Done | admin → order → "Mark payment received" / undo; `409 payment_pending` jab tak paid na ho. |
| 16 | **WhatsApp order message: har item ka naam, size, price, qty, link** | ✅ Done | `lib/whatsapp.ts` → `orderWhatsAppMessage()` — items + link + total + address. |
| 17 | **Contact form replies DB me + admin UI** | ✅ Done | `contact_messages` table (`handled`, `replied`, `replied_at/by`), admin "Mark replied / Undo". |
| 18 | **Best sellers sirf order history se** | ✅ Done | `lib/best-sellers.ts` paid orders se rank karta hai, 0 orders par curated fallback; home rail + `/api/best-sellers`. |
| 19 | **Infinite scroll instant nahi** | ⚠️ Fix is round | `ProductGridWithMore` me `IntersectionObserver` (800px pehle se) auto-load + button fallback + duplicate-handle dedupe. |
| 20 | **Images slow** | ✅ Mostly | Local WebP banners, `loading="lazy"` + `decoding="async"` har card par, hero `eager` + `fetchPriority="high"` + fixed aspect ratios (CLS 0), CDN images `?width=` variants. |
| 20b | **Supplier-description titles** ("Presenting New Crunchy Silk Fabric … Dori and Zari Work Top with Dupatta Set Bell Bottom Pant Ready to Wear") | ⚠️ Fix is round | 10 aise titles the. Ab `TITLE_OVERRIDES` (build script me) se saaf title: "Crunchy Silk Embroidered Anarkali Suit Set" etc. Handle/URL same, 446/446 titles phir bhi unique. |
| 21 | **SEO basics** | ⚠️ Gaps fixed | Har page par 1 `<h1>`; 446/446 unique titles; PDP me Product + BreadcrumbList JSON-LD. Is round: site-wide **Organization + WebSite (SearchAction)** JSON-LD, `/search` **noindex** + canonical, canonical fallback dead Render host se **noorethnicwear.in**. |
| 22 | **Accessibility / broken navigation** | ⚠️ Small gap | Skip-to-content link add hua (`#main-content`), mobile drawer me `aria-expanded`, "Skip to content" keyboard se chalta hai. `tel:` links zero (sirf WhatsApp). |
| 23 | **Security: secrets frontend me nahi** | ✅ Verified | `ADMIN_API_TOKEN`, `DATABASE_URL`, sheet URL kabhi client bundle me nahi; UPI sirf payment page par (checkout par nahi); admin link public pages par nahi. |
| 24 | **Design consistency / typography** | ✅ Live match | Live Pages home/PDP capture: same palette `#862222`, serif display + Jost, same header/footer lockup. |

---

## 2. Is round me kya code change hua (`bcc8be9`)

| File | Change |
| --- | --- |
| `apps/web/src/components/product-grid-client.tsx` | auto infinite-scroll (`IntersectionObserver`, 800px rootMargin), ref-guard se double-fetch nahi, handle dedupe, button fallback |
| `apps/web/src/app/orders/page.tsx` | naya route → `/track-order` (307) |
| `apps/web/src/app/layout.tsx` | Organization + WebSite JSON-LD, `#main-content` + skip link |
| `apps/web/src/app/search/page.tsx` | `robots: noindex`, canonical `/search` |
| `scripts/build-catalog.mjs` + `apps/web/src/data/catalog.json` | 10 supplier-description titles → saaf product titles (override map, sync-safe) |
| `apps/web/src/lib/api-base.ts` + `.github/workflows/pages.yml` | preview ka live-store URL Render → Vercel |
| `apps/web/src/components/track-order-form.tsx` | preview par submit → live tracking auto-open (down ho to WhatsApp fallback) |
| `apps/admin/src/lib/data.ts` | fallback announcement "Flat 70% OFF" → "Up to 70% OFF" |
| `apps/web/src/config/site.ts` | canonical fallback `https://noorethnicwear.in` (Render dead host hataya) |
| `docs/10-deployment/live-vercel-supabase.md` | naya deploy guide (URLs, env, DB, payment flow) |
| `docs/08-testing/round18-audit.md` | R18 payment-flow audit |

---

## 3. Test results (is round, local + live)

| Suite | Result |
| --- | --- |
| `tests/e2e/payments.mjs` (local, admin token) | **27 / 0** |
| `tests/e2e/payments.mjs` (production, GitHub Actions) | **21 / 0** |
| `tests/e2e/smoke.mjs` | 87 / 0 |
| `tests/e2e/links.mjs` | 40 pages / 0 fail |
| `tests/e2e/responsive.mjs` | 42 / 0 |
| `tests/e2e/breakpoints.mjs` | 48 / 0 |
| `tests/e2e/round16.mjs` | 37 / 0 |
| `npm run test:unit` | 89 / 0 |
| `npm run test:integration` | 40 / 0 |
| `npm run test:db` | 9 / 0 |
| `tsc --noEmit` (web + admin) | 0 errors |
| `next build` (web) | 485 pages, success |

Live run (`[live-test]`, commit `6782adb`) production par **21/0** — order create → pay page →
UTR → `processing` → tracking page sab live pass. Us run ke test orders (items + payments) production
Supabase se delete kar diye — sirf dummy data tha; store me abhi koi real order nahi hai.

Note: rollout ke dauraan pehla live run fail hua (naya deployment abhi alias par nahi aaya tha) —
deployment READY hone ke baad dobara chalaya, 21/0. Isliye deploy ke turant baad live test na chalayein,
1–2 min rukein.

---

## 4. Owner ke bina nahi ho sakta — "kya karna hai"

1. **Domain lagana** (`noorethnicwear.in`): registrar ke DNS me Vercel ke records (`A 76.76.21.21`,
   `www CNAME cname.vercel-dns.com`). Iske baad Vercel env `NEXT_PUBLIC_SITE_URL=https://noorethnicwear.in`
   karke redeploy — canonical/OG/WhatsApp link khud badal jayenge.
2. **Admin login**: `https://noor-admin.vercel.app` — email `admin@noorethnicwear.in`, password
   Vercel env `ADMIN_PASSWORD` me set hai (chat me diya gaya). Password badalna ho to env update + redeploy.
3. **Supabase DB password rotate** (setup ke dauraan share hua tha) — Supabase → Settings → Database →
   Reset password → naya connection string Vercel `DATABASE_URL` me daalein.
4. **Tracking**: customer `NE-…` number `/track-order` me daale ya seedha `/orders/NE-…` khole —
   live status, courier, AWB wahin dikhta hai. Admin panel se status + AWB update karte rahein; customer
   ko WhatsApp par bhi jaata hai.
5. **Logo/brand**: header/footer/admin/invoice sab par ek hi official logo hai (redraw nahi kiya).
   Agar naya logo file dena hai to bas bhej dijiye — same assets replace kar denge.
6. **Sale wording**: poster par "Happy Diwali Sale / FLAT 70% OFF" artwork owner ka hai; website text
   "Up to 70% OFF" (accurate) hai. Zaroorat ho to poster dobara print karwa lein.
