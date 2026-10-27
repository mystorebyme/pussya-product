# Round 27 — Owner report (logo center, Google verification, traffic, sheet)

Date: 2026-10-25 · Live commit: `c301ba5` (web) · Repo HEAD: `57f250e`
Site: https://noor-ethnic-wear.vercel.app · Admin: https://noor-admin.vercel.app

---

## 1. Logo header + footer me center ✅ (ho gaya)

- **Header (laptop/desktop):** 3 column — beech me logo (exact center), left me menu,
  right me search/wishlist/cart. Mobile/tablet par pehle jaisa hi center.
- **Footer:** logo lockup poora center me (text ke saath).
- Logo **same to same** hai — koi redraw/change nahi.

File: `apps/web/src/components/site-header.tsx`, `apps/web/src/components/site-footer.tsx`

## 2. Google Search Console verification ✅ (code me lag gaya)

Do tareeke dono laga diye, Google ko dono chalte hain:

1. **Meta tag** — `<meta name="google-site-verification" content="hFaqyp-9LdUXSKPA9RF011TkO2m_-7AUMasXqm_0dGI" />`
   (file: `apps/web/src/app/layout.tsx`)
2. **HTML file** — aapki di hui `googleb3b0e3defc1daa17.html`
   → live: https://noor-ethnic-wear.vercel.app/googleb3b0e3defc1daa17.html

**Aapko karna hai:** Search Console → Add property → **URL prefix**
`https://noor-ethnic-wear.vercel.app/` → Verify. Ho jaane ke baad property par
**"Domain"** wala option baad me `noorethnicwear.in` par bhi laga sakte hain (jab domain aapke paas ho).

## 3. "Pure traffic ka pata chalna chahiye" ✅ (tracking laga di)

Naya file: `apps/web/src/components/analytics.tsx`

- **Vercel Web Analytics** — kis page par kitne log, kahan se aaye, kitne ne cart/checkout
  kiya. `/_vercel/insights/script.js` automatically chalta hai.
- **Vercel Speed Insights** — page kitni jaldi khulti hai (real users par).
- **Google Analytics 4 (optional)** — jis din chahein, Vercel → Settings → Environment
  Variables me `NEXT_PUBLIC_GA_ID` = `G-XXXXXXXXXX` daal dein, GA4 turant on ho jayega.

**Aapko karna hai (1 minute):** Vercel → project **noor-clothing** → **Analytics** tab →
**Enable** (aur **Speed Insights** → Enable). Ye na karne par script 404 deti hai.
Iske baad 24 ghante me dashboard par data dikhna shuru ho jaata hai.

## 4. Contact form submit ke baad update ✅

- Submit hote hi: form clear + green "Message mil gaya" + **"Send another"** button.
- Message turant **admin → Messages → New** me aa jaata hai (page bhi khud 15 sec me
  refresh hota hai — manuallly reload karne ki zaroorat nahi).
- Message ka **naam click** kariye → us customer ki poori detail (orders, total spend).
- Poori baat padhne ke liye message par click → khul jaati hai.

## 5. Sheet — asli problem mil gayi (ye aapke 1 click ka kaam hai)

Aaj test kiya: **order/message database me 100% save ho raha hai**
(`rowInDb:true`, DB me 5 messages), par **Google Sheet me copy nahi ho raha**.
Wajah hamare code me nahi hai — **Apps Script deployment** me hai:

Test ka jawab aaya:
```
message:  { ok: true, id: "bd1fdf30-…", rowInDb: true, dbCount: 5, sheetMirror: false }
read:     HTTP 200 par body = Google ka login page (JSON nahi)
urlDeployment: "AKfycbwIJ1ge…"
```

Iska matlab: Vercel me jo `/exec` URL pada hai (`AKfycbwIJ1ge…`) wo
**Google login page** de raha hai — yaani us deployment ka access **"Anyone" nahi**
hai, ya wo deployment purana/dead hai. Aapne naya deploy kiya, par uska URL Vercel
me nahi gaya (Vercel me abhi bhi purana URL pada hai).

### Fix — step by step (5 minute, ek hi baar)

1. Sheet kholein → **Extensions → Apps Script**.
2. Sabse **pehli line** ye rakhein (aur save):
   ```js
   var SPREADSHEET_ID = '1k8fsea04WpbrGjiyXuDrrS2Eewt9W7wx9X2lUQc5qMo';
   ```
   (poora code: `docs/00-overview/apps-script-code.md` — copy-paste kaafi hai)
3. `Ctrl + S` (save).
4. **Deploy → Manage deployments** → jo deployment chalu hai uske aage **✏️ (edit)** →
   **Version: New version** → **Who has access: Anyone** (⚠️ "Anyone with a Google
   account" **nahi** — wahi login page deta hai) → **Deploy**.
5. Wo **naya `/exec` URL** copy karein (browser me kholein — JSON aana chahiye
   `{"ok":true,...}`, Google login page nahi).
6. Vercel → noor-clothing → Settings → Environment Variables →
   `GOOGLE_SHEETS_WEBAPP_URL` → **Edit** → naya `/exec` URL paste → Save →
   **Deployments → latest → ⋯ → Redeploy** (env change ke baad redeploy zaroori hai).
7. Fir ye link kholein (30 second me sach):
   ```
   https://noor-ethnic-wear.vercel.app/api/sheet-selftest?key=lk-st-9f3k2m-7hq4rt-2026&v=fix1
   ```
   - `read.status 200` + `ok:true` = ho gaya ✅
   - `scriptHint` line padh lijiye — wo seedha batata hai kya karna hai.

**Yaad rakhein:** `/exec` URL kisi ko WhatsApp par na bhejein — wo password jaisa hai
(us se aapki sheet me row daali ja sakti hai). Sirf Vercel me daalein.

## 6. Extra (is round me saath me)

- **Payment page ab aur tez** — sheet slow ho to bhi step 3 par intezaar nahi
  (settings 350ms budget + 900ms sheet read timeout).
- **Cold start khatam** — `.github/workflows/keep-warm.yml` har 5 minute me site ko
  halka ping karta hai, isliye pehla order/page load slow nahi hoga (GitHub par free).
- **Admin auto-refresh** — Messages page 15 second me khud update (R27).

## Test result (is commit par)

- TypeScript: web ✅ clean, admin ✅ clean
- Unit tests: **121 pass / 0 fail**
- Web build: ✅ pass
- Deploy: `dpl_8meNZYXfGrEAMow8iLbVDhy3eW2x` (web, production par live), `dpl_3HB9ckjtTLfVjifvMvnoF6F5q5CX` (admin)

## 7. Traffic ka apna counter (dashboard toggle ke bina) — naya

Vercel ka analytics script sirf tab chalta hai jab dashboard me "Enable" ho. Aaj test
kiya: `/_vercel/insights/script.js` = **404** (enable nahi hua). Isliye ek **apna**
counter bhi laga diya:

- website ke har page view par chhoti si POST `/api/track` (koi cookie nahi, IP ka
  sirf hash) → Postgres me `traffic_daily` + `traffic_visitors`
- **admin → Traffic** page: aaj/kal ke views, 7 din ka graph, top pages, aur traffic
  kahan se aaya (Google / Instagram / WhatsApp / Direct)
- bots + preview traffic count nahi hota

File: `apps/web/src/lib/traffic.ts`, `app/api/track/route.ts`,
`components/page-view-tracker.tsx`, `apps/admin/src/app/(admin)/traffic/page.tsx`

Iske saath hi Vercel Analytics/GA4 bhi code me lage hain — jab aap dashboard me
"Enable" karenge, dono jagah data milega.

## 8. Aaj ke test (live, GitHub Actions se)

`Live site audit` chalaya — **saare steps pass**:
storefront smoke (order → pay → invoice → track → contact), internal links (0 404),
Round 16, Round 23 (pincode/speed/WhatsApp), Round 27 (logo center · GSC meta +
file · analytics tags · contact submit + DB save).

Unit tests: **129 pass / 0 fail**.

---

## 9. Deploy ki limit (isliye 2 cheezein kal live hongi)

Vercel **Hobby (free)** plan par ek din me **100 deployments** ki limit hai — aaj wo
limit poori ho gayi (`Resource is limited … api-deployments-free-per-day`). Isliye
aaj ka last deploy `c301ba5` hai; uske baad ke 2 chhote changes (mobile par logo
bilkul exact center + Traffic ka apna counter) **agle deploy par** live honge
(kal automatic, ya jab main redeploy karunga).

Jo aaj **live** hai: logo center (desktop), GSC meta + file, analytics tags,
contact form ka success + admin Messages, admin auto-refresh, sheet error hints,
payment step ki speed.

**Bachne ka tareeka:** ek din me 2-3 se zyada deploy na karein — har push par naya
deploy banta hai, aur limit cross hone par us din koi deploy nahi hota.

---

## 10. Apps Script v3 — poora naya code (1387 lines, 16 tabs)

Owner ne kaha "naya code likho, sab kuch add karo" → script poori tarah dobara likhi gayi:

- **16 tabs:** Settings, Dashboard, Orders, OrderItems, Payments, Invoices, Shipments,
  Checkout, Messages, Newsletter, Reviews, Coupons, Inventory, Audit, Errors, Sync
- **naye endpoints:** `health`, `ping`, `version`, `settings`, `recent`, `rows`,
  `search`, `order` (ek order ki poori kahani), `stats`, `dashboard` (GET) aur
  `append`, `settings_save`, `order_update`, `invoice_save`, `stock_update`,
  `coupon_save`, `review_add`, `subscribe`, `message_status`, `setup`, `repair` (POST)
- **safety:** token check, lock (do requests ek saath), header auto-repair,
  duplicate email/review skip, error log `Errors` tab me, `Sync` tab me har sync ka hisaab
- **speed:** ek sheet ki saari rows ek hi `setValues` call me (appendRow se ~10x tez)
- **owner ke liye functions:** `setup`, `testSelf`, `testAppend`, `repairHeaders`,
  `backupNow`, `installTriggers` (roz 9 PM dashboard + Sunday backup)
- **website side bhi juda:** order place → `OrderItems`, courier/AWB → `Shipments`,
  GST invoice → `Invoices` (ye tabs pehle khaali rehte the)

Steps: **[`apps-script-setup-steps.md`](./apps-script-setup-steps.md)** ·
Code: **[`apps-script-code.md`](./apps-script-code.md)**

Tests: **137 pass / 0 fail** (16 naye test sirf script ke liye — galat token, duplicate
review/coupon/newsletter, invoice/stock/tracking rows, stats/search/order, sab cover).

---

## 11. R27-2 — sheet CHALU ho gayi, payment page simple, columns fix

### ✅ Messages ab sheet me aa rahe hain (live proof)

Permission milne ke baad live test:

```json
"message": {"ok": true, "rowInDb": true, "dbCount": 5, "sheetMirror": true}
```

`Messages` tab me rows padi hain (Timestamp, Name, Email, Phone, Subject, Message, Status…).
Saath me `Sync`, `Checkout`, `Newsletter`, `Audit` bhi bhar rahe hain.

> Pehle jo messages nahi aate the, wo **permission** ki wajah se the — ab theek hai.

### 🆕 Script v3.1 (owner ke liye naye buttons)

| Function | Kaam |
|---|---|
| **`createOwnSheet`** | isi account (`owner ka apna Google account`) me **nayi sheet** banao + 16 tabs + formatting (purani sheet ko chhedta nahi) |
| **`formatAll`** | columns ki width / wrap / number format dobara set karo |
| `whoAmI` / `doctor` | kaun sa account chal raha hai + poora health check |

Ab agar sheet kisi doosre account ki ho (ya "Sorry, unable to open the file" aaye) to
script **khud apni sheet bana leti hai** — koi Share ka jhanjhat nahi.

### 📐 Columns fix (manually kaam karne me aasan)

- header row **freeze** + bold + grey, **filter dropdown**
- **fixed width** har column ki (Message 320px, Address 230px, Total 90px …)
- **wrap** lambe columns me (Message, Review, Item details, Address)
- **₹ format** money par, **date format** Timestamp par
- **phone / pincode / AWB / order number = plain text** — aage ka 0 gayab nahi hota,
  `303325` number ban kar sort me gadbad nahi karta

### 💳 Payment page (UTR hata diya)

- **sirf ek input:** "Mobile ke last 4 digit" + button **"Payment ho gaya — confirm kariye"**
- UTR maangna **band**, lambe paragraphs hataye, screenshot link chhota
- mobile par UPI app se wapas aane par order **khud confirm** (`payments/return`)
- tests: **145 pass / 0 fail**, responsive 43/0, breakpoints 48/0

---

## 12. R27-3 — Pages par order/payment page, email poora hata, sheet demo data

### 🔴 Asli problem: GitHub Pages par `/orders/…` page banti hi nahi thi

GitHub Pages par Node server nahi chalta, isliye static build me
`/orders/NE-…` aur `/orders/NE-…/pay` **koi file hi nahi** hoti thi → 404
("This page has moved on"). Payment dikhna hi nahi tha.

**Fix (3 layer):**

1. **Naya shell** — `scripts/pages/preview-order.tsx` build ke waqt
   `/order-preview` page banta hai aur uska HTML **`dist/404.html`** ban jaata hai.
   GitHub Pages har missing URL par yahi file deta hai. Shell URL se order number
   nikaal kar page render karta hai (404 ki jagah asli page).
2. **Naya public API** — `GET /api/orders/:orderNumber/public` (CORS ke saath,
   sirf zaroori data: items, total, status, sheher, **masked phone**). Poora
   address / phone / email / payment reference kabhi nahi jaata.
3. **Dead-end nahi** — API se jawab na aaye (ya 12 second se zyada lag jaye) to
   page customer ko **live store ke usi page** par bhej deta hai
   (`https://noor-ethnic-wear.vercel.app/orders/NE-…/pay`) — wahan payment page
   bilkul kaam karta hai. Yaani Pages par bhi payment ho sakti hai.

Saath me payment status polling route (`/api/orders/:n/payment`) par bhi **CORS**
laga diya — warna Pages par "Status check nahi ho paaya" aata tha.

### 📧 Support email ab **kahin nahi** (site + API)

- footer, header, contact page, contact form (mailto → WhatsApp), structured data
  (SEO), policies (4 files), invoice, `siteConfig.email` → hata diya
- `/api/settings` ab `supportEmail` **return hi nahi karta**
- `/api/contact` ka jawab sirf `channels.whatsapp`
- Sheet ki `Settings` tab me `support_email` khaali
- site par sirf **WhatsApp **

### 🧪 Sheet me poora demo data (har tab, har column)

`seedDemoData` ab pehle `setup_()` chalata hai, isliye **Settings tab bhi** bhar
jaata hai. Bharte hain: **16 tabs** — Orders, OrderItems, Payments, Invoices,
Shipments, Checkout, Messages, Newsletter, Reviews, Coupons, Inventory, Audit,
Errors, Dashboard, Sync, Settings.

- 5 demo customers (asli sheher/pincode), 5 products (₹499–₹699), 2 orders me 2 items
- paid / pending / processing — teeno payment status, courier + AWB + tracking URL
- GST invoice rows (CGST/SGST vs IGST), coupons (active + expired), reviews, newsletter
- har demo row me `DEMO` nishaan → `clearDemoData` se **ek hi baar** me saaf

### 🚀 Deploy status (important)

- Code poori tarah commit + push ho gaya hai.
- **Vercel par deploy aaj nahi ho paaya** — free plan ka limit
  (`402 api-deployments-free-per-day`, 100/deploy per day) khatam hai.
  Limit khulte hi deploy karna hai. Tab tak GitHub Pages ka shell **live store
  par redirect** kar deta hai, isliye customer ko 404 nahi milega.
- GitHub Pages ka naya build (404.html shell) workflow se publish ho raha hai.

### ❓ "Netlify par shift kar dein?"

- Hosting badalne se **code wahi rehta hai** — koi kaam dobara nahi likhna.
- Netlify par **server + functions** chalte hain (Pages par nahi) → order/payment
  page wahan **seedha** chalega, redirect ki zarurat nahi.
- Par: Netlify bhi free plan par build-minutes deta hai, aur **naya account +
  domain + env keys** dobara set karne padenge. Isliye pehle Vercel ka daily limit
  ka intezaar karna sasta hai (0 mehnat); Netlify tab jab owner kahe.

### ✅ Owner ke 3 step (10 minute)

1. **Naya Apps Script code paste kariye** — sheet me demo data bharna hai:
   - Sheet → Extensions → Apps Script → `Code.gs` → `Ctrl+A` → delete
   - `docs/00-overview/apps-script-code.md` ka **poora code** copy → paste → **Save**
   - **Deploy → Manage deployments → ✏️ pencil → Version: `New version` → Deploy**
   - Check: `<webapp URL>?action=health&token=<TOKEN>` me `"version":"r27-2"` dikhna chahiye
2. Phir **demo data bharne ka** ek hi kaam (jo aapke liye main bhi kar sakta hoon):
   - `<webapp URL>?action=seed&token=<TOKEN>` — 16 tabs me real-jaisa data bhar jayega
   - ya Apps Script editor me function `seedDemoData` → **Run**
   - hataana ho to: `?action=clear-demo&token=<TOKEN>` / function `clearDemoData`
3. **Vercel deploy** — free plan ka daily limit (`402 … free-per-day`) khatam hone
   par main khud kar dunga; tab tak GitHub Pages par purane link bhi live store par
   redirect ho kar payment kholte hain.

---

## 13. R28 — Netlify par shift (code taiyaar + poori guide)

**Kya kiya:**

| Cheez | Detail |
|---|---|
| `apps/web/netlify.toml` | `npm run build --workspace @noor/web`, publish `apps/web/.next`, Next runtime plugin, Node 22 |
| `apps/admin/netlify.toml` | admin ka build + `noindex` headers |
| `db.ts` | Netlify/Lambda par bhi serverless mode (pool 1 connection — `EMAXCONNSESSION` se bachne ke liye) |
| `data-dir.ts` | serverless par `/tmp` (bundle folder read-only hota hai) |
| `cors.ts` | `*.netlify.app` (site + deploy previews) allowed |
| `next.config.ts` | CSP se Razorpay hata — koi third-party gateway nahi |
| `.env.example` | Razorpay/email nikal diya, `DATABASE_URL` + `SHEET_SELFTEST_KEY` jode |
| `pages.yml` | GitHub Pages preview ka live URL ab repo variable `STORE_API_URL` se — Netlify URL ek jagah badalna |

**Guide:** `docs/00-overview/netlify-shift-guide.md` — jisme hai:
2 sites ki exact settings, **12 + 7 env variables** (kaunsa Vercel se copy karna hai),
**saare public + admin API functions ka naksha** (kaun si env ke bina kya tootega), deploy ke baad
**15-point checklist**, domain ke **exact DNS records** (A `@` → `75.2.60.5`,
CNAME `www` → `noor-clothing.netlify.app`, CNAME `admin`), HTTPS, GSC + sitemap,
rollback aur 14-row troubleshooting table.

**Domain:** aaj `noorethnicwear.in` aapka nahi hai, isliye abhi site
`noor-clothing.netlify.app` par chalegi. Domain milne par sirf 3 jagah URL badalna
hai (site #1 ka `NEXT_PUBLIC_SITE_URL`, site #2 ke 3 URLs, Sheet ka `admin_url`).

