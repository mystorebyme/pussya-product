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

## 1b. Gateway ke status ka matlab (aur hamara faisla)

YouPI ke repo ke `MERCHANT_INTEGRATION.md` ke mutabik status ke naam ye hain:

| Status | Matlab | Hamari site kya karti hai |
| --- | --- | --- |
| `OBSERVED_SUCCESS` | bank ka SMS/notification mila, par statement se reconcile **nahi** hua | order **confirm + paid** kar deti hai (customer ko turant confirmation) |
| `RECONCILED` | owner ne bank statement CSV import ki, line match hui | wahi (already paid) — Sheet me payment row `verified` |
| `SUCCESS` | COD / counter payment (UPI settlement nahi) | prepaid order par yahi aaye to bhi payment verify gateway API se hi hota hai |
| `FAILED` / `EXPIRED` / `CANCELLED` | paisa nahi mila | order pending rehta hai, customer dobara try kar sakta hai |
| `MANUAL_REVIEW` / `SUSPICIOUS` | do session ek hi alert se match hue | order **confirm nahi** hota, owner ko WhatsApp par screenshot |

⚠️ **Jaan-boojh kar liya gaya faisla:** YouPI khud kehta hai "`OBSERVED_SUCCESS` par
order fulfil mat karo" — kyunki wo bank settlement nahi hai. Chhoti store ke liye
har order ko statement import tak roka nahi ja sakta, isliye hum `OBSERVED_SUCCESS`
par bhi order confirm karte hain **aur owner ko daily bank statement se reconcile
karna hota hai** (Sheet → Payments me UTR hota hai). Zyada volume par strict mode
on karna ho to confirm/webhook me sirf `RECONCILED` allow kar dena — bata dein,
kar denge.

---

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

## 3. Setup — owner ke liye (5 values, redeploy nahi)

YouPI gateway deploy hone ke baad aapko **5 values** chahiye. Sab ek hi jagah se
aati hain — gateway ke **Merchant Admin** panel se (ya hosting provider se, agar
unhone aapko merchant account diya hai).

### 3.0 Ek line me: kahan se kya

| # | Sheet → Settings key | Ye kya hai | Kahan se milegi | Kaisa dikhta hai | Public / Secret |
| --- | --- | --- | --- | --- | --- |
| 1 | `youpi_pay_url` | Gateway ka **public HTTPS address** (yahi `youpi.js` aur checkout page ka ghar hai) | Aapka gateway **deploy** jahan chal raha hai — wo domain. Gateway ke `.env` me `BASE_CHECKOUT_URL` / `BASE_PAYMENT_API_URL` bhi yahi hota hai | `https://pay.noorethnicwear.in` | Public |
| 2 | `youpi_merchant_id` | **Publishable Merchant ID** (UUID) — script tag ka `data-youpi-key`, API ka `X-Merchant-Id` | Merchant Admin → **Settings → Developer / Webhooks & Secrets** card → "Merchant ID / Publishable Key" → 📋 Copy | `7b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e` | Public |
| 3 | `youpi_merchant_key` | **Secret Merchant API Key** — server-to-server calls ka `X-Merchant-Key` | Usi card me → "Secret Merchant API Key" → 📋 Copy (pehli baar khali ho to **🔄 Generate / Rotate Key**) | `mk_live_9f2c…` / `yp_live_…` (chhota secret string) | **Secret** |
| 4 | `youpi_webhook_secret` | **Webhook Signing Secret** — HMAC-SHA256, isse hi `X-Gateway-Signature` verify hota hai | Usi card me → "Webhook Secret (HMAC-SHA256 Signing)" → 📋 Copy | 64 hex characters (`a3f1…`) | **Secret** |
| 5 | `youpi_enabled` | On/off switch | Aapka faisla | `true` / `false` | Public |

> **Naam ka chakkar:** YouPI ne in teeno ko alag-alag naam diye hain, par kaam
> ek hi hai —
> `Merchant ID / Publishable Key` = `data-youpi-key` = `X-Merchant-Id` = **hamara `youpi_merchant_id`**;
> `Secret Merchant API Key` = `X-Merchant-Key` = **hamara `youpi_merchant_key`**;
> `Webhook Secret` = **hamara `youpi_webhook_secret`**.

### 3a. Step by step (jahan se laana hai)

**(1) Gateway ka URL — `youpi_pay_url`**

- Agar gateway aapne apne server/VPS par chalaya hai (Docker compose ya
  `control-center`): jo domain reverse proxy se `7000` (Checkout Portal) par
  point kiya ho, wahi ye value hai. SSL (https) zaroori hai.
- Agar YouPI kisi **provider** ne host karke diya hai: wahi URL jo unhone diya,
  jaise `https://pay.provider.com` (aapke merchant ke liye alag subdomain bhi ho
  sakta hai).
- Check: browser me `https://pay.noorethnicwear.in/youpi.js` kholiye — JavaScript
  file download honi chahiye (404 nahi).

**(2) + (3) + (4) — Merchant Admin panel se (teeno ek hi card me)**

1. Gateway ka **Merchant Admin** kholiye → `https://<gateway-host>/admin`
   (self-hosted par ye alag port `6001` hota hai: `http://<server-ip>:6001/admin`).
2. Left menu → **Settings / Developer** → **3.4 Webhooks & Security Secrets**
   (card ka naam: *"🔑 Merchant API Keys, Webhook Endpoints & Cryptographic
   Secrets"*).
3. Wahan se teen values copy kariye:
   - **Merchant ID / Publishable Key** → `youpi_merchant_id`
   - **Secret Merchant API Key** → `youpi_merchant_key` (khali dikhe to
     **Generate / Rotate Key** dabaiye — naya key turant dikh jaayega)
   - **Webhook Secret** → `youpi_webhook_secret`
4. Usi card ke **"Webhook Destination URL"** box me *ulti disha* ki value
   daaliye — hamari site ka endpoint:
   `https://noorethnicwear.in/api/payments/webhook/youpi`
   → phir **💾 Save Webhook Settings**.
   (Agar site abhi Vercel/Render par deploy nahi hui, to ise khaali chhod dein —
   payment phir bhi chalega, order browser ke confirm call se confirm hoga.)

**(5) `youpi_enabled`** — sab values daalne ke baad `true` kariye. Galat kuch
hua to `false` kar dein: gateway button turant gayab, UPI QR flow jaisa tha waisa.

### 3b. Values Sheet me kahan daalni hain

Google Sheet → **Settings** tab → har row me `key` | `value`:

```
youpi_pay_url         | https://pay.noorethnicwear.in
youpi_merchant_id     | 7b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e
youpi_merchant_key    | mk_live_9f2c…
youpi_webhook_secret  | a3f1…(64 hex)
youpi_enabled         | true
```

- Save karte hi site **3 second** me value utha leti hai (`/api/settings` poll) —
  na redeploy, na rebuild.
- `youpi_pay_url` **ya** `youpi_merchant_id` khaali ho to gateway button dikhta
  hi nahi aur seedha UPI QR flow chalta hai — checkout kabhi tootta nahi.
- ⚠️ `youpi_merchant_key` aur `youpi_webhook_secret` **sirf server** padhta hai:
  ye `/api/settings` (public) aur browser ke kisi bhi response me nahi jaate.
  Sheet ko sirf **owner** ke paas rakhein (Sheet sharing: "Anyone with link —
  Viewer" **nahi**, sirf owner + editor). Sheet leak hone par gateway panel se
  dono keys **rotate** kar dein aur nayi values Sheet me daal dein.

### 3c. Bina panel ke (advanced) — admin API se

Self-hosted gateway par merchant record khud bana sakte hain (owner ka
`ADMIN_API_TOKEN` chahiye):

```bash
curl -X POST https://pay.noorethnicwear.in/api/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_API_TOKEN" \
  -H "content-type: application/json" \
  -d '{"businessName":"Noor Ethnic Wear","contactEmail":"info.noorethnicwear@gmail.com",
       "upiId":"<owner-ka-upi>","webhookUrl":"https://noorethnicwear.in/api/payments/webhook/youpi"}'
```

Response me `merchant.id` (→ `youpi_merchant_id`), `apiKey` (→ `youpi_merchant_key`)
aur `webhookSecret` (→ `youpi_webhook_secret`) aate hain. Key badalni ho to
`POST /api/v1/admin/merchants/:id/rotate-key`, webhook secret ke liye
`POST /api/v1/admin/merchant-key/rotate`.

### 3d. Kya-kya galat ho sakta hai (error → matlab)

| Gateway ka jawab | Matlab | Fix |
| --- | --- | --- |
| `401 MISSING_MERCHANT_KEY` | `youpi_merchant_id` default merchant ka nahi hai aur `youpi_merchant_key` nahi diya | Secret Merchant API Key Sheet me daaliye |
| `401 INVALID_MERCHANT_KEY` | `youpi_merchant_key` galat/purani hai (rotate ho gayi) | Panel se nayi copy kariye |
| `400 Merchant not found or not configured` | `youpi_merchant_id` me typo / UUID ke bajaye naam | Panel se poora UUID copy kariye |
| Webhook par `401` aur order auto-confirm nahi | `youpi_webhook_secret` match nahi kar raha | Dono taraf wahi secret; rotate kiya to Sheet bhi update |
| `409 DUPLICATE_SESSION_DETECTED` | Customer ne dobara pay dabaya | Normal — site wahi purana session kholti hai |
| Gateway modal hi nahi khulta | `youpi_pay_url` galat / `youpi.js` 404 / http (https nahi) | `…/youpi.js` browser me check kariye |
| Payment ho gaya par order pending | server deploy nahi (static Pages) ya webhook URL galat | Vercel/Render deploy + webhook URL, ya `/api/payments/youpi/confirm` route live hona chahiye |

### 3e. Ek nazar me verify (setup ke baad)

```bash
curl -s https://noorethnicwear.in/api/settings | grep -o '"youpiPayUrl":"[^"]*"'
curl -sI https://pay.noorethnicwear.in/youpi.js | head -1        # 200 hona chahiye
curl -s -X POST https://noorethnicwear.in/api/payments/youpi/create \
  -H 'content-type: application/json' -d '{"orderNumber":"NE-XXXX"}'   # 200 + checkoutUrl
```

Phir ek asli ₹1 test order karke `SUCCESS` → order `confirmed` + `paid` dekh
lein (poora checklist: `docs/09-devops/payment-flow-owner-guide.md`).

#### Static GitHub Pages preview (sirf browse)

Pages par `/api/settings` nahi hota, isliye wahan public values build-time env se
aati hain (optional) — secret **kabhi** `NEXT_PUBLIC_*` me na daalein:

```
NEXT_PUBLIC_YOUPI_ENABLED=true
NEXT_PUBLIC_YOUPI_PAY_URL=https://pay.yourdomain.com
NEXT_PUBLIC_YOUPI_MERCHANT_ID=<merchant id>
```

## 3f. Endpoints (hamari site)

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
YOUPI_MERCHANT_ID=<publishable merchant id (UUID)>
YOUPI_MERCHANT_KEY=<secret merchant api key — sirf server>
YOUPI_WEBHOOK_SECRET=<webhook signing secret — sirf server>
NEXT_PUBLIC_YOUPI_PAY_URL=…       # sirf static build ke liye
NEXT_PUBLIC_YOUPI_MERCHANT_ID=…   # sirf static build ke liye

# optional — server-only calls ka origin (browser ko dikhta nahi)
YOUPI_PAY_URL_INTERNAL=http://10.0.0.5:6100

# demo-only — site ke andar /demo-gateway ko local demo gateway par proxy karta hai
DEMO_GATEWAY=1
```

Sheet ki value env se **jeet-ti** hai (owner bina redeploy badal sake).

### 5b. `YOUPI_PAY_URL` ke 3 allowed shapes

| value | kab | browser kya karta hai |
| --- | --- | --- |
| `https://pay.yourdomain.com` | normal production | gateway origin se `youpi.js` + checkout iframe |
| `/demo-gateway` (same-origin path) | demo / reverse proxy | site ke hi origin par `/demo-gateway/youpi.js` |
| `pay.yourdomain.com` (bina scheme) | owner ne scheme bhool di | `https://` laga kar chalega |

- `YOUPI_PAY_URL_INTERNAL` sirf **server** use karta hai (`POST /api/v1/payments`,
  `GET /api/v1/payments/{id}`) — jab gateway public internet se na khulta ho.
  Browser ke liye hamesha `YOUPI_PAY_URL` hi rehta hai.
- CSP (report-only) me gateway ka origin `script-src` + `connect-src` +
  `frame-src` me automatically add hota hai — sirf tab jab env set ho.
- Demo mode (`DEMO_GATEWAY=1` + `YOUPI_PAY_URL=/demo-gateway`) se owner bina
  asli gateway ke poora flow dekh sakta hai: checkout modal → success/failed/
  cancel → order `confirmed` + `paid`. Ye flag production me kabhi set na karein.

## 6. Tests

```bash
npm run test --workspace .        # tests/unit/round48.test.ts (R48-1..R48-5)
```

Guards: chart numbers (inches + cm verbatim), tabs/toggle/find-my-size/
unstitched note/pro-tips, PDP hover zoom, 7 unique category images, palette +
animation CSS, HMAC V1/V2 (tamper → reject), webhook + confirm routes,
secret public API me nahi.
