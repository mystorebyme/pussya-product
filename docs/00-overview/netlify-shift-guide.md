# Netlify par poora shift — final step-by-step guide

> **Kya hai ye doc:** Vercel se **Netlify** par shift karne ki **ek hi baar ki poori guide** —
> doosri site (admin), saari env values, saare functions ka naksha, domain kaise jhulega,
> aur deploy ke baad kya-kya check karna hai.
>
> **Time:** 30–40 minute (domain ke DNS ke liye 24 ghante tak extra, wo automatic hota hai).
>
> **Kya badal raha hai:** sirf *hosting*. Code, database (Supabase), Google Sheet,
> Apps Script, UPI, WhatsApp, admin panel, footer/header — **sab wahi rahega**.

---

## 0. Pehle 60 second me poori tasveer

```
                        ┌──────────────────────────────┐
   customer ──────────► │  Netlify site #1  (storefront)│  apps/web
                        │  pages + /api/* (functions)   │
                        └───────────┬──────────────────┘
                                    │
              ┌─────────────────────┼─────────────────────┐
              ▼                     ▼                     ▼
      Supabase Postgres      Google Sheet + Apps          WhatsApp 
      (orders, messages,      Script (owner ka            
       reviews, traffic)      control panel)              UPI: sheet (upi_id) se

                        ┌──────────────────────────────┐
   owner ─────────────► │  Netlify site #2  (admin)     │  apps/admin
                        └──────────────────────────────┘
                        (ye site #1 ki /api/admin/* API token se baat karti hai)

   GitHub Pages (optional preview) ──► wahi Netlify API (repo variable STORE_API_URL)
```

**Netlify par 2 site banengi** (ek repo se):

| # | Site | Kaam | Folder |
|---|---|---|---|
| 1 | `noor-clothing` | customer wali site + saari API | `apps/web` |
| 2 | `noor-admin` | owner ka admin panel | `apps/admin` |

> ⚠️ Pehla kaam: PR (`arena/f713eef1-tannu-product` → `main`) merge kar dein.
> Netlify hamesha **default branch** (`main`) se production deploy karta hai.
> Agar merge abhi nahi karna, to Netlify me *Production branch* me wahi branch
> select kar lein (baad me `main` kar dena).

---

## 1. Netlify account + GitHub jodna

1. **https://app.netlify.com/signup** → **"Sign up with GitHub"** (yahi sabse aasan).
   GitHub account: `mystorebyme`.
2. GitHub permission maange to **"Only select repositories"** → `mystorebyme/tannu-product-` → **Install**.
3. Team ka naam: `mystorebyme` (kuch bhi chalega).

---

## 2. Site #1 — storefront (`apps/web`)

1. Netlify dashboard → **Add new project** → **Import an existing project** → **GitHub**
   → repo **`mystorebyme/tannu-product-`** select karein.
2. Netlify monorepo detect karega aur list dikhayega — agar `apps/web` list me hai to use
   select karein, warna **"Other (configure manually)"**.
3. Settings **exactly** aise rakhein:

| Field | Kya likhna hai |
|---|---|
| **Base directory** | *(khaali chhod dein — repo root)* |
| **Package directory** | `apps/web` |
| **Build command** | `npm run build --workspace @noor/web` |
| **Publish directory** | `apps/web/.next` |
| **Branch to deploy** | `main` |

> Ye teen values repo me `apps/web/netlify.toml` se bhi aati hain — UI me wahi dikhe to sahi hai.
> **Base directory khaali hi rahe** (npm workspaces root me resolve hote hain; base ko
> `apps/web` karne par `@noor/types` jaisi local packages nahi milengi).

4. **Site name** → `noor-clothing` (isse URL `https://noor-clothing.netlify.app` banta hai —
   naam free plan par badla ja sakta hai).

5. Abhi **Deploy** mat dabaiye — pehle **env variables** daalne hain (step 2.1),
   warna build ke baad site par UPI/DB/sheet kuch kaam nahi karega.

### 2.1 Site #1 ke env variables — **exactly ye 12**

Path: **Project configuration → Environment variables → Add a variable**
(ya "Import from a .env file" me neeche wali lines paste karke **Import**).
Scope: **All** (Production + Deploy previews + Branch deploys).

| # | Key | Value (kya likhna hai) |
|---|---|---|
| 1 | `NEXT_PUBLIC_SITE_URL` | Abhi: `https://noor-clothing.netlify.app` · Domain aane par: `https://noorethnicwear.in` |
| 2 | `STORE_UPI_ID` | optional emergency fallback — production me R38 se **delete** (UPI sirf sheet se) |
| 3 | `STORE_UPI_NAME` | `Noor Ethnic Wear` |
| 4 | `ADMIN_API_TOKEN` | **Vercel se copy** (noor-web project). Admin site me **bilkul same** daalna hai |
| 5 | `GOOGLE_SHEETS_WEBAPP_URL` | **Vercel se copy** (`https://script.google.com/macros/s/…/exec`) |
| 6 | `GOOGLE_SHEETS_TOKEN` | **Vercel se copy** (Apps Script ke `TOKEN` se same) |
| 7 | `DATABASE_URL` | **Supabase → Settings → Database → Connection string → "Connection pooling / Transaction"** wala URI (port `6543`). Password me `@ # %` ho to URL-encode karein |
| 8 | `SHEET_SELFTEST_KEY` | **Vercel se copy** (optional par useful — sheet test endpoint) |
| 9 | `UPI_RETURN_SECRET` | **Vercel se copy** (khaali ho to `ADMIN_API_TOKEN` use hota hai) |
| 10 | `OTP_TOKEN_SECRET` | **Vercel se copy** (khaali chalega, par wahi rakhein jo Vercel par hai) |
| 11 | `OTP_DEV_MODE` | `on` |
| 12 | `CORS_ALLOWED_ORIGINS` | `https://mystorebyme.github.io` *(GitHub Pages preview ke liye — already default me hai, sirf tab daalein jab aur origin chahiye)* |

**Optional (abhi zarurat nahi):** `NEXT_PUBLIC_GA_ID` (Google Analytics 4),
`NEXT_PUBLIC_FIREBASE_*` + `FIREBASE_*` (phone OTP), `SELLER_GSTIN`, `GST_HSN`,
`ADMIN_PANEL_URL` (admin ka link), `RESEND_API_KEY` / `EMAIL_FROM`.

> **Rule yaad rakhein:** site par **support email kahin nahi** — `CONTACT_EMAIL` /
> `SELLER_EMAIL` me kuch mat daalein (message DB + Sheet me jaata hai, customer ko
> sirf WhatsApp dikhta hai).

### 2.2 Sabse aasan tareeka — env ek file se import kar lein

Repo me ready files hain (bas `<...>` wali values bharni hain):

| Site | File |
|---|---|
| #1 storefront | `infra/netlify/web.env.example` |
| #2 admin | `infra/netlify/admin.env.example` |

Netlify → **Environment variables** → **Import from a .env file** → in file ka content
paste → **Import** → phir jis value me `<…>` hai use bhar dein (ya import ke baad edit karein).

### 2.3 Ab deploy

**Deploys → Trigger deploy → Deploy site.**
Build log me ye 3 cheezein dikhni chahiye:

1. `Installing @netlify/plugin-nextjs` (Next.js runtime)
2. `Compiled successfully` + route list (`/api/orders`, `/orders/[orderNumber]` …)
3. `Deploy is live!`

Build fail ho to **Part 11 (Troubleshooting)** dekhein — 90% cases me Base/Package
directory galat hota hai.

---

## 3. Site #2 — admin panel (`apps/admin`)

1. Netlify dashboard → **Add new project** → GitHub → **wahi repo** → **Other (configure manually)**.
2. Settings:

| Field | Kya likhna hai |
|---|---|
| **Base directory** | *(khaali — repo root)* |
| **Package directory** | `apps/admin` |
| **Build command** | `npm run build --workspace @noor/admin` |
| **Publish directory** | `apps/admin/.next` |
| **Branch to deploy** | `main` |

3. **Site name**: `noor-admin` → `https://noor-admin.netlify.app`

### 3.1 Site #2 ke env variables — **exactly ye 7**

| # | Key | Value |
|---|---|---|
| 1 | `ADMIN_EMAIL` | `admin@noorethnicwear.in` (login ka email) |
| 2 | `ADMIN_PASSWORD` | **Vercel se copy** (apna admin password) |
| 3 | `ADMIN_SESSION_SECRET` | **Vercel se copy** (`openssl rand -hex 32` se bana hua) |
| 4 | `ADMIN_API_TOKEN` | **Vercel se copy — site #1 ke `ADMIN_API_TOKEN` se bilkul same** |
| 5 | `STORE_API_URL` | Site #1 ka URL: `https://noor-clothing.netlify.app` (domain ke baad `https://noorethnicwear.in`) |
| 6 | `NEXT_PUBLIC_STORE_URL` | Wahi site #1 URL (admin se "site dekhein" links) |
| 7 | `NEXT_PUBLIC_STOREFRONT_URL` | Wahi site #1 URL (invoice/receipt links) |

**Optional:** `ADMIN_PANEL_URL` (`https://noor-admin.netlify.app`),
`GOOGLE_SHEETS_WEBAPP_URL` (sheet page ka status dikhane ke liye).

> ⚠️ `ADMIN_API_TOKEN` dono sites par **same** hona chahiye — warna admin panel
> orders/messages par `401 Unauthorized` dega. Token badle to **dono** jagah badlein.

---

## 4. Saare functions ka naksha — "kisme kya likhna hai"

Har row = ek live URL. `apps/web/src/app/api/...` ke andar file hai.
**"Chahiye"** column me wahi env variables likhe hain jo us function ko chalti hain —
matlab un env ke bina wo function 500/empty dega.

### 4.1 Customer (public) functions

| URL | Kaam | Chahiye |
|---|---|---|
| `GET /api/health` | deploy check (`{"ok":true,…}`) | *(kuch nahi)* |
| `GET /api/settings` | UPI id/naam, WhatsApp, announcement (sheet se live) | `GOOGLE_SHEETS_*` *(optional — na ho to admin defaults)* |
| `GET /api/products` | product list/filter | *(catalog file)* |
| `GET /api/search` | search | *(catalog)* |
| `GET /api/best-sellers` | best sellers | *(catalog)* |
| `GET /api/rotation` | homepage ka rotation order | *(catalog)* |
| `POST /api/delivery/check?pincode=` | pincode serviceable? (state + per-pincode block) | `DATABASE_URL` |
| `POST /api/orders` | **checkout → order** (DB + Sheet dono me) | `DATABASE_URL`, `GOOGLE_SHEETS_*`, `ADMIN_API_TOKEN` |
| `GET /api/orders/[orderNumber]` | order data | `DATABASE_URL` |
| `GET /api/orders/[orderNumber]/public` | Pages preview / shell ke liye masked data | `DATABASE_URL` |
| `GET /api/orders/[orderNumber]/payment` | payment status polling | `DATABASE_URL` |
| `GET /api/orders/[orderNumber]/invoice` | GST invoice (PDF) | `DATABASE_URL`, `SELLER_GSTIN`, `SELLER_NAME/ADDRESS/STATE`, `GST_HSN` |
| `POST /api/payments/intent` | UPI link + token | `DATABASE_URL`, `UPI_RETURN_SECRET` |
| `GET /api/payments/return` | UPI app se wapas → auto confirm | `UPI_RETURN_SECRET` |
| `POST /api/payments/claim` | "Payment ho gaya" (phone ke last 4 digit) | `DATABASE_URL`, `GOOGLE_SHEETS_*` |
| `POST /api/payments/failed` | payment fail report | `DATABASE_URL` |
| `POST /api/payments/manual` | manual UPI entry | `DATABASE_URL`, `ADMIN_API_TOKEN` |
| `GET /api/payments/status` | payment status | `DATABASE_URL` |
| `POST /api/contact` | contact form → DB + **Messages sheet** (email nahi) | `DATABASE_URL`, `GOOGLE_SHEETS_*` |
| `POST /api/newsletter` | newsletter → DB + Sheet | `DATABASE_URL`, `GOOGLE_SHEETS_*` |
| `POST /api/otp/start` · `verify` · `GET /api/otp/status` | phone OTP (Firebase) | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*`, `OTP_TOKEN_SECRET` |
| `POST /api/track` | apna traffic counter | `DATABASE_URL` (na ho to file) |
| `POST /api/checkout/events` | checkout funnel events → Sheet | `DATABASE_URL`, `GOOGLE_SHEETS_*` |

### 4.2 Owner (admin) functions — `Authorization: Bearer <ADMIN_API_TOKEN>`

| URL | Kaam | Chahiye |
|---|---|---|
| `GET/PATCH /api/admin/orders` · `/api/admin/orders/[orderNumber]` | order list / status + tracking update | `ADMIN_API_TOKEN`, `DATABASE_URL`, `GOOGLE_SHEETS_*` |
| `GET/POST /api/admin/settings` | sheet-settings save | `ADMIN_API_TOKEN`, `GOOGLE_SHEETS_*` |
| `GET /api/admin/messages` · `PATCH` | messages list / replied mark | `ADMIN_API_TOKEN`, `DATABASE_URL` |
| `GET/POST /api/admin/invoices` · `[number]` | invoice banao / dekho | `ADMIN_API_TOKEN`, `DATABASE_URL` |
| `GET/POST /api/admin/delivery` | state-wise + pincode block | `ADMIN_API_TOKEN`, `DATABASE_URL` |
| `GET /api/admin/checkout-events` | funnel | `ADMIN_API_TOKEN`, `DATABASE_URL` |
| `GET /api/admin/traffic` | traffic dashboard | `ADMIN_API_TOKEN`, `DATABASE_URL` |
| `GET /api/admin/sheet` | sheet ki health/status | `ADMIN_API_TOKEN`, `GOOGLE_SHEETS_*` |
| `GET /api/sheet-selftest?key=…` | sheet write test (key-gated) | `SHEET_SELFTEST_KEY`, `GOOGLE_SHEETS_*` |

### 4.3 Dormant (chalu nahi karne)

`/api/payments/webhook/[gateway]`, `/api/webhooks/razorpay` — third-party gateway ke liye the.
Owner rule: **koi gateway nahi**, sirf UPI. Inhe na chhedna, na koi key dena.

### 4.4 Ek line me: "kaun sa kaam, kaun si env"

| Kaam | Env |
|---|---|
| Site ka URL/SEO/WhatsApp links | `NEXT_PUBLIC_SITE_URL` |
| UPI payment | `STORE_UPI_ID`, `STORE_UPI_NAME`, `UPI_RETURN_SECRET` |
| Orders / customers / messages / invoices / traffic | `DATABASE_URL` |
| Google Sheet (owner ka control panel) | `GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_TOKEN` |
| Admin panel ka access | `ADMIN_API_TOKEN` (dono sites par same) |
| Admin login | `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET` |
| GST invoice | `SELLER_GSTIN`, `SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_STATE`, `GST_HSN` |
| OTP (agar chalu karna ho) | `NEXT_PUBLIC_FIREBASE_*`, `FIREBASE_*`, `OTP_TOKEN_SECRET` |

---

## 5. Google Sheet + Apps Script — kuch nahi badalta

Sheet hosting se judi nahi hoti, isliye shift se **koi asar nahi**:

- `GOOGLE_SHEETS_WEBAPP_URL` + `GOOGLE_SHEETS_TOKEN` dono sites par copy ho jaye bas.
- Sheet me demo/real data bharne ke liye (R27-3 ka seed) — Apps Script me naya code
  paste + **Deploy → New version** → phir `?action=seed&token=…`
  (steps: `docs/00-overview/apps-script-setup-steps.md`).
- Check: `https://<site>/api/sheet-selftest?key=<SHEET_SELFTEST_KEY>` → `"ok": true`.

---

## 6. Deploy ke baad — verification checklist (5 minute)

Site #1 par:

| # | Kholiye / chalaiye | Sahi jawab |
|---|---|---|
| 1 | `https://noor-clothing.netlify.app/api/health` | `{"ok":true,...}` |
| 2 | homepage | banner + ₹499–₹699 prices, logo center |
| 3 | `/collections/sale` | products dikhein |
| 4 | koi product page | colour/size/₹, add to cart |
| 5 | `/checkout` → test order (apna phone) | order number `NE-…` mile |
| 6 | `/orders/NE-…/pay` | UPI QR + **sirf "mobile ke last 4 digit"** + "Payment ho gaya — confirm kariye" |
| 7 | "last 4 digit" daal ke confirm | green message + status `processing` |
| 8 | `/pages/contact` form bhejein | thank-you + **Sheet → Messages tab me row** |
| 9 | `https://<site>/api/delivery/check?pincode=302006` | `serviceable: true` |
| 10 | `/sitemap.xml`, `/robots.txt` | apna domain URL |

Site #2 (admin):

| # | Kholiye | Sahi jawab |
|---|---|---|
| 11 | `https://noor-admin.netlify.app` login | login ho jaye |
| 12 | Orders | test order dikhe (status update bhi karein) |
| 13 | Messages | contact form ka message dikhe |
| 14 | Sheet page | "configured" + rows |
| 15 | Invoice | PDF khule (GST) |

Sab theek = shift ho gaya. Ab domain.

---

## 7. Domain kaise jhulega (do tareeke — koi ek chuniye)

> ⚠️ `noorethnicwear.in` **abhi aapka nahi** hai (aapne bataya tha). Domain
> khareedne/transfer ke baad hi ye steps kaam karenge. Tab tak site
> `https://noor-clothing.netlify.app` par live rehti hai — koi dikkat nahi.
>
> Domain kahan se: GoDaddy / Namecheap / Hostinger / BigRock / Cloudflare Registrar
> (`.com` ~₹800–1200/saal). Jo bhi ho — **DNS panel wahi milega jo neeche chahiye**.

### Option A — Netlify DNS (sabse aasan, recommended)

1. Netlify → site #1 → **Domain management** → **Add a domain** → `noorethnicwear.in`
   → **Set up Netlify DNS** → Netlify **4 nameservers** dega
   (kuch aisa: `dns1.p0X.nsone.net`, `dns2.p0X.nsone.net`, `dns3.p0X.nsone.net`, `dns4.p0X.nsone.net`)
   — **screen par jo dikhe wahi copy karein**, apne hisaab se mat likhein.
2. Domain registrar ke panel me → **Nameservers / DNS** → *"Use custom nameservers"* →
   wahi 4 paste → Save.
3. 1–24 ghante (usually 1–2 ghante). Netlify khud verify kar lega.
4. Netlify → **Domain management → HTTPS → Verify DNS configuration → Provision certificate**
   (Let's Encrypt free, automatic renew).
5. **Primary domain** = `noorethnicwear.in`; `noorethnicwear.in` → **"Redirect to primary"**
   (301). Isse duplicate SEO nahi hota.

### Option B — apna existing DNS (registrar ke DNS panel me records)

Sirf 2 record chahiye (site #1):

| Type | Name / Host | Value | TTL |
|---|---|---|---|
| **A** | `@` (apex / root) | `75.2.60.5` | Auto / 3600 |
| **CNAME** | `www` | `noor-clothing.netlify.app` | Auto / 3600 |

Admin ke liye (site #2, optional par recommended):

| Type | Name / Host | Value |
|---|---|---|
| **CNAME** | `admin` | `noor-admin.netlify.app` |

Phir:

1. Purane records **hata dein** — jo `A @` Vercel (`76.76.21.21`) ya kisi aur IP par ho,
   aur `www` ka purana CNAME.
2. Netlify → site #1 → **Domain management → Add a domain** → `noorethnicwear.in`
   → **"Check DNS configuration"** — Netlify bolega "Awaiting external DNS" jab tak
   records propagate na ho (5 min – 24 hrs).
3. Netlify → **HTTPS → Verify DNS configuration → Provision certificate** (free SSL).
4. Wahi `admin.noorethnicwear.in` site #2 me add karein + certificate.

### Domain judne ke baad — **3 jagah URL update + redeploy**

| Kahan | Kya badalna |
|---|---|
| Site #1 env | `NEXT_PUBLIC_SITE_URL` = `https://noorethnicwear.in` → **Deploys → Clear cache and deploy** |
| Site #2 env | `STORE_API_URL`, `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_STOREFRONT_URL` = `https://noorethnicwear.in` (+ `ADMIN_PANEL_URL` = `https://admin.noorethnicwear.in`) |
| Google Sheet → `Settings` tab | `admin_url` = `https://admin.noorethnicwear.in` |

Saath me (5 min):

- **Google Search Console** → Add property `noorethnicwear.in` → verify
  (DNS TXT record sabse aasan; code me pehle se meta tag `hFaqyp-…` laga hua hai)
  → **Sitemaps** → `https://noorethnicwear.in/sitemap.xml` submit.
- WhatsApp/Instagram links env se bante hain — domain badalne par automatically sahi ho jayenge.
- **GitHub Pages preview** (agar use karte hain) → GitHub repo → **Settings → Secrets and
  variables → Actions → Variables** → `STORE_API_URL` = `https://noorethnicwear.in`.

### DNS check karne ke commands (optional)

```bash
dig +short noorethnicwear.in          # 75.2.60.5 aana chahiye
dig +short noorethnicwear.in      # CNAME → noor-clothing.netlify.app
curl -I https://noorethnicwear.in     # HTTP/2 200 + strict-transport-security
```

---

## 8. Netlify settings jo ek baar set karne hain

| Setting | Kahan | Kya |
|---|---|---|
| **Production branch** | Build & deploy → Branches | `main` |
| **Deploy previews** | Build & deploy → Branches | **Off** (credits bachate hain) |
| **Auto publishing** | Deploys | On |
| **Functions region** | Cloud compute → Functions → Region | `sin` (Singapore) ya `cmh` (Ohio) — **Pro plan par hi badal sakta hai**, free par default `cmh` |
| **Function timeout** | — | Naye accounts par sync function **60s** tak chalti hai (kaafi hai). Purane account par 10s ho to support se 26s karwa lein |
| **Form detection** | Forms | Off (hum apna form API use karte hain) |
| **Asset optimization** | Build & deploy → Post processing | Off (Next khud optimize karta hai) |

---

## 9. Vercel ka kya karein (order matter karta hai)

1. Netlify par dono site **live + verify** hone tak **Vercel ko delete mat karein**.
2. Domain Netlify par shift karne ke baad 2–3 din Vercel chalta rahe (backup).
3. Sab theek ho jaye to Vercel projects **pause** kar dein (delete ki zarurat nahi) —
   `vercel.com → project → Settings → Pause`.
4. Wapas jaana ho to: Netlify me purana deploy → **"Publish deploy"** (rollback 1 click),
   ya domain ka DNS wapas Vercel par.

**Rollback checklist:** Netlify → Deploys → koi purana successful deploy → **Publish deploy**.
Env galat lagane par bhi purana deploy turant wapas live ho jaata hai.

---

## 10. Free plan — kitna milta hai (paisa lagega ya nahi)

- Netlify naye accounts par **credits** deta hai (bandwidth + builds + functions sab
  usi pool se). Number Netlify badalte rehta hai — **deploy se pehle
  https://www.netlify.com/pricing/ par apne plan ka number dekh lein**.
- Is site ka traffic mostly HTML/JS hai (product photos Shopify CDN se seedha browser
  me aati hain), isliye bandwidth kam lagta hai.
- Credit khatam ho to site band ho jaati hai — us waqt ya plan upgrade, ya Vercel
  Hobby wapas (code wahi hai, sirf env copy karke).
- **Admin site (#2)** par traffic almost zero hai — usse credit nahi khata.

---

## 11. Troubleshooting — jo galti sabse pehle hoti hai

| Symptom | Karan | Fix |
|---|---|---|
| Build fail: `Cannot find module '@noor/types'` | Base directory `apps/web` kar diya | Base **khaali**, Package directory `apps/web` |
| Deploy "live" par har page **Netlify 404** | Next runtime nahi chala | `netlify.toml` me `[[plugins]] package = "@netlify/plugin-nextjs"` hona chahiye (repo me hai) + **Clear cache and deploy** |
| `/api/orders` 500 | `DATABASE_URL` nahi/galat | Supabase ka **pooler** URL (port 6543) daalein, redeploy |
| Orders ban rahe hain par **Sheet khaali** | `GOOGLE_SHEETS_*` galat, ya Apps Script ka purana deploy | `?action=health&token=…` se version check, Apps Script **New version** deploy |
| Admin par **401** | `ADMIN_API_TOKEN` dono sites par alag | Dono jagah same token, redeploy |
| Admin me orders **khali** | `STORE_API_URL` nahi | Site #1 ka URL daalein |
| Payment page par QR nahi | sheet ka `upi_id` khaali / script down | `/api/sheet-health` kholiye → `help[]` ka fix kariye; Settings tab me `upi_id` bhariye |
| Contact form theek par **message admin me nahi** | DB vs API base | `DATABASE_URL` check, admin `STORE_API_URL` check |
| Images nahi khul rahi | CSP/remotePatterns | `next.config.ts` me `cdn.shopify.com` already allowed — build cache clear karein |
| Domain par **"Not Secure"** | certificate issue nahi hua | Netlify → HTTPS → **Verify DNS → Provision certificate** (DNS pehle sahi hona chahiye) |
| `www` khulta hai, apex nahi | A record missing | `A @ → 75.2.60.5` add karein |
| Deploy ke baad purana data dikh raha | cache | Deploys → **Clear cache and deploy site** |
| Build pass, par "publish directory not found" / site khaali | `publish` ka path | UI me Publish directory ek baar `.next` karke dekhein (kuch cases me package directory ke relative chahiye hota hai); phir `apps/web/.next` wapas |
| Node version warning | `.nvmrc` | `netlify.toml` me `NODE_VERSION = "22"` already hai — build log me `Node.js 22` dikhna chahiye |

---

## 12. Ek page ka cheat sheet (print kar lein)

```
NETLIFY SITE #1  (storefront)          NETLIFY SITE #2  (admin)
Base directory   : (khaali)            Base directory   : (khaali)
Package directory: apps/web            Package directory: apps/admin
Build command    : npm run build --workspace @noor/web
                                       : npm run build --workspace @noor/admin
Publish          : apps/web/.next      Publish          : apps/admin/.next
Branch           : main                Branch           : main

ENV #1 (12): NEXT_PUBLIC_SITE_URL, STORE_UPI_ID, STORE_UPI_NAME,
             ADMIN_API_TOKEN, GOOGLE_SHEETS_WEBAPP_URL, GOOGLE_SHEETS_TOKEN,
             DATABASE_URL, SHEET_SELFTEST_KEY, UPI_RETURN_SECRET,
             OTP_TOKEN_SECRET, OTP_DEV_MODE, CORS_ALLOWED_ORIGINS

ENV #2 (7) : ADMIN_EMAIL, ADMIN_PASSWORD, ADMIN_SESSION_SECRET, ADMIN_API_TOKEN,
             STORE_API_URL, NEXT_PUBLIC_STORE_URL, NEXT_PUBLIC_STOREFRONT_URL

DOMAIN (Option B):  A     @     → 75.2.60.5
                    CNAME www   → noor-clothing.netlify.app
                    CNAME admin → noor-admin.netlify.app

DOMAIN ke baad: NEXT_PUBLIC_SITE_URL / STORE_API_URL badalna + redeploy
                GSC verify + sitemap submit + Sheet Settings → admin_url
```

---

## 13. "Kaun file kya karti hai" (code dekhna ho to)

| File | Kaam |
|---|---|
| `apps/web/netlify.toml` | storefront build + Next runtime + headers |
| `apps/admin/netlify.toml` | admin build + noindex headers |
| `infra/netlify/web.env.example` | site #1 ke 12 env (copy-paste import ke liye) |
| `infra/netlify/admin.env.example` | site #2 ke 7 env |
| `apps/web/src/lib/db.ts` | Postgres pool (serverless par 1 connection) + schema bootstrap |
| `apps/web/src/lib/cors.ts` | Pages/Netlify origins allowlist (checkout/payment ke liye) |
| `apps/web/src/lib/google-sheets.ts` | Sheet me row likhna/padhna |
| `apps/web/src/lib/notify.ts` | contact form ka optional email layer (email site par nahi dikhta) |
| `scripts/google-apps-script/noor-sheets.gs` | poora Apps Script (16 tabs, settings, demo data) |
| `.github/workflows/pages.yml` | GitHub Pages preview (variable `STORE_API_URL`) |
