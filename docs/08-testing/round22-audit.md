# Round 22 audit — payment page UX, settings-driven SEO, order page titles

R21 ke baad jo cheezein production par verify karte waqt milee, unka fix + proof.
Ye round naya feature nahi — **jo already bana tha usko owner ke rules par tight
karna** hai.

## 1. Payment page (step 3) — ab sirf ek "Open UPI app"

| Pehle | Ab | Kyun |
| --- | --- | --- |
| GPay / PhonePe / Paytm / BHIM ke 4 alag buttons | **Ek** button: "Open UPI app to pay ₹499" (`upi://pay`) | Owner rule: koi app brand nahi, koi third-party gateway nahi. Phone khud chooser dikhata hai |
| Har app ka apna deep link (`tez://`, `phonepe://`, `paytmmp://`) | Hata diye (`apps/web/src/lib/upi.ts` se `upiAppLinks` bhi gaya) | Wahi kaam, par 4 jagah maintenance + brand names UI me |
| `data-testid="upi-apps"` grid | `data-testid="upi-open"` single block | Tests bhi update |

Jo **nahi** badla: amount + order number pehle se bhare hue, QR, "Copy UPI ID",
"Payment ho gaya? Status check kariye" (`upi-recheck`), 5s/6s auto status polling
(`PaymentStatusWatcher`) — success/failed/pending khud detect hote hain.

## 2. Contact details ab hard-code nahi (SEO bhi Sheet se)

`layout.tsx` ke Organization JSON-LD me phone (`+`) aur email
**hard-coded** the. Sheet/admin me number badalne par site par naya dikhta tha,
par Google ko purana jaata tha.

- Naya client component `apps/web/src/components/store-structured-data.tsx` —
  `StoreSettingsProvider` se live settings padhta hai (30s + tab focus refresh).
- Sirf `email`, `telephone`, `contactPoint` deta hai, `@id` same
  (`<site>#org`) — static Organization node (naam/url/logo/sameAs) ke saath merge
  ho jaata hai, isliye duplicate brand nahi banta.

## 3. Order page ka title ab sach bolta hai

| Case | Pehle | Ab |
| --- | --- | --- |
| Order mil gaya | "Order confirmed" (chahe payment pending ho) | paid → "Order confirmed", processing → "Payment verify ho raha hai", failed → "Payment failed", pending → "Payment pending" |
| Number galat / order nahi | "Order confirmed" + default site title | HTTP **404** + title "Order nahi mila", `noindex` |

`generateMetadata` + `orders/[orderNumber]/not-found.tsx` me metadata — dono
jagah `robots: noindex`.

## 4. Verification

Local (`next start` on :3100, dev Postgres):

| Suite | Result |
| --- | --- |
| unit | 95 passed / 0 failed |
| integration | 40 / 0 |
| db | 9 / 0 |
| payments e2e | 35 / 0 |
| smoke | 87 / 0 |
| links | 40 pages / 0 |
| responsive | 43 / 0 |
| round16 | 37 / 0 |
| breakpoints | 48 / 0 |

Live (`https://noor-ethnic-wear.vercel.app`, commit `ae13b08` → verify pass):

- `/api/health` → `{"ok":true,"products":446,"db":true}`
- `POST /api/checkout/events` → `202 {"ok":true}`
- `POST /api/orders` → order number + `/orders/<num>/pay?pay=1`
- `/orders/NE-DOESNOTEXIST` → **404** + "Order nahi mila" page (WhatsApp support)
- production `[live-test]` workflow: public flow 21/0 (admin steps skip — token nahi)

## 5. Payment reference (UTR) 500 — asli root cause

Live smoke test lagataar 3 baar fail ho raha tha: UTR submit par
`Could not save the payment reference` (500) aur order `pending` hi rehta tha.

- **Root cause:** `payments` par `unique (provider, gateway_payment_id)` tha — ek UTR
  doosre order par daalte hi Postgres `23505 duplicate key` deta tha, jo API me
  generic 500 ban jaata tha. (Pehla run successful tha, isliye har agla run fail.)
- **Fix:** migration `0008_payments_reference_per_order.sql` — unique ab
  `(order_id, provider, gateway_payment_id)`. Ek hi UTR apne order par dobara
  (retry) chalega, doosre order par **409** with saaf message
  (`reference_in_use`) — koi 500 nahi, koi silent fail nahi.
- Production DB par migration apply ho chuki (index `payments_order_reference_uniq`).
- Test: `tests/unit/payment-reference.test.ts` (schema + guard), e2e ab har run par
  naya 12-digit UTR use karta hai.

## 6. Order page 500 — asli wajah: DB pool (EMAXCONNSESSION)

Health endpoint ne pakda: `max clients reached in session mode - max clients are
limited to pool_size: 15`. Kyun:

- Vercel par har function instance apna `pg` pool banata tha, `max: 5`.
- Supabase ka **session** pooler ek project ko ~15 clients deta hai → kuch
  instances ke baad naya connection hi nahi milta; `getOrder()` throw karta tha
  aur order/pay page **500** de deta tha (customer ko "order load nahi hua").
- Fix (`apps/web/src/lib/db.ts`): serverless par `max: 1`, `idleTimeoutMillis: 5s`,
  `allowExitOnIdle`, aur `EMAXCONNSESSION / too many clients / ECONNRESET` jaise
  transient errors par 3-attempt chhota retry (`query()` + `withTransaction()`).
- Test: `tests/unit/db-pool.test.ts`.

Verify (production, commit `69f9e58`):

- `/api/health` → `status: ok`, `db: up`, `commit: 69f9e58`
- `/orders/NE-DOESNOTEXIST` → **404** "Order nahi mila" (pehle 500 error boundary)
- live payment+tracking smoke → **28 passed / 0 failed** (UTR submit, processing,
  failed payment, tracking, funnel event — sab pass; admin steps token ke bina skip)

## 7. Khula hua / owner action

- **Contact form ka email channel**: local sandbox me `formsubmit` call fail hoti
  hai (network). Production par re-check chahiye — agar fail ho to WhatsApp
  fallback hi dikhta hai (form message DB me save hota hai).
- UPI app ka naam UI me kahin nahi aata — ye deliberate hai; future me koi
  "GPay se pay kariye" copy add na ho.
