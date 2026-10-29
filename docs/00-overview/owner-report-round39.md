# Owner Report — Round 39 (27 Oct 2026)

Owner ke shabd: **"Placed · 27 Oct, 2:16 am — yha timezone india ka chalna chiye."** ·
**"Jis box me 'AWB number yahan aur WhatsApp par turant dikh jaayega…' likha hai — yha
pr sheet se kuch bi likha ja sakta hai, default 'Waiting for confirmation', aur isko
every order ke liye sheet se change kiya ja sakta hai."** · **"Abhi ki final sheet
Vercel se live hai — dekh lena; aur vha pr saare secret or variable update kr dena,
check krna updated hai ki nhia."**

---

## 1. Timezone — ab sab kuch India (IST) ✅

**Wajah:** website aur admin Vercel ke server par banti hain jo **UTC** time par chalte
hain. Aapka order **7:46 am IST** ka tha — UTC me wahi **2:16 am** hai (India 5:30
aage). Isliye timeline par galat time dikha.

**Fix (R39):** site + admin ke **har** date formatter me `timeZone: "Asia/Kolkata"` pin
kar diya — order page, timeline steps, invoice (page + PDF), admin ke orders/invoices/
products, delivery ETA. Ab server kahin bhi ho, **customer aur aapko sirf India time**
dikhega. Delivery ka andaaza (ETA) bhi IST math se banta hai (raat ke orders me 1 din
ki galti bhi chali gayi).

## 2. Note-box ab sheet se — har order ke liye alag ✅

Purana box ek **static line** thi (AWB waada). Ab:

| Kya | Kaise |
| --- | --- |
| Sheet me kahan likhna hai | **Orders tab → us order ki row → `Admin Note` column** (r39-1 paste karte hi column apne aap ban jaayega — sheet kuch nahi karna) |
| Kitni jaldi dikhta hai | **~2 second** (site har 2s me sheet se taaza tracking padti hai) |
| Kuch na likha ho to | Default: **"Waiting for confirmation"** |
| AWB ke saath | AWB/courier block ke neeche bhi Admin Note dikhta hai |
| History | Admin Note badalte hi sheet me `order.admin_note` event row banti hai — timeline me bhi record rehta hai |

Customer ka order page: `noorethnicwear.in/orders/<order number>` — note-box
wahi hai jo aapke screenshot me timeline ke neeche tha.

## 3. Screenshot wala admin — sach saaf-saaf

Aapke screenshot wala panel ("Noor Ethnic Wear — Admin", Banners/Help sidebar, Order
Timeline card) **purane bade script ka HTML admin** tha jo pehle aapke Apps Script
project me tha (jisme `createBackup` chalta tha — aapki execution log me dikha tha).
R38 me aapne meri recipe se **naya (r38-1) script paste** kiya — uske saath wo purana
HTML admin hat gaya (naya script sirf website ko JSON deta tha; browser se kholne par
JSON dikhta tha).

**R39 me iska ilaaj:** `/exec` URL browser me kholne par ab ek **HTML control panel**
dikhta hai — script ki sehat (version, token, sheet, UPI), problems ka fix, aur buttons
(Website / Admin panel / site-health). Poora order-management admin aapke paas pehle se
hai: **`admin.noorethnicwear.in`** (login wala) — orders, invoices, payments,
messages, coupons sab wahan. Agar wo purana mega-admin (Banners/Help wala) hi chahiye
to bata dijiye — agle round me noor-admin me bana denge.

## 4. "Final sheet Vercel se live hai — dekh lena" ✅ dekha, live hai

Maine live system se seedha poochha (aapke message ke waqt):

| Check | Result |
| --- | --- |
| Site settings kahan se | **apps-script se** (sheet) — `upiLoaded: true` |
| Sheet par last write | **ok** — `Checkout` row, 8:46 am IST (aapka checkout turant sheet me gaya) |
| Script ka version | **r38-1** — aapne paste + set_token kar diya tha ✅ (`tokenSet: true`, `upiSet: true`) |
| Script kaun si sheet pakde hai | `<SHEET_ID>` — **aapki final sheet** ✅ |
| Orders ka DB | Postgres (Supabase, aapke Vercel account me) + sheet mirror — dono chal rahe |

Ek kami mili: site ka code abhi bhi **purani sheet id** (`1k8fsea04…`) expect karta tha
(isliye `idMatch: false` tha). R39 me code + Vercel env **dono** final sheet id par kar
diye — deploy ke baad `/api/sheet-health` par `idMatch: true` dikhega.

## 5. Vercel ke saare secret/variable — audit + update ✅

**`noor-clothing` (storefront):**

| Variable | Status |
| --- | --- |
| `GOOGLE_SHEETS_TOKEN` | ✅ R38 me rotate hua (48-char) — aaj ke production build me gaya confirmed |
| `STORE_UPI_ID` | ✅ delete (R38) — UPI sirf sheet se; build env me absent = sahi |
| `SHEET_EXPECTED_ID` | ✅ **R39 me naya add** — `1b8DReh2…` (final sheet) |
| `GOOGLE_SHEETS_WEBAPP_URL` | ✅ same `/exec` URL zinda hai (r38-1 ne jawab diya) — change ki zaroorat nahi |
| `DATABASE_URL`, `ADMIN_API_TOKEN`, `OTP_TOKEN_SECRET`, `UPI_RETURN_SECRET`, `SHEET_SELFTEST_KEY`, TTL knobs, `NEXT_PUBLIC_SITE_URL`, `STORE_UPI_NAME`, CORS | ✅ sab maujood; inme se koi badalna tha hi nahi |

**`noor-admin`:** sab variables maujood (`ADMIN_EMAIL/PASSWORD/SESSION_SECRET/API_TOKEN`,
store URLs = `noorethnicwear.in`) ✅ — R37 ke rule ke hisaab se is project ko
chheda nahi, sirf verify kiya.

## 6. Aapka ek hi kadam — script r39-1 paste karna

Admin Note + control panel + final-sheet id ke liye script ka **r39-1** chahiye:

1. script.google.com → apna "Noor Clothing Sheets" project → poora code select-delete
   → repo se `docs/00-overview/apps-script-code.md` ka **r39-1** code paste → Save.
2. **Deploy → Manage deployments → ✏️ → Version: New version → Deploy.**
3. **Token dobara set NAHI karna** — wo Script Properties me safe hai (R38 ka
   paste-proof design). `set_token` wala step ab kabhi nahi.

Verify: `/exec` browser me kholiye → control panel dikhega; phir
`noorethnicwear.in/api/sheet-health` → `"ok": true` + `idMatch: true`.
Uske baad Orders tab me kisi order ki `Admin Note` cell me kuch likhiye — 2 second me
customer order page ke box me dikhega.

## 7. Quality (is round ke gates)

typecheck 0 errors · unit **279/279** (9 naye R39 tests) · test:all **338/338** ·
lint web 0 errors/34 warnings (3 dead constants bhi saaf) · audit sab A · next +
Workers build ✅ · Next-production parity: smoke **111/0** (naya note-box check),
payments 61/0, responsive 44/0, breakpoints 48/0, links 40/0 · workerd smoke **111/0**.

Deploy: PR → merge → `main` → Vercel production (details PROGRESS.md me).
