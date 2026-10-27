# YouPI PG — payment gateway integration (R48)

Owner: *"YouPI gateway ko uske system ke hisaab se integrate karo — ye proper hai."*
Contract source: <https://github.com/youpi-pg/YouPI-PG> (`openapi.yaml` + README),
reviewed at commit `556bd43`.

> SDK **vendor nahi** kiya gaya (YouPI ka licence "Commercial" hai) — official
> `youpi.js` seedha aapke gateway origin (`{youpi_pay_url}/youpi.js`) se load hota
> hai, jaisa unke README me likha hai. Session hamare server se banta hai, isliye
> browser ko gateway API par cross-origin call hi nahi karni padti.

YouPI PG ek **self-hosted UPI gateway** hai (Node 24 + SQLite WAL, WhatsApp OTP
"Berry", Android/Gmail/SMS observers). Merchant apne domain par chalata hai,
jaise `https://pay.yourdomain.com`.

> **YouPI ke apne README se (jaan-na zaroori):** ye ek experimental research
> project hai, NPCI/bank-certified nahi, aur README khud ≤20 transactions/day
> guideline deta hai. Har payment bank statement se reconcile karna chahiye.
> Isliye is site par **owner ka direct UPI QR flow (fallback) band nahi kiya
> gaya** — gateway down ho to bhi customer pay kar sakta hai.

---

> Owner ke liye simple bhasha me poora flow (customer ko kya dikhega, failure
> cases, pehla test): **[`payment-flow-owner-guide.md`](./payment-flow-owner-guide.md)**

## 1. Kaise kaam karta hai (hamari site par)

```
Customer → checkout step 3
   │
   ├─ (A) YouPI gateway button  ────────────────────────────────────────────┐
   │       POST /api/payments/youpi/create  (server → gateway)              │
   │         POST {payUrl}/api/v1/payments                                  │
   │         X-Merchant-Id + Idempotency-Key, amount = order.total (paise)   │
   │         ← { paymentId, checkoutUrl }                                   │
   │       youpi.js → window.Youpi.pay({checkoutUrl, paymentId, handler})   │
   │       modal checkout (gateway par) → UPI app → paisa                    │
   │       browser handler(res)  →  POST /api/payments/youpi/confirm        │
   │                                 └─ server: GET /api/v1/payments/{id}    │
   │                                    status==SUCCESS + amount==order.total│
   │                                    → order confirmed                    │
   │                                                                          │
   │       webhook (Vercel/Render par): POST /api/payments/webhook/youpi    │
   │       HMAC verify → gateway se dobara verify → amount match → confirm  │
   └────────────────────────────────────────────────────────────────────────┘
   ├─ (B) Seedha UPI QR / UPI ID (purana rasta) — hamesha maujood
   └─ (C) WhatsApp (agar payment options uplabdh na hon)
```

Rules jo code me locked hain:

- **Client ke "success" par kabhi bharosa nahi.** `handler(res)` sirf UI hai;
  order tabhi confirm hota hai jab server gateway API se status + amount verify
  kare (`lib/youpi.ts` → `fetchYoupiPayment`).
- **Raw body** par HMAC verify hota hai (`JSON.parse` se pehle), V2
  (`<timestamp>.<body>`) pehle, phir V1 (`body`).
- `X-Gateway-Delivery-Id` se retry dedupe (YouPI 1 ghante tak byte-for-byte
  retry karta hai).
- Amount mismatch → order **confirm nahi** hota, `ORDER_AMOUNT_MISMATCH` (409)
  aur order `failed` mark hota hai.

## 2. Files

| File | Kaam |
| --- | --- |
| `apps/web/src/lib/youpi.ts` | Config (env + sheet), session create, server-to-server fetch, delivery dedupe (`server-only`) |
| `apps/web/src/lib/youpi-signature.ts` | Pure HMAC helpers (V1/V2, amount compare) — unit tested |
| `apps/web/src/app/api/payments/youpi/create/route.ts` | **Server-side session** (`POST /api/v1/payments`) — amount order se, idempotency key, 409 duplicate par wahi session |
| `apps/web/src/components/youpi-pay.tsx` | `youpi.js` loader + `window.Youpi.pay()` + confirm call |
| `apps/web/src/components/upi-payment.tsx` | Payment card: gateway button + QR fallback |
| `apps/web/src/app/api/payments/webhook/[gateway]/route.ts` | `youpi` branch — authoritative webhook |
| `apps/web/src/app/api/payments/youpi/confirm/route.ts` | Static/no-webhook fallback — server verify |
| `scripts/google-apps-script/noor-sheets.gs` | Settings tab ke naye rows |

## 3. Setup — owner ke liye (3 steps, redeploy nahi)

YouPI gateway deploy karne ke baad aapke paas ye 4 cheezein hongi:

| Kya | Kahan milega | Kahan daalna hai |
| --- | --- | --- |
| Gateway URL (`https://pay.…`) | aapka deployment | Sheet → **Settings** → `youpi_pay_url` |
| Merchant key (`X-Merchant-Id`) | gateway ka merchant admin | Sheet → `youpi_merchant_id` |
| Webhook secret | gateway ka dashboard/env | Sheet → `youpi_webhook_secret` (ya `YOUPI_WEBHOOK_SECRET` env) |
| Toggle | — | Sheet → `youpi_enabled` = `true` / `false` |

Bas. Site 3 second me nayi value utha leti hai (`/api/settings` poll), koi
redeploy nahi. `youpi_pay_url` ya `youpi_merchant_id` khaali ho to gateway
button **gizhta hi nahi** aur seedha UPI QR flow chalta hai — checkout kabhi
totta nahi.

Static GitHub Pages preview par `/api/settings` nahi hota, isliye wahan ye
public values build-time env se aati hain (optional):

```
NEXT_PUBLIC_YOUPI_ENABLED=true
NEXT_PUBLIC_YOUPI_PAY_URL=https://pay.yourdomain.com
NEXT_PUBLIC_YOUPI_MERCHANT_ID=<merchant key>
```

Secret **kabhi** `NEXT_PUBLIC_*` me na daalein.

## 3b. Endpoints (hamari site)

| Endpoint | Kaam |
| --- | --- |
| `POST /api/payments/youpi/create` | Session banata hai. Body `{ orderNumber }`. Amount **order se** (browser se nahi), `Idempotency-Key: noor-<order>-<amount>`, `returnUrl` = checkout step 3. `409 DUPLICATE_SESSION_DETECTED` par gateway ke `session_id` ka wahi `checkoutUrl` laut-ta hai. |
| `POST /api/payments/youpi/confirm` | Browser callback ke baad **authoritative**: gateway se `GET /api/v1/payments/{id}` → `SUCCESS` + amount match → order confirmed. |
| `POST /api/payments/webhook/youpi` | YouPI webhook (V2/V1 HMAC, delivery-id dedupe, amount match). Server wale deploy par yahi asli rasta hai. |

## 4. Webhook (server wale deploy par — Vercel / Render)

YouPI dashboard me webhook URL:

```
https://<your-domain>/api/payments/webhook/youpi
```

Events: `SUCCESS` (baaki events 200 ke saath ignore hote hain). Signature
headers: `X-Gateway-Signature`, `X-Gateway-Signature-V2`, `X-Gateway-Timestamp`,
`X-Gateway-Delivery-Id`.

**GitHub Pages par webhook receive nahi ho sakta** (static export, koi server
route nahi). Isliye wahan browser callback → `/api/payments/youpi/confirm`
ka rasta chalta hai, jo phir bhi **server** se gateway verify karta hai. Wo
confirm endpoint bhi Vercel/Render ke bina nahi chalega — yaani Pages par
gateway pay karne ke baad order auto-confirm nahi hoga jab tak server deploy na
ho. Isliye owner ke liye do raste:

- **(a)** Vercel/Render deploy (`docs/09-devops/vercel-deploy.md`) → webhook +
  confirm dono chalenge, poori automatic confirmation; **recommended**.
- **(b)** Sirf Pages → gateway button tab tak na dikhe jab tak URL/key na ho;
  customer seedha UPI QR se pay kare aur WhatsApp par confirm kare (aaj ka
  behaviour).

## 5. Env fallback (optional)

```
YOUPI_ENABLED=true
YOUPI_PAY_URL=https://pay.yourdomain.com
YOUPI_MERCHANT_ID=<merchant key>
YOUPI_WEBHOOK_SECRET=<webhook secret>
NEXT_PUBLIC_YOUPI_PAY_URL=…       # sirf static build ke liye
NEXT_PUBLIC_YOUPI_MERCHANT_ID=…   # sirf static build ke liye
```

Sheet ki value env se **jeet-ti** hai (owner bina redeploy badal sake).

## 6. Tests

```bash
npm run test --workspace .        # tests/unit/round48.test.ts (R48-1..R48-5)
```

Guards: chart numbers (inches + cm verbatim), tabs/toggle/find-my-size/
unstitched note/pro-tips, PDP hover zoom, 7 unique category images, palette +
animation CSS, HMAC V1/V2 (tamper → reject), webhook + confirm routes,
secret public API me nahi.
