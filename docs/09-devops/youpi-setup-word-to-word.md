# YouPI gateway — setup, word to word (shuru se pehle payment tak)

Ye doc **haat pakad ke** likha gaya hai: har command, har button, har field ka
naam, aur har step ke baad **kya dikhna chahiye**. Agar aap pehli baar gateway
laga rahe hain to yahi file follow karein — kuchh bhi yaad se nahi karna padega.

- **Kitna time:** 45–60 min (server + domain + Sheet + test order)
- **Kisko chahiye:** owner (values + test) aur ek developer (server/domain wala hissa)
- **Reference:** <https://github.com/youpi-pg/YouPI-PG> (reviewed at `556bd43`),
  hamari integration ka detail: [`youpi-payment-gateway.md`](./youpi-payment-gateway.md),
  customer ke liye flow: [`payment-flow-owner-guide.md`](./payment-flow-owner-guide.md)

> **Do shartein pehle samajh lein (YouPI ke apne README se):**
> 1. YouPI ek **self-hosted, experimental** gateway hai — NPCI/bank certified
>    nahi. README khud **≤20 transactions/day** ka guideline deta hai.
> 2. YouPI paisa "dekh" kar batata hai (bank SMS/Gmail/Android notification
>    observer) — **bank settlement nahi**. Isliye har din statement se reconcile
>    karna zaroori hai.
>
> In dono ki wajah se hamari site par **UPI QR ka manual fallback band nahi
> kiya gaya** — gateway down ho to bhi customer pay kar sakta hai.

---

## Part 0 — Shuru karne se pehle ye 5 cheezein ready rakhein

| # | Cheez | Detail |
| --- | --- | --- |
| 1 | **VPS / server** | Ubuntu 22.04+, 2 vCPU, 2 GB RAM, 20 GB disk (Docker ke saath) |
| 2 | **Domain** | jaise `pay.noorethnicwear.in` — DNS me server ke IP par `A` record |
| 3 | **Bank-linked phone** | jis number par aapke UPI/bank ke SMS aate hain (observer isi ko padhta hai) |
| 4 | **Owner ka UPI ID** | jaise `noorethnicwear@okhdfcbank` — payment isi par aayega |
| 5 | **Store ka public domain** | jaise `https://noorethnicwear.in` (website) — webhook isi par aayega |

**Sabse pehle ek hi baat tay karein:** gateway alag domain par chalega
(`pay.…`), store alag par (`noorethnicwear.in`). Dono **https** hone chahiye.

---

## Part A — Server par gateway chalana

### A1. Server me login karke ye commands chalayein

```bash
sudo apt update && sudo apt install -y git curl
curl -fsSL https://get.docker.com | sudo sh          # Docker + compose plugin
sudo usermod -aG docker "$USER" && newgrp docker     # logout/login ke baad bhi chalega
```

**Check karein:** `docker --version` aur `docker compose version` dono kuchh
print karein (error nahi).

### A2. Repo clone + `.env` banao

```bash
cd /opt
sudo git clone https://github.com/youpi-pg/YouPI-PG.git youpi
cd youpi
sudo cp .env.example .env
sudo nano .env
```

### A3. `.env` me **exactly** ye lines daalein (baaki chhod dein)

```ini
# --- public URLs (apna domain daalein, aakhir me slash nahi) ---
BASE_PAYMENT_API_URL=https://pay.noorethnicwear.in
BASE_CHECKOUT_URL=https://pay.noorethnicwear.in
BASE_ADMIN_URL=http://127.0.0.1:6001
YOUPI_MODE=production

# --- secrets: neeche diye command se banao (copy-paste), har ek 64 hex ---
ADMIN_API_TOKEN=<A4 ka step 1 se>
ENCRYPTION_MASTER_KEY=<A4 ka step 2 se>
JWT_SECRET=<A4 ka step 3 se>

# --- database (bina Postgres ke bhi chalega) ---
USE_SQLITE_FALLBACK=true
SQLITE_DB_PATH=./data/youpi_pg.sqlite

# --- CHECKOUT IFRAME: yahi line na ho to hamari site par checkout BLOCK ho jaayega ---
CHECKOUT_FRAME_ANCESTORS=https://noorethnicwear.in

# --- webhook retries (idempotent receiver ki wajah se safe) ---
WEBHOOK_MAX_RETRIES=5
WEBHOOK_INITIAL_BACKOFF_MS=5000
```

> `CHECKOUT_FRAME_ANCESTORS` me **store ka origin** hota hai (gateway ka nahi).
> Production me iske bina gateway `frame-ancestors 'self'` bhejta hai aur
> customer ko modal me checkout ki jagah blank/blocked page dikhta hai. Agar
> store Vercel par hai to dono likh dein:
> `CHECKOUT_FRAME_ANCESTORS=https://noorethnicwear.in https://noor.vercel.app`

### A4. Teen secrets banayein (ek-ek command, output copy karein)

```bash
# 1. ADMIN_API_TOKEN  (gateway ka admin panel/token — ise sambhal ke rakhein)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 2. ENCRYPTION_MASTER_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# 3. JWT_SECRET
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Node na ho to: `openssl rand -hex 32` (teen baar, teen alag values).

### A5. Gateway start karein

```bash
cd /opt/youpi
sudo docker compose up -d
sudo docker compose ps          # saare services "Up" dikhne chahiye
sudo docker compose logs -f gateway --tail=50
```

**Check karein (teeno 200/JSON dein):**

```bash
curl -s http://127.0.0.1:6100/health          # {"status":"ok", ...}
curl -sI http://127.0.0.1:7000/youpi.js | head -1   # HTTP/1.1 200 OK
curl -sI http://127.0.0.1:6001/admin | head -1      # HTTP/1.1 200 OK
```

---

## Part B — HTTPS (domain + reverse proxy)

### B1. Caddy (sabse aasan — SSL apne aap)

```bash
sudo apt install -y caddy
sudo tee /etc/caddy/Caddyfile >/dev/null <<'EOF'
pay.noorethnicwear.in {
    encode gzip zstd
    reverse_proxy 127.0.0.1:7000
}
EOF
sudo systemctl reload caddy
```

### B2. Fir check karein (bahar se, apne laptop par bhi)

```bash
curl -sI https://pay.noorethnicwear.in/youpi.js | head -1    # 200
curl -s  https://pay.noorethnicwear.in/api/v1/payments/none | head -c 120   # JSON error, HTML nahi
```

> **Important:** portal (`7000`) khud `/api/*` ko payment API (`6100`) par proxy
> karta hai — isliye ek hi domain (`pay.…`) kaafi hai, alag `api.…` ki zaroorat
> nahi.

---

## Part C — Admin panel kholna (aur `ADMIN_API_TOKEN` kahan hai)

Merchant Admin **sirf server ke andar** (127.0.0.1:6001) khulta hai — ye jaan
boojh kar aisa hai (usme admin credentials hote hain). Do tarike:

**Tarika 1 — SSH tunnel (recommended)**

```bash
# apne laptop par:
ssh -L 6001:127.0.0.1:6001 ubuntu@<server-ip>
# phir laptop ke browser me kholen:
#   http://localhost:6001/admin
```

**Tarika 2 — server par hi (bina tunnel)**

```bash
curl -s http://127.0.0.1:6001/admin > /tmp/admin.html && echo "admin html ok"
```

Agar aapne `.env` me `ADMIN_API_TOKEN` set kiya hai to wahi token panel me
maangega. Set nahi kiya to gateway ne khud ek token bana kar rakha hai:

```bash
sudo docker compose exec gateway cat /app/data/.secrets/admin_api_token
```

---

## Part D — Merchant + teeno keys nikalna

### D1. Panel se (aasan)

1. Browser me `http://localhost:6001/admin` kholiye.
2. Left menu → **Settings / Developer** → sub-view
   **3.4 Webhooks & Security Secrets** (card heading:
   *"🔑 Merchant API Keys, Webhook Endpoints & Cryptographic Secrets"*).
3. Wahan se **teen values** copy kariye — notebook me likh lein:

| Panel me jo likha hai | Hamari Sheet key | Kaisa dikhta hai |
| --- | --- | --- |
| **Merchant ID / Publishable Key** (`data-youpi-key`) | `youpi_merchant_id` | UUID, `7b1e2c3d-…` |
| **Secret Merchant API Key** (`X-Merchant-Key`) | `youpi_merchant_key` | `mk_live_…` |
| **Webhook Secret (HMAC-SHA256 Signing)** | `youpi_webhook_secret` | 64 hex, `a3f1…` |

4. **Secret Merchant API Key** khali dikhe to **🔄 Generate / Rotate Key**
   dabaiye — naya key turant dikh jaayega.
5. Usi card me **Webhook Destination URL** me daalein:
   `https://noorethnicwear.in/api/payments/webhook/youpi`
6. **💾 Save Webhook Settings** dabaiye.

**Check karein:** card me teeno value dikh rahi hain, aur "Save" ke baad page
refresh par webhook URL wahi rehta hai.

### D2. Panel na khule to — API se (developer)

```bash
ADMIN_TOKEN="<Part A4 wala ADMIN_API_TOKEN>"
curl -s -X POST https://pay.noorethnicwear.in/api/v1/admin/merchants \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -H "content-type: application/json" \
  -d '{
    "businessName": "Noor Ethnic Wear",
    "contactEmail": "info.noorethnicwear@gmail.com",
    "upiId": "noorethnicwear@okhdfcbank",
    "webhookUrl": "https://noorethnicwear.in/api/payments/webhook/youpi"
  }'
```

Response ka shape (values aapke alag honge):

```json
{ "merchant": {
  "id": "7b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e",
  "businessName": "Noor Ethnic Wear",
  "apiKey": "yp_live_9f2c…",
  "webhookSecret": "a3f1…(64 hex)"
} }
```

- `merchant.id` → `youpi_merchant_id`
- `merchant.apiKey` → `youpi_merchant_key`
- `merchant.webhookSecret` → `youpi_webhook_secret`

> Ye teen value **ek hi baar** poore dikhte hain. Turant Sheet me daal dein.
> Kho jaayein to panel se copy karein, ya rotate kar dein
> (`POST /api/v1/admin/merchants/:id/rotate-key`).

---

## Part E — Sheet me paanch rows (bina redeploy live)

Google Sheet → **Settings** tab → `key` | `value` columns me:

| key | value |
| --- | --- |
| `youpi_pay_url` | `https://pay.noorethnicwear.in` |
| `youpi_merchant_id` | `7b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e` |
| `youpi_merchant_key` | `mk_live_9f2c…` |
| `youpi_webhook_secret` | `a3f1…` (64 hex) |
| `youpi_enabled` | `true` |

**Check karein (3–5 second baad):**

```bash
curl -s https://noorethnicwear.in/api/settings \
  | python3 -c "import json,sys;d=json.load(sys.stdin)['data'];print({k:v for k,v in d.items() if 'youpi' in k.lower()})"
# → {'youpiEnabled': True, 'youpiPayUrl': 'https://pay.noorethnicwear.in', 'youpiMerchantId': '7b1e…'}
```

Do secrets (`youpi_merchant_key`, `youpi_webhook_secret`) is response me
**nahi** aane chahiye — wahi sahi hai (wo sirf server padhta hai).

> AppScript version chalu hai to ek baar `Settings → Noor → Refresh settings`
> chala lein (ya sheet 3 second me khud utha leti hai). Sheet kisi ko share na
> karein — usme do secrets hain.

---

## Part F — Website ko server hosting chahiye (webhook ke liye)

GitHub Pages **static** hai: wo webhook receive nahi kar sakta, aur payment ke
baad order apne aap confirm nahi hoga.

1. Store ko **Vercel ya Render** par deploy karein
   (`docs/09-devops/vercel-deploy.md`).
2. Server ke environment variables me ye rakhein (Sheet ki value phir bhi jeetegi):

```
YOUPI_ENABLED=true
YOUPI_PAY_URL=https://pay.noorethnicwear.in
YOUPI_MERCHANT_ID=7b1e2c3d-…
YOUPI_MERCHANT_KEY=mk_live_…
YOUPI_WEBHOOK_SECRET=a3f1…
```

3. **Check karein** ki webhook bahar se pahunch raha hai:

```bash
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://noorethnicwear.in/api/payments/webhook/youpi -d '{}'
# 401 aana chahiye (signature nahi hai) — 404/500 aaya to route live nahi hai
```

404 → deploy me route nahi aaya; 503 → Sheet me `youpi_enabled`/URL/key missing.

---

## Part G — Pehla asli test (₹1–₹500, khud ka order)

1. Site par apne aap ka ek sasta order place karein (apna hi address/phone).
2. Step 3 (payment) par **"Secure UPI checkout"** box → **Pay securely** dabaiye.
3. Gateway ka modal khulega. UPI app se **asli paisa** bhej dein.
4. UPI app par paisa katne ke baad: modal ~30–60 second me "success" dikhata hai
   (gateway ke observer ko bank ka SMS/notification milna chahiye).
5. Site par order **`confirmed` + `paid`** ho jaana chahiye. Sheet → **Orders**
   me status `confirmed`, **Payments** me UTR.
6. Gateway admin → **Payments** me wahi session `OBSERVED_SUCCESS` dikhega.
   Din ke aakhir me statement import karne par wo `RECONCILED` ho jaayega —
   tabhi bank me paisa actually settle maana jaata hai.

**Agar 4 number par atak jayein:**

| Kya dikh raha hai | Iska matlab | Kya karein |
| --- | --- | --- |
| Modal khulta hi nahi | `youpi_pay_url` galat, ya `youpi.js` 404, ya http (https nahi) | `curl -sI https://pay.…/youpi.js \| head -1` → 200 hona chahiye |
| Modal me blank / "refused to frame" | `CHECKOUT_FRAME_ANCESTORS` me store ka origin nahi | `.env` me daalein → `sudo docker compose up -d` |
| UPI app par paisa gaya, site par pending | observer ko SMS nahi mila (phone offline / notification off) | Gateway admin → Payments → session → "simulate observation", ya owner manually confirm kare |
| Order `failed` aur log me `ORDER_AMOUNT_MISMATCH` | tampering ya galat amount | Gateway session ka amount aur order total match karein |
| Site par button hi nahi dikhta | Sheet me teen values adhoori | `/api/settings` response check karein (Part E) |

**Tareeqa (recommended) — gateway thoda der ke baad bhi na maane:** Panel →
Payments → us session ke saamne **simulate observation** (dev tool) dabaiye —
pipeline wahi asli rehta hai, sirf bank message ki jagah test message jaata hai.

---

## Part H — Demo (bina paisa, sirf flow dekhna ho to)

Repo ke andar ek demo mode hai jo **asli code** chalata hai par gateway ki jagah
ek local stand-in:

```bash
# 1. demo gateway (port 6200) — asli YouPI ka wahi contract bolta hai
PUBLIC_BASE=https://<preview-host>/demo-gateway BASE_PATH=/demo-gateway PORT=6200 \
  node /tmp/demo-youpi.mjs

# 2. store ko demo gateway dikhao
DEMO_GATEWAY=1 \
YOUPI_PAY_URL=/demo-gateway \
YOUPI_PAY_URL_INTERNAL=http://127.0.0.1:6200 \
YOUPI_MERCHANT_ID=demo-merchant \
YOUPI_MERCHANT_KEY=yp_live_demo_secret \
YOUPI_WEBHOOK_SECRET=demo-webhook-secret \
npm run dev -w apps/web
```

Click-path (2 minute):

1. Home → category circle → product → size → **Add to cart**
2. Cart → **Checkout** → address → Review → **Place order**
3. **"Secure UPI checkout"** → **Pay ₹… securely** → modal
4. Modal me **"Pay ₹… (simulate UPI success)"** → order `confirmed` + `paid`
5. Wahi modal me **failed** aur **cancel** bhi try karein

> `DEMO_GATEWAY=1` **production me kabhi set na karein** — ye `/demo-gateway/*`
> ko local port 6200 par proxy karta hai.

---

## Part I — Roz ka 2-minute checklist (owner)

- [ ] Sheet → **Payments**: naye paid orders dekh lein, UTR match karein
- [ ] Gateway admin → **Payments**: koi `MANUAL_REVIEW` pada ho to check karein
- [ ] Bank statement (CSV) import karein → `RECONCILED` ho jaayega
- [ ] Din me **20 se zyada** gateway transactions na ho (YouPI guideline)
- [ ] Mahine me ek baar keys rotate karein (panel → Generate/Rotate) aur Sheet update karein
- [ ] Gateway down ho to `youpi_enabled` = `false` — site seedha UPI QR par chali jaayegi

---

## Part J — Ek page me poori settings (print ke liye)

```
Gateway URL            : https://pay.noorethnicwear.in
Store URL              : https://noorethnicwear.in
Webhook URL            : https://noorethnicwear.in/api/payments/webhook/youpi
Merchant ID            : 7b1e2c3d-4f5a-6b7c-8d9e-0f1a2b3c4d5e
Secret Merchant Key    : mk_live_……            (sirf server)
Webhook Secret         : ……(64 hex)            (sirf server)
CHECKOUT_FRAME_ANCESTORS: https://noorethnicwear.in
Sheet keys             : youpi_pay_url, youpi_merchant_id, youpi_merchant_key,
                         youpi_webhook_secret, youpi_enabled=true
Gateway admin          : ssh -L 6001:127.0.0.1:6001 ubuntu@<server-ip>
                         → http://localhost:6001/admin
```
