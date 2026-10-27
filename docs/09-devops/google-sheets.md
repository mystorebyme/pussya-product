# Google Sheets — owner ka control panel (bina database kharch)

Owner ko har chhote change ke liye developer ya database chahiye na ho, isliye do kaam
Google Sheet se hote hain:

| Sheet | Kya hota hai | Website kya karti hai |
| --- | --- | --- |
| **Settings** | owner phone, WhatsApp, email, UPI ID, payee name, announcement, GSTIN, free shipping badalta hai | har **10 second** me padhti hai (`/api/settings`, `no-store`); payment page **turant** (`?fresh=1`) — redeploy nahi |
| **Orders** | har order + status change ki nayi row | order place / status change par append |
| **Payments** | UTR submit + payment verified rows | payment reference submit aur verify par append |
| **Messages** | contact form ke messages | message save hone par append |
| **Newsletter** | email subscribers | subscribe hone par append |
| **Checkout** | checkout funnel — started / review / order placed / order failed (+ reason, phone) | customer checkout ke har stage par append |

Sheet **append-only log** hai — purani row kabhi overwrite nahi hoti, isliye owner ko
poora timeline milta hai (kab order aaya, kab payment aaya, kab ship hua).

Database (Postgres / JSON) **primary** hai: order, payment verification, invoice, tracking
sab wahin rehta hai. Sheet uski live copy + owner ke settings ka source hai. Sheet down ho
jaye to site chalti rehti hai (sirf owner edits ruk jaate hain) — koi order fail nahi hota.

## 0. Sheet abhi banni hai — 5 minute me aise banaiye

Noor Ethnic Wear ki Sheet **owner ke apne Google account** me banti hai (customer data
sirf owner ke paas rehta hai):

1. [sheets.new](https://sheets.new) → naam: `Noor Ethnic Wear — Store`.
2. Repo ke `docs/09-devops/sheet-tabs/` se **16 CSV** import kariye
   (File → Import → *Insert new sheet(s)*). Tab ke naam CSV wale hi rakhiye.
   Column ke naam script se bante hain — badalna ho to:
   `node scripts/sheets/export-tab-headers.mjs`.
3. **Extensions → Apps Script** → `scripts/google-apps-script/noor-sheets.gs` ka code paste →
   save → `setup` **Run** → Allow → **New deployment → Web app**
   (*Execute as: Me*, *Who has access: Anyone*) → `/exec` URL copy.
4. `/exec` URL + token env me daaliye:

   ```
   GOOGLE_SHEETS_WEBAPP_URL = https://script.google.com/macros/s/AKfy…/exec
   GOOGLE_SHEETS_TOKEN      = <lamba random token>
   ```

5. `Settings` tab me apni values bhariye. **Jo cell khaali hai wo site par dikhta hi
   nahi** — koi hardcoded fallback nahi:

   | key | kahan dikhta hai |
   | --- | --- |
   | `support_phone` | header/footer ka WhatsApp button, contact page |
   | `whatsapp` | sab WhatsApp links (`91` apne aap lagta hai) |
   | `upi_id` | checkout/order page ka QR + UPI ID (khaali = payment pause) |
   | `upi_name` | UPI app me payee ka naam |
   | `announcement` | top announcement bar |
   | `gstin` | invoice |
   | `free_shipping` | shipping line |
   | `store_url` / `admin_url` | WhatsApp messages + admin panel ka link |
   | `order_prefix` | order number ka prefix (default `NE`) |

6. Verify: `GET /api/settings` → `"meta":{"sheetSource":"apps-script"}` aur wahi number
   jo sheet me hai. Sheet me number badal kar **3 second** me site par dekh sakte hain.

## 1. Sheet + Apps Script setup (ek baar, ~5 minute)

1. [sheets.new](https://sheets.new) par nayi sheet banao, naam do `Noor Store`.
2. **Extensions → Apps Script** kholo.
3. Repo ki file `scripts/google-apps-script/noor-sheets.gs` ka poora code paste karo.
4. Sabse upar `var TOKEN = 'CHANGE-ME-noor-token';` me apna lamba random token daalo
   (jaise `noor-9f3k2m-2026`). Isi token ko website env me bhi daalna hai.
5. **Save → Run → `setup`** — permission maange to *Review permissions → Allow*.
   Isse `Settings`, `Orders`, `Payments`, `Messages`, `Newsletter`, `Checkout` tabs + headers ban jaate hain.
6. **Deploy → New deployment → Web app**
   - Description: `Noor site`
   - Execute as: **Me**
   - Who has access: **Anyone** ← zaroori (website anonymous request bhejti hai; token check script karti hai)
   - **Deploy** → `/exec` par khatam hone wala URL copy karo.
7. Website ke environment me daalo (Render → noor-storefront → Environment):

   ```
   GOOGLE_SHEETS_WEBAPP_URL = https://script.google.com/macros/s/AKfy…/exec
   GOOGLE_SHEETS_TOKEN      = noor-9f3k2m-2026
   ```

   Redeploy karo. `GET /api/settings` me `"source": "google-sheet"` dikhne lage to connect ho gaya.

> Code badalne par: **Deploy → Manage deployments → Edit → New version → Deploy**.
> URL wahi rehta hai.

## 2. Settings sheet me kya likhna hai

| key | example | website me kahan |
| --- | --- | --- |
| `support_phone` | `` | footer, contact page, header |
| `whatsapp` | `` | WhatsApp buttons (91 lagakar) |
| `support_email` | `owner ka apna Google account` | footer, contact page, mailto |
| `upi_id` | **owner bharta hai** — R38 se koi code/script default nahi; khaali hai to payment page pause dikhata hai | checkout + order page QR |
| `upi_name` | `Noor Ethnic Wear` | UPI app me payee name |
| `announcement` | `Diwali Sale — Flat 70% OFF` | top announcement bar |
| `gstin` | `27AAAAA0000A1Z5` | invoice |
| `free_shipping` | `true` / `false` | shipping text |

Khaali cell = website apni default value use karti hai (kuch tootta nahi).

## 3. Verification (curl)

```bash
# settings (browser me bhi khul jaata hai)
curl -s "$SHEET_URL?action=settings&token=$TOKEN" | head -c 400

# health — har sheet me kitni rows hain
curl -s "$SHEET_URL?action=health&token=$TOKEN"

# last rows (admin panel ka "Google Sheet" screen yahi use karta hai)
curl -s "$SHEET_URL?action=recent&sheet=Orders&limit=20&token=$TOKEN"

# test row (Apps Script editor me `testAppend` bhi chala sakte hain)
curl -s -X POST "$SHEET_URL" \
  -H 'Content-Type: text/plain;charset=utf-8' \
  --data '{"token":"'"$TOKEN"'","action":"append","rows":[{"sheet":"Orders","row":{"Order number":"NE-TEST01","Event":"test","Total":499}}]}'
```

## 4. Website side (code)

| File | Kaam |
| --- | --- |
| `apps/web/src/lib/google-sheets.ts` | settings read (4s timeout, 10s TTL + stale-while-revalidate, fail par **last good** value, Workers par edge cache) + rows append (6s timeout, best-effort) |
| `apps/web/src/lib/sheet-format.ts` | pure row/format helpers (unit tested) |
| `apps/web/src/lib/store-settings.ts` | DB/file settings + sheet merge (sheet jeetti hai) + `getStoreSettingsFast()` — payment page: cache ho to turant, cold ho to 3s tak asli read, aur jab tak koi **last good** value hai tab tak hardcoded default kabhi nahi |
| `apps/web/src/lib/orders.ts` | `order.placed`, `order.status.*`, `payment.paid`, `payment.reference_submitted`, `order.tracking_updated` par append |
| `apps/web/src/lib/messages.ts` | contact message + newsletter subscriber append |
| `apps/web/src/app/api/settings/route.ts` | public settings (UPI, phone, email, announcement) no-store · `?fresh=1` = sheet se abhi padho · `meta` = read diagnostics |
| `apps/web/src/components/store-settings-provider.tsx` | browser me har 15s + tab focus par refresh — sheet ka change bina page reload dikhta hai |
| `apps/web/src/components/upi-payment.tsx` | payment page ka QR/UPI ID live sheet se (page pehle se khula ho to bhi naya UPI aa jaata hai) |

## 4b. Real-time: sheet me badla, site par **kab** dikhta hai?

| Jagah | Kab tak | Kaise |
| --- | --- | --- |
| Payment page (UPI ID + QR) | **turant** (page khulte hi) | client `/api/settings?fresh=1` call karta hai — sheet se abhi padh kar |
| Announcement bar, WhatsApp number, footer, shipping line | ≤ 15 second | provider har 15s poll karta hai; tab par wapas aate hi turant |
| Server-rendered pages (order page, invoice, contact) | ≤ 10 second | server TTL 10s + stale-while-revalidate (page kabhi sheet ka intezaar nahi karta) |
| Naya Cloudflare Worker isolate / Vercel cold start | turant | last good value Cloudflare Cache API me rehti hai — defaults par nahi jaata |

Page kabhi **block** nahi hota: sheet slow ya down ho to purani (par sahi) value turant
jaati hai aur nayi background me aa jaati hai. Read fail hone par bhi site
**default UPI par nahi girti** — last good value chalti rehti hai.

Tuning (env): `SHEET_READ_TIMEOUT_MS` (default 4000), `SHEET_SETTINGS_TTL_MS` (default
10000), `SHEET_SETTINGS_STALE_MS` (default 600000). Workers par ye do pehle
`apps/web/cloudflare.config.ts` me declared hain.

### "Sheet me UPI badla, site par nahi aaya" — 3 minute me check

1. **Key naam sahi hai?** `Settings` tab me row `upi_id` (column A), value column B me.
   Script lower-case + underscore padhta hai: `upi_id`, `upi_name`, `support_phone`,
   `whatsapp`, `announcement`, `gstin`, `free_shipping`, `admin_url`.
2. **Value valid UPI hai?** `name@bank` shape (jaise `owner@ybl`). Galat shape ho to site
   use ignore karke purani (sahi) value rakhti hai.
3. **Site se poochho** — `curl -s https://<site>/api/settings`:
   - `data.upiId` = sheet wala UPI → sab theek (browser me hard refresh kariye).
   - `meta.sheetSource: "apps-script"` → sheet se aa raha hai ✅
   - `meta.sheetSource: "csv"` → ⚠️ published CSV fallback; Google ise ~5 minute cache
     karta hai → Apps Script ka `/exec` URL set kariye (tabhi real-time milega).
   - `meta.sheetSource: null` + `meta.sheetLastError` → request Apps Script tak nahi
     pahunchi. Wajah usually: deployment **"Anyone"** nahi, purana/archived deployment
     URL, ya token mismatch. `/api/sheet-selftest?key=…` poora detail deta hai.
4. **Admin panel → Google Sheet** screen par wahi status insaani bhasha me dikhta hai
   (`sheet-live-read` notice): source, last read ms, value kitni purani, last error.
5. Sab sahi hai par browser me purana dikh raha → tab par wapas aate hi refresh hota hai,
   ya 15 second rukhein. CDN/browser cache nahi hai (`cache-control: no-store`).

> **R35 se pehle kya toota tha:** read timeout 900ms tha jabki Apps Script 1–4 second
> leta hai → read hamesha timeout → site chup-chaap **default UPI** dikha deti thi.
> Payment page to 350ms baad hi default par chala jaata tha. Teeno wajah ab fix hain
> (`tests/sheets/settings-realtime.test.ts` inhe naapta hai).

## 4c. Vercel par sheet config (`noorethnicwear.in`) — kya set hai, dobara kaise karein

Storefront Vercel project **`noor-clothing`** par chalta hai (root directory `apps/web`,
build command `cd ../.. && npm run build --workspace @noor/web`, domains
`noorethnicwear.in` + `www.`). Admin panel alag project **`noor-admin`** (root
`apps/admin`) par hai. 27 Oct 2026 ko Vercel API se verify kiya — `noor-clothing` me ye set hai:

| Env variable | Status | Kaam |
| --- | --- | --- |
| `GOOGLE_SHEETS_WEBAPP_URL` | ✅ set (`script.google.com/macros/s/…/exec`) | Apps Script web app (settings + rows) |
| `GOOGLE_SHEETS_TOKEN` | ✅ set (encrypted, R38 me rotate) | script ke Script Properties `TOKEN` se match hona chahiye |
| `SHEET_SELFTEST_KEY` | ✅ set (encrypted) | `/api/sheet-selftest?key=…` debugging |
| `DATABASE_URL`, `ADMIN_API_TOKEN`, `OTP_TOKEN_SECRET`, `UPI_RETURN_SECRET` | ✅ set | order DB + payment confirm |
| `STORE_UPI_ID` | ❌ **R38 me production se delete** | UPI sirf sheet (`upi_id`) se aati hai — koi fallback payee nahi |
| `STORE_UPI_NAME` | ✅ `Noor Ethnic Wear` | sirf payee-name fallback (sheet na chale tab) |
| `GOOGLE_SHEETS_SETTINGS_CSV_URL` | ❌ nahi | optional fallback (~5 min Google cache) — real-time ke liye zaroori nahi |
| `SHEET_READ_TIMEOUT_MS` / `SHEET_SETTINGS_TTL_MS` | ❌ nahi (default 4000 / 10000) | tuning chahiye tabhi add karein |

### Sheet "vapis configure" karni ho (script badla / naya deployment banaya)

1. Apps Script editor → **Deploy → Manage deployments** → ✏️ Edit → Version: **New version** →
   Execute as **Me** → Who has access **Anyone** → **Deploy**.
   ⚠️ Script edit karke sirf *Save* karne se `/exec` URL **update nahi hota** — new version
   deploy karna zaroori hai. **Naya** deployment banaya to URL hi badal jaata hai.
2. Apps Script ka `TOKEN` aur Vercel ka `GOOGLE_SHEETS_TOKEN` same hona chahiye.
3. Vercel → project **`noor-clothing`** → Settings → Environment Variables →
   `GOOGLE_SHEETS_WEBAPP_URL` (aur zaroorat ho to `GOOGLE_SHEETS_TOKEN`) → **Save**.
4. **Redeploy** zaroori: Deployments → latest → ⋯ → **Redeploy** (env change existing
   deployment par apply nahi hota).
5. Verify:
   ```bash
   curl -s "https://noorethnicwear.in/api/settings?fresh=1"     # meta.sheetSource + data.upiId
   curl -s "https://noorethnicwear.in/api/sheet-selftest?key=<SHEET_SELFTEST_KEY>"
   ```

> **Vercel-specific fix (R36):** background sheet refresh pehle `void promise` tha — Vercel par
> response jaate hi function freeze ho sakta hai, isliye refresh adhoora reh jaata tha. Ab
> `runInBackground()` (Next `after()`) chalta hai: response ke baad bhi platform task poora
> karta hai. Cloudflare Workers par wahi fire-and-forget fallback chalta rehta hai.

> **Pehle production par purana code tha:** R35 ka sheet fix merge/deploy na hone ki wajah se
> live site 900ms-timeout wala reader chala rahi thi (sheet ka UPI ignore → default UPI).
> Sheet ka asar dikhne ke liye **deploy zaroori** hai — `docs/00-overview/owner-report-round36.md` §5.

### Checkout ka step 3 aur sheet

Payment ab checkout ke **andar step 3** par hai (`/checkout?step=payment&order=NE-…`, R36 se).
Wo UPI `/api/orders/<n>/payment-context` se leta hai, jo `getStoreSettingsFast()` se
**sheet-first** UPI deta hai — sheet me UPI badalte hi naya order naye VPA par banta hai
(deploy/restart ki zaroorat nahi).

## 4d. Sheet = order ka DB (R37, trends-sheets.gs pattern)

Owner ki dusri repo (`mystorebyme/manoj-Product` → `scripts/google-apps-script/trends-sheets.gs`)
ka core idea: **ek sheet tab me hi placed / confirmed / shipped / delivered + replied / marked
reply**. Hamari `noor-sheets.gs` (version **r37-1**) me wahi aa gaya:

1. **`onEdit(e)`** (simple trigger, install ki zaroorat nahi):
   - `Orders` tab ka `Order status` cell badla → nayi timeline row append
     (`Event = order.status_sheet`) ⇒ site ka timeline + status update.
   - `Messages` tab ka `Status` me `replied` / `done` / `closed` ⇒ `Replied = YES` +
     `Replied at` = abhi (marked-reply).
2. **Store merge** — `lib/sheet-tracking.ts` (`?action=timeline&order=…&phone=…`, 2s TTL + SWR +
   `?fresh=1`) + `lib/sheet-merge.ts` (pure): sheet ka status/courier/AWB/Tracking URL/note +
   updates DB ke order par merge hote hain **jab sheet DB se aage ho** (cancel/return hamesha).
   `paymentStatus` hamesha DB se — paisa sheet se override nahi hota.
3. **Instant knobs** (Vercel env, store project): `SHEET_READ_TIMEOUT_MS=4000`,
   `SHEET_SETTINGS_TTL_MS=2000`, `SHEET_TRACKING_TTL_MS=2000`; browser poll 3s.
4. **Apps Script update zaroori**: sheet → Extensions → Apps Script → naya code
   (`docs/00-overview/apps-script-code.md`) → Deploy → Manage deployments → Edit →
   **New version** → Deploy. (Purane version par status merge chalta hai; `onEdit` wala
   auto-timeline + marked-reply naye version se.)

## 4e. Token, adopt aur diagnostics (R38 — "order sheet me show nahi ho raha" ka permanent ilaaj)

27 Oct 2026 ko jo mila: Vercel ka `GOOGLE_SHEETS_TOKEN` aur script dono par **public
placeholder** (`CHANGE-ME-…`) tha, UPI ka hardcoded default site par dikhta tha, aur
sheet access na milne par script **chup-chaap nayi (anaath) sheet** bana kar usme
likh deti thi — isliye owner ki sheet khaali dikhti thi. R38 me teeno jadein khatam:

| Cheez | Ab kaise hai |
| --- | --- |
| Token kahan rehta hai | **Script Properties** (`TOKEN`) — code kitni baar bhi paste ho, token nahi tootta |
| Token set karna | browser me ek baar: `<webapp URL>?action=set_token&token=<Vercel GOOGLE_SHEETS_TOKEN>` (fresh install par; baad me `old=` bhi chahiye) |
| Placeholder token | `CHANGE-ME-…` **kabhi authorize nahi hota** (public repo me hai) |
| Public actions (bina token) | `settings` (public keys ka subset), `health`, `version`, `ping` — website ka UPI read token set hone se pehle bhi chalta hai |
| Token-gated | `recent/search/order/timeline/stats/dashboard/seed` + saare POST writes |
| Sheet kaun si | Script Properties `SHEET_ID` → `SPREADSHEET_ID` constant → bound sheet. **Anaath sheet kabhi nahi banti** — access na ho to loud `sheet_access_denied` |
| Apni sheet par switch | script apni sheet se bound ho to `<webapp URL>?action=adopt` (SHEET_ID property set) |
| Script ka health | `<webapp URL>?action=health` — version, tokenSet/tokenOk, sheetFound, sheetId, upiSet, problems[] (Hinglish fix) |
| Website ka health | **`https://noorethnicwear.in/api/sheet-health`** — settings source/age, script health, **last sheet write** ka nateeja, orders store, help[] |
| Order mirror | append par ek retry (600ms) + har attempt ka result `sheetWriteInfo()` me — sheet-health par dikhta hai |
| UPI default | **koi nahi** — sheet ka `upi_id` hi site par chalta hai; khaali ho to payment page "settings load nahi ho rahi" dikhata hai |

Owner ke liye 10-second check: `/api/sheet-health` kholiye — `"ok": true` aur
`help: []` ho to pipeline green hai; warna har line me fix likha hai.

## 4f. India timezone, Admin Note aur /exec control panel (R39)

Owner (27 Oct, live order ke baad): \"Placed · 27 Oct, 2:16 am — yha timezone india ka
chalna chiye\" (order 7:46 IST ka tha; Vercel UTC me render karta tha), aur timeline ke
neeche wala static AWB box \"**sheet se** likha ja sake — default Waiting for
confirmation, har order ke liye alag\".

| Cheez | Ab kaise hai |
| --- | --- |
| Timezone | Site + admin ke **har** date formatter me `timeZone: "Asia/Kolkata"` pin — server kahin bhi ho, customer/owner ko IST dikhta hai (ETA bhi IST math se) |
| Per-order message | Orders tab ka **`Admin Note`** column (script r39-1 purani sheet me column apne aap jod deta hai) → `?action=timeline` ke `adminNote` me → order page ke note-box (`order-note-box`) me, ~2s me live |
| Default text | Admin Note khaali → **\"Waiting for confirmation\"** (static AWB waada hata diya) |
| onEdit | Admin Note edit hote hi Orders me `order.admin_note` event row — timeline me bhi dikhta hai |
| `/exec` browser se | action ke bina kholne par ab **HTML control panel**: version, token/sheet/UPI status, problems, buttons (website/admin/site-health) + Admin Note ka hint. Website ka JSON contract (`?action=…`) bilkul nahi badla |
| Final sheet id | code (`EXPECTED_SHEET_ID`, `.gs` `SPREADSHEET_ID`), selfcheck aur Vercel env `SHEET_EXPECTED_ID` — teeno `1b8DReh2…` par; `/api/sheet-health` par `idMatch: true` dikhe |
| sheet-health | script **r39+** na ho to help me paste reminder; health-probe ka cold-start timeout akela failure nahi (settings + last write chal rahe hain to sirf `warnings[]`) |

## 5. Security

- Apps Script URL + token dono **server-side env** me hain, browser bundle me nahi.
- Sheet me customer ka poora data hai (phone, address) — sheet ko sirf owner ke Google
  account ke saath share karo, "Anyone with link" **nahi**.
- Token leak ho jaye to Apps Script me `TOKEN` badal ke naya version deploy karo aur env update karo.
- Payment yahan **verify** nahi hota — UTR sheet me aata hai, admin panel se verify hota hai.

## 6. Admin panel se sheet dikhna + update hona

| Screen | Kya karta hai |
| --- | --- |
| `/sheet` | Sheet ki **live settings** (UPI ID, phone, WhatsApp, email, announcement) + last order / payment / message rows dikhata hai. Connected na ho to setup steps batata hai. |
| `/settings` | Save karte hi values DB me **aur** seedha sheet me (`action: settings_save`) likh di jaati hain — owner ko wahi value dikhti hai. |
| `/orders` | Har status / tracking change sheet me nayi row append karta hai (`update` ka kaam append-only log se hota hai). |
| `/products/new` | Naya product + 10 photos; publish par catalogue rebuild. |

Storefront par admin ka data do tarah se aata hai: `STORE_API_URL` (Render) se admin
`/api/admin/sheet` call karta hai, jo Apps Script se `action=recent` + `action=settings` leta hai.

```bash
# admin ka view (token ke saath)
curl -s -H "Authorization: Bearer $ADMIN_API_TOKEN" "$STORE/api/admin/sheet" | head -c 500
```

Sheet me order rows **append hote hain** (overwrite nahi) — isliye ek order ka poora
timeline mile: `order.placed` → `order.status_changed` → `order.tracking_updated` →
`payment.reference_submitted` → `payment.paid`.

## 2. Kaunsa Google account? (owner ke liye clear)

Repo me sheet ka URL/token **nahi** hota — sheet aapke Google account me rehti hai, website
sirf deployed Apps Script se baat karti hai. Isliye:

- Sheet usi Google account me banao jo dukaan ka official account hai —
  recommended: **`owner ka apna Google account`**.
- Usi account se **Extensions → Apps Script → Deploy → Web app** kariye (`Execute as: Me`,
  `Who has access: Anyone`).
- Sheet ko kisi CA/developer ke personal account me na rakhein; agar karna pade to
  **Share → Editor** se owner ka email add karein, warna owner ke paas access nahi rahega.
- Sheet ka naam suggestion: `Noor Ethnic Wear — Store` (tab naam `Settings`, `Orders`,
  `Payments`, `Messages`, `Newsletter` — script khud bana deta hai).
- Sheet ka link **kabhi website par nahi dikhta**: `/api/settings` sirf public values
  (phone, WhatsApp, email, UPI ID, announcement) deta hai; sheet URL/token sirf server env me hai.
- Admin panel ka link sheet ke `Settings` tab ki `admin_url` row se aata hai aur sirf
  admin panel me dikhta hai (customer-facing pages par nahi).

Agar account badalna ho: nayi sheet + naya Apps Script deploy karo, naya `/exec` URL aur
token Render ke environment me daalo, redeploy — data purani sheet me safe rehta hai.

## 3. Sheet me payment ka har stage

| Event | Kahan jaata hai | Kab |
| --- | --- | --- |
| `order.placed` | `Orders` | order place hote hi |
| `payment.pending` | `Payments` | order place hote hi (paisa aana baaki) |
| `payment.reference_submitted` | `Payments` | customer UTR/12-digit reference daalta hai |
| `payment.paid` | `Payments` | admin payment verify karta hai |
| `payment.auto_confirmed` | `Payments` | UPI app se wapas aane par order auto-confirm (signed token) |
| `payment.reversed` | `Payments` | owner ne "payment not received" kaha — wapas pending |
| `payment.failed` | `Payments` | customer "payment failed" report karta hai (`/api/payments/failed`) |
| `order.status_changed` / `order.tracking_updated` | `Orders` | admin status/courier update karta hai |

Sab rows append-only hain — ek order ka poora payment timeline sheet me dikhta hai.
