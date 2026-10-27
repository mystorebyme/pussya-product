# Round 31 — Tracking "perfect" + `manoj-Product` repo ki sheet script (analysis)

Date: 26 Oct 2026 · Branch: `arena/f713eef1-tannu-product`

---

## 1. Aapne jo repo bheja — uski sheet script kaise chalti hai

Repo: `mystorebyme/manoj-Product`, branch `arena/e13f4af5-manoj-product`.
Andar `scripts/google-apps-script/`:

| File | Size | Kya hai |
|---|---|---|
| `trends-sheets.gs` | **5,892 lines / ~237 KB** | Trends Younique store ka poora sheet backend (sabse bada version) |
| `noor-sheets.gs` | ~9 KB | Noor ka purana/chhota version (hamara ab 2,000+ lines hai) |
| `appsscript.json` | — | V8 runtime, `Asia/Kolkata`, Web app: *Execute as = Me*, *Access = Anyone* |

`trends-sheets.gs` ka `VERSION = '2026-10-25.r20'`. Uske andar:

**Tabs (HEADERS):** Orders, Order Items, Products, Enquiries, Payments, Settings, Messages,
Newsletter, Reviews, AddressCheck, **Order Updates**, Coupons, Banners, FAQs, Categories,
Returns, Notifications, AuditLog, Stock, EmailKeys, MailQueue.

**doGet (padhne wale actions):** `public/settings`, `reviews`, `reviews_all`,
`products_public`, `images_public`, **`order_status` / `timeline`**, `coupons`, `stock`,
`banners`, `faqs`, `categories`, `search`, `invoice` (HTML), `reports`, `recent`,
`health`, `schema`, `selftest`, `mail_queue`, `import_reviews`.

**doPost (likhne wale actions):** `settings_save`, `upsert`, **`order_status`** (status +
courier + AWB + tracking URL), `order_note`, `coupon_save`, `stock_set`, `return_request`,
`review_moderate`, `place_order`, `address_check`, `notify_resend`, `append`.

**Tracking ka core — `orderTimeline_(order, phone)`:**
1. Order **number + registered mobile** dono match hone par hi jawab.
2. 5 step (`placed → confirmed → packed → shipped → delivered`) + `step` index.
3. Status text fuzzy match karta hai: `out for delivery` → step 3, `rto/cancel` → `-1`,
   `pack/ready/label` → 2, `confirm/process` → 1.
4. `Order Updates` tab se per-step message (`Visible` column se chhupaya ja sakta hai).
5. Courier + AWB + admin ka `Tracking URL` + items + note.

**Baaki kaam ki cheezein:** message templates (`{name} {order} {courier} {awb} {track}`),
`MailQueue` (30 retry tak), `Notifications` log, `installTriggers()` (daily digest + log
cleanup), `onEditAutoStatus()` (sheet me status likhne par khud handle), `onOpen()` menu
(owner ke liye reports/low-stock/coupons shortcut), `setup()` + `writeReadme_()` (sheet ke
andar hi guide likh deta hai).

### Humne kya liya, kya nahi liya

| Cheez | Unke yahan | Hamare yahan (R31 ke baad) |
|---|---|---|
| 5-step timeline | ✅ | ✅ (pehle se tha) — ab **har step ki date** bhi |
| Per-step admin message | ✅ `Order Updates` tab | ✅ `statusNote` + **poora update history** (audit se) |
| Phone gate | ✅ (order + phone) | ⚠️ Order page link se khulta hai, par **phone/email mask** hain (customer ko friction nahi) |
| Courier link | sirf admin ka diya URL | ✅ **khud banta hai** AWB se (13 courier) |
| Cancelled/returned | step `-1` | ✅ **red banner** + saaf message (refund/return line) |
| Sheet se timeline | ✅ `?action=timeline` | ✅ **naya** (`r31-1`) — same action, order + phone gate |
| Sheet me status likhne par site update | ✅ (site sheet se padhti hai) | ❌ jaan-boojh kar nahi — hamara source of truth **admin panel + DB** hai (sheet mirror hai) |

> Aakhri point important hai: unke project me site **sheet se** data padhti hai, isliye sheet
> me type karte hi site badal jaati hai — par agar sheet slow/band ho to site bhi ruk jaati
> hai. Hamare project me admin panel + Postgres source of truth hai aur sheet me **har event
> ka mirror** jaata hai. Isse site fast rehti hai aur sheet ka data kabhi "kho" nahi sakta.
> Owner ko sheet me likhna hai to admin panel se kariye — wahi sheet me bhi chala jaayega.

---

## 2. Tracking me aaj kya perfect hua

1. **Courier tracking link khud banta hai** — admin sirf courier + AWB daale, URL khaali
   chhod de. Support: Delhivery, Blue Dart, DTDC, India Post/Speed Post, Ekart, XpressBees,
   Shadowfax, Ecom Express, Shiprocket, The Professional Couriers, Amazon, FedEx, DHL.
2. **AWB saaf hota hai** — `" 1abc 2345 "` → `1ABC2345` (spaces/dash hata kar uppercase),
   taaki link aur sheet dono saaf rahein.
3. **Har step ki asli date** timeline me (pehle sirf tick aata tha).
4. **Poora update history** (newest pehle): status change, admin ka note, courier details,
   payment claim/verified — customer ko "kab kya hua" ek jagah dikhta hai.
5. **Cancelled / returned** par red banner + seedha message (refund 5–7 din / return
   replacement), aadha-adhoora progress bar nahi.
6. **PII mask** — tracking page par phone `••••••8140` aur email `it•••@gmail.com` jaise
   dikhte hain (page link-only hota hai, isliye leak ka risk kam).
7. **Admin panel**: courier field me dropdown list (13 courier), URL field ka hint
   "khaali chhodiye — link khud ban jaayega".
8. Sheet me bhi wahi clickable link jaata hai (`Shipments` tab → `Tracking URL`), isliye
   owner ke WhatsApp/email me bhi link kaam karta hai.

---

## 3. Sheet script (`noor-sheets.gs`) — ab `r31-1`

Naya:
- `?action=timeline&order=NE-XXXX&phone=98XXXXXXXX` (alias: `order_status`, `tracking`) —
  sheet se hi 5 step + history + courier + AWB + link. **Phone match na ho to jawab nahi.**
- `?action=seed` / `?action=clear-demo` — demo data (Settings safe rehti hai).
- `?action=health` me `version: r31-1` dikhega.

### Owner ko sirf 3 step karne hain

1. Sheet → **Extensions → Apps Script** → `Code.gs` ka poora purana code delete →
   [`apps-script-code.md`](./apps-script-code.md) ka **poora** code paste.
2. **Deploy → Manage deployments → ✏️ (pencil) → Version: New version → Deploy**
   (sirf Ctrl+S se purana version chalta rehta hai).
3. Browser me test: `<webapp URL>?action=health&token=<TOKEN>` → `version: r31-1` aana chahiye.

> Note: live `/exec` par abhi `r27-1` chal raha hai — isliye `seed`/`timeline` actions
> wahan kaam nahi karenge jab tak upar ke 3 step na ho jaayein.

---

## 4. Verification (sab actually chalaya)

| Check | Result |
|---|---|
| `npm test` (unit) | **189 pass / 0 fail** (14 naye tracking + 1 naya sheet timeline test) |
| `tests/e2e/payments.mjs` (local prod build) | **53 pass / 0 fail** — paid → packed → courier/AWB → shipped, page par AWB + courier link + history + cancel banner |
| `tests/e2e/smoke.mjs` | **84 / 0** |
| `tests/e2e/round16.mjs` | **39 / 0** |
| `tests/e2e/links.mjs` | 45 pages, 0 fail |
| `tests/e2e/responsive.mjs` + `breakpoints.mjs` | 43 / 0, 48 / 0 |
| Typecheck (web · admin · api) + lint | pass (0 errors) |

Live sample (local build, real HTTP): order `NE-TRACK…` shipped with Blue Dart + AWB →
page par "Shipped · 26 Oct, 6:25 am", "Courier details · Blue Dart · AWB B12345678",
"Track with courier" → `bluedart.com/...trackNo=B12345678`.

---

## 5. Bacha hua (owner ke paas)

- [ ] Sheet script `r31-1` paste + **New version** deploy (upar 3 step).
- [ ] Domain `noorethnicwear.in` DNS point karna (jab dein).
- [ ] Admin login password apne paas rakhna (`ADMIN_PASSWORD` Vercel env me hai).
