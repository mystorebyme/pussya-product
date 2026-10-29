# Round 18 — payment-first order flow, tracking & new deploy (audit)

Date: 2026-10-25 · Branch: `arena/f713eef1-tannu-product` · Commit: `c6e0194` (+ workflow/docs)

## 1. Kya maanga gaya tha

1. "Place order" par agar sab validate ho jaye to **payment page alag se** khule.
2. **Order number payment page par** generate ho (checkout par nahi).
3. Us order ki detail wahin — **payment success / failed / pending**, aur ye saare status **DB me save**.
4. **Payment confirm hone par hi order confirm** ho.
5. **Tracking fix** karo.
6. Render kaam nahi kar raha → **alternative deploy** dhundo aur fix karo.

## 2. Kya bana

### 2.1 Naya flow

```
/checkout                       →  validate (stock, size, pincode, price)  →  POST /api/orders
/api/orders  (server)           →  order number NE-XXXXXXXXXX, status=placed, payment_status=pending
                                →  redirect /orders/<NE-…>/pay          ← payment page ALAG
/orders/<NE-…>/pay              →  amount, items, UPI QR + UPI ID, "Open UPI app"
                                →  customer UTR submit → payment_status=processing
                                →  8s polling: paid aate hi "Payment confirmed" + order page link
/orders/<NE-…>                  →  tracking timeline (placed → confirmed → packed → shipped → delivered)
```

- Order number **sirf** order create hone par banta hai — checkout page par kabhi nahi dikhta.
- `payment_status` ke **saare** states DB me: `pending`, `processing`, `paid`, `failed`, `refunded`.
- `order_status_history` me har transition ka row (kisne, kab, note).

### 2.2 Payment-first guard

`updateOrderStatus()` sirf tab status badalne deta hai jab payment `paid` ho; warna
`409 payment_pending`. Iska matlab admin payment confirm karne se pehle order packed/shipped
nahi kar sakta. Test: `tests/db/postgres.test.ts` (test 2) + `tests/e2e/payments.mjs` section 6.

### 2.3 Files

| File | Kaam |
| --- | --- |
| `apps/web/src/app/api/orders/route.ts` | order create, `paymentStatus`, server validation |
| `apps/web/src/app/orders/[orderNumber]/page.tsx` | order detail + tracking timeline + not-found message |
| `apps/web/src/app/orders/[orderNumber]/pay/page.tsx` | **payment page** (UPI QR, UTR, live status) |
| `apps/web/src/app/api/orders/[orderNumber]/payment/route.ts` | payment status read (no-store) + UTR submit |
| `apps/web/src/components/payment-status-watcher.tsx` | 8s polling, paid par redirect |
| `apps/web/src/lib/{orders,payments,upi,db,db-schema}.ts` | data layer + auto-migrate |
| `apps/admin/src/...` | payment confirm / undo, order status, tracking (AWB + courier) |
| `.github/workflows/live-payments.yml` | live smoke (production par public flow) |

## 3. Tracking

- `/orders/<number>` par timeline: 5 stages, har stage ka timestamp DB se (`order_status_history`).
- Admin order detail me courier + AWB + tracking URL; customer ko wahi dikhta hai.
- Shipment row (`shipments`) banti hai jab admin AWB daalta hai; tracking link `shipments.tracking_url`.
- Order na mile to clean message (404 page nahi): "Order not found — number check karein ya WhatsApp karein".

## 4. Deploy — Render se Vercel + Supabase

Render service har path par `Not Found` de rahi thi (`/api/health` bhi) → production stack shift:

| | Render (purana) | Vercel + Supabase (naya, live) |
| --- | --- | --- |
| Storefront | `noorclothing.onrender.com` ❌ | **https://noor-ethnic-wear.vercel.app** ✅ |
| Admin | — | **https://noor-admin.vercel.app** ✅ |
| DB | Render Postgres | Supabase Postgres 17 (ap-south-1, Mumbai) ✅ |
| Cold start | 30–60s (free) | ~0 (serverless) |
| `db` health | — | `up` ✅ |

Details: `docs/10-deployment/live-vercel-supabase.md`.

## 5. Test results

| Suite | Command | Result |
| --- | --- | --- |
| Payments E2E (local) | `node tests/e2e/payments.mjs` | **27 / 0** |
| Payments E2E (production) | GitHub Actions `live-payments.yml` → `noor-ethnic-wear.vercel.app` | **21 / 0** ✅ |
| DB (Postgres) | `npm run test:db` | **9 / 0** |
| Unit | `npm run test:unit` | **89 / 0** |
| Integration | `npm run test:integration` | **40 / 0** |
| Smoke | `node tests/e2e/smoke.mjs` | 87 / 0 |
| Round 16 regression | `node tests/e2e/round16.mjs` | 37 / 0 |
| Links | `node tests/e2e/links.mjs` | 40 / 0 |
| Responsive | `node tests/e2e/responsive.mjs` | 42 / 0 |
| Breakpoints | `node tests/e2e/breakpoints.mjs` | 48 / 0 |
| Typecheck | `tsc --noEmit` (web + admin) | 0 errors |
| Build | `npm run build` (web + admin) | success |

Live run me admin-only steps skip hote hain (token repo secret me nahi hai) — wahi steps local par
`ADMIN_API_TOKEN=dev-admin-token` ke saath cover hote hain.

### Live proof (production par actual flow)

1. Order create → `NE-MR4WO829RT`, `payment_status=pending`.
2. `/orders/NE-MR4WO829RT/pay` khula, pending state dikha.
3. UTR `123456789012` submit → `processing`, `payments.provider='manual-upi'` DB me.
4. Doosra order `NE-MR53QNMP83` → payment failed state DB me (`failed`).
5. Dono test orders cleanup ke baad production DB se delete kar diye gaye (real data untouched).

## 6. Security

- `ADMIN_API_TOKEN` sirf server-side; browser me koi token/secret/sheet link nahi.
- Admin login prod me **block** rehta hai jab tak `ADMIN_PASSWORD` set na ho.
- Payment UTR verification admin panel se (manual) — koi third-party gateway nahi, owner ke UPI par.
- `DATABASE_URL` sirf Vercel env me; repo me nahi.

## 7. Baaki / owner action

- [ ] `ADMIN_PASSWORD` set (admin prod login) — value owner ko di gayi, repo me nahi.
- [ ] Domain `noorethnicwear.in` point karna (`NEXT_PUBLIC_SITE_URL` update + Vercel Domains).
- [ ] Supabase DB password rotate (setup ke dauraan share hua tha).
