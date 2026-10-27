# Round 23 — audit & verification

**Date:** 25 Oct 2026 · **Commit:** `8c60324` · **Store live:** https://noor-ethnic-wear.vercel.app · **Admin live:** https://noor-admin.vercel.app

Owner ke 5 asks (state↔pincode · payment page/order create speed · Sheet wapas chalu · admin clickable numbers + edit · step-3 UTR/last-4/claim/WhatsApp).

---

## 1. Kya badla (file → behaviour)

### a) State ↔ pincode guard
- **Naya:** `apps/web/src/lib/state-match.ts`
  - `INDIAN_STATES` (36 states/UTs, pincode dataset ke naam se exact match),
  - `normalizeStateName()` (case, `&`/`and`, spaces, dots),
  - `statesMatch()` — alias aware: `Jammu & Kashmir`/`Jammu and Kashmir`, `Orissa`/`Odisha`, `Pondicherry`/`Puducherry`, `Uttaranchal`/`Uttarakhand`, `Delhi`/`NCT of Delhi`,
  - `canonicalStateName()` — dropdown ke sahi naam me convert.
- **Client:** `apps/web/src/components/checkout-form.tsx`
  - `stateMismatch` = pincode check ka state ≠ form ka state,
  - step 1 → 2 block + message "Ye pincode **X** ka hai…", `data-testid="state-mismatch"`,
  - one-tap fix `data-testid="state-fix"` (state dropdown bhi isi se update hota hai),
  - empty state par block **nahi** (customer ko phasana nahi hai).
- **Server:** `apps/web/src/lib/orders.ts` `createOrder()` — `checkPincode` ke baad `statesMatch(payload.state, pinState)`; fail par `OrderError("…", 400, "state_mismatch")`. (GST place-of-supply galat na jaye.)
- **Tests:** `tests/unit/round23.test.ts` (6 checks), `tests/e2e/round23.mjs` (400 + message), live CI run.

### b) Speed — payment page + order create
| Pehle | Ab |
| --- | --- |
| `getOrder()` DB mode me `readAll()` (poora orders table) | `orders-pg.loadOrder()` — 1 row |
| `createOrder()` read-all + write-all | `saveOrders(new Map(), [order])` — 1 upsert |
| `await syncOrderToSheet()` ×2 (Apps Script ka wait) | `runInBackground()` → `after()` (Next request scope); `after` na ho to fire-and-forget |
| Sheet read timeout 5s | 2.5s (`READ_TIMEOUT_MS`) |
| Pay/order page: 3 sequential awaits | `Promise.all([getOrder, getStoreSettings, headers()])` |
| UPI auto-open 600ms | 250ms |

**Non-obvious bug jo test ne pakda:** `after()` sirf request scope me chalta hai — `tests/db/*` (aur CLI scripts) me wo throw karta tha (`"after was called outside a request scope"`). Isliye `runInBackground()` helper: `try { after(task) } catch { void task() }`. `npm run test:db` 5 failures → 9/0.

**Note (jaan-boojh kar):** `orders/[orderNumber]/loading.tsx` skeleton **nahi** rakha — us se response `200` ho jaata tha aur unknown order ka 404 (SEO + test) toot jaata hai. Speed parallel fetch se aayi, skeleton se nahi.

### c) Sheet — naya Apps Script v2
`scripts/google-apps-script/noor-sheets.gs`:
- `TOKEN` (owner apna daalega), `GIDS` {Settings 0, Orders 1135948941, Payments 1261780310, Messages 644814285, Newsletter 380856753, Checkout null} — tab rename hone par bhi kaam kare,
- `HEADERS` (Orders/Payments 25 columns, Checkout funnel columns, Messages, Newsletter, Audit),
- `setup()` — tabs + headers + default Settings rows (`support_phone`, `upi_id`, `upi_name`, `announcement`, `free_shipping`…),
- `appendRows_()` — **header naam se column mapping** + missing header auto-add + `LockService` 20s,
- `doPost` — `append` (rows[]), `settings_save` (key/value update),
- `doGet` — `settings`, `recent`, `health`/`ping`,
- `testAppend()` — owner khud Run karke dekh sake.

Owner guide: `docs/00-overview/sheet-setup-owner.md` (6 steps + troubleshooting table).

**Settings bina Apps Script:** `apps/web/src/lib/google-sheets.ts` — `settingsCsvUrl()`, `readSettingsFromCsv()`; `readSheetSettings()` Apps Script config na ho to published CSV se padhta hai. Env: `GOOGLE_SHEETS_SETTINGS_CSV_URL` (sirf `docs.google.com/spreadsheets/...`).

### d) Admin — clickable numbers + customer detail/edit
- `apps/admin/src/components/contact-links.tsx`: `cleanPhone` (last 10 digits), `telHref`, `whatsappHref(phone, text)`, `<PhoneLinks/>` (`data-testid="phone-links"` / `"phone-whatsapp"`).
- `(admin)/page.tsx` dashboard recent orders, `orders/page.tsx`, `orders/[id]/page.tsx`, `customers/page.tsx`, `messages/page.tsx` — sab par Call + WhatsApp.
- `customers/page.tsx`: `?phone=` par **customer detail** (`data-testid="customer-detail"`) — lifetime value, AOV, pehla/last order, address, saare orders (status/payment badges + Edit link), "New order" (details prefill) aur "Sab orders".
- Edit path: `updateContactAction` → `data.updateOrderContact()` → `PATCH /api/admin/orders/:no {action:"contact"}` → `orders.updateOrderContact()` (validation: name ≥2, phone 10 digit, pincode `^[1-9]\d{5}$`, warna purani value) + audit `order.contact_updated` with `{changed: {field: {from, to}}}`.
- `orders/new/page.tsx`: `?phone=` se purani order ki details prefill + notice.

### e) Step 3 (payment)
- `upi-payment.tsx`: UTR (`data-testid="upi-utr"`) **ya** last-4 (`data-testid="upi-last4"`), naya `claimPaid()` → `POST /api/payments/claim` (`data-testid="upi-claim"`), WhatsApp screenshot link **hamesha** (`data-testid="upi-whatsapp-screenshot"`, `wa.me/91…` + order detail text).
- `apps/web/src/app/api/payments/claim/route.ts`: `phoneToken` ya `phoneLast4` verify (403 warna), `claimPayment()` → `paymentStatus: processing`, reference khaali, audit `payment.claimed`, sheet row background; already paid → 409; 202 on success.

---

## 2. Verification

| Suite | Result |
| --- | --- |
| `npm run test:unit` | **114 / 0** (naya: `round23.test.ts` 7, `apps-script.test.ts` 7) |
| `npm run test:integration` | 40 / 0 |
| `npm run test:db` | 9 / 0 |
| `payments.mjs` (local) | 35 / 0 |
| `smoke.mjs` / `links.mjs` / `responsive.mjs` / `round16.mjs` / `breakpoints.mjs` | 87 / 40 / 43 / 37 / 48 — sab 0 fail |
| `round23.mjs` (local, admin + store) | **31 / 0** |
| `round23.mjs` (production, CI) | **18 / 0** (admin panel checks skip by design) |
| `payments.mjs` (production, CI) | 28 / 0 |
| CI (typecheck · build · test · prod-build smoke) | green (`40156640414`) |

### apps-script.test.ts kya karta hai
`noor-sheets.gs` ko `vm` me fake `SpreadsheetApp`/`ContentService`/`LockService` ke saath chalata hai — `setup()` se tabs, header repair (purani sheet me `Reason` column gayab → auto add + value sahi column me), `doPost append` se Orders/Payments rows, galat token par koi write nahi, `settings_save` sirf di gayi keys, `doGet` health/settings. Isse owner ko Apps Script debug karne ki zaroorat nahi.

---

## 3. Reh gaya / next

1. **Owner se**: naye Apps Script ka `/exec` URL + `TOKEN` → Vercel env (`GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_TOKEN`) → redeploy → test order → Orders tab verify.
   *(Abhi env list me ye dono keys hi nahi hain — yahi sheet khaali hone ki asli wajah.)*
2. Optional: Settings ka published CSV → `GOOGLE_SHEETS_SETTINGS_CSV_URL`.
3. Pending from owner: domain + official mail ID.
