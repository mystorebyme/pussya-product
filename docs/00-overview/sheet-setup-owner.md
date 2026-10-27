# Google Sheet setup — owner ke liye (naya account)

> ## ⚡ Naya (R27): script v3 — 16 tabs, poora backend
> Is doc ke steps purane hain. **Ab [`apps-script-setup-steps.md`](./apps-script-setup-steps.md)
> follow kariye** — wahan naya 1000+ line ka code, 16 tabs (Orders, OrderItems,
> Payments, Invoices, Shipments, Checkout, Messages, Newsletter, Reviews, Coupons,
> Inventory, Audit, Errors, Dashboard, Sync, Settings), deploy steps aur
> troubleshooting table sab hai.
>
> Naya code: [`apps-script-code.md`](./apps-script-code.md) ·
> Check: `<webapp URL>?action=health&token=<TOKEN>` → `"version":"r27-2"`


**Kyun:** website pehle purane Google account ki sheet me data bhej rahi thi. Aapne sheet
account badal diya, aur naye sheet me website kuch likh nahi pa rahi thi. Isliye ek **naya
Apps Script** banaya gaya hai — neeche ke 6 step follow kariye, bas ek baar karna hai
(≈5 minute). Uske baad har order, payment, checkout aur message apne aap sheet me aayega.

## 0. Pehle: kaun si sheet?

**Ye sheet** (naya account `owner ka apna Google account`) — yahi website se judni chahiye:

- Naam: **Noor Ethnic Wear — Store (Orders · Payments · Settings)**
- Sheet id: `<SHEET_ID>`
- Link: https://docs.google.com/spreadsheets/d/<SHEET_ID>/edit

**Tabs (aaj ready kar diye):** Settings · Orders · Payments · Messages · Newsletter ·
**Checkout** (naya) · **Audit** (naya) — sab me header row + sahi column names.

> ⚠️ Aapne jo `pub?output=csv` links bheje the (`...2PACX-1vTLs42cuo-...`) wo **purane
> account ki copy** ke hain (uske gid 1135948941/1261780310 is naye file me nahi hain).
> Website **naye** file se judegi. Purani copy me kuch likhne se site par asar nahi hoga.

> ## 🔴 25 Oct 2026 — asli wajah mil gayi (ek chhota step baaki)

> Aapka Apps Script **deploy ho gaya hai aur chal raha hai** (maine test kiya: token sahi,
> reply aa raha hai, rows bhi likh raha hai). Par wo **doosri sheet** me likh raha hai —
> aapki asli sheet me nahi. Kaise pata chala:
>
> * Script ne bataya: `Orders` = 1 row, `Payments` = 1 row, `Checkout` = 1 row
>   (yaani live test order usme gaya)…
> * …par aapki sheet (`1b8DReh2…`) me **0 rows**. Matlab script kisi **copy** ko pakde hue hai.
>
> **Wajah:** purane code me `book_()` sabse pehle `getActiveSpreadsheet()` dekhta tha — yaani
> "jis sheet ke saath ye script bana hai". Aapka script `owner ka apna Google account` se bana hai aur
> wo kisi doosri (copy) sheet ke saath bandha hua hai, isliye data wahin jaa raha tha.
>
> **Fix (60 second, aapko karna hai):** naya code `SPREADSHEET_ID` ko sabse pehle dekhta hai —
> yaani wo **hamesha aapki asli sheet** me likhega.
>
> 1. Apps Script kholein → `Code.gs` ka poora code **delete** kariye →
>    `docs/00-overview/apps-script-code.md` se **naya code** copy-paste kariye → **Ctrl+S**.
>    *(Aapka token `CHANGE-ME-noor-token` hi rehne dijiye — maine wahi Vercel me daala hai.)*
> 2. **Deploy → Manage deployments → ✏️ (pencil) → Version: `New version` → Deploy.**
>    *(Sirf Save karne se purana code chalta rehta hai — ye step zaroori hai.)*
> 3. Agar script kahe **"Sheet khul nahi rahi … Editor access"** → sheet kholiye →
>    **Share** → `owner ka apna Google account` → **Editor** → Send. (Ye sirf ek baar.)
>
> Uske baad main dobara test karke confirm kar dunga — aap sirf "ho gaya" bhej dijiye.

## "Token konsa hai?" — 30 second ka jawab

Apps Script ke **Project settings** page par jo cheezein dikhti hain, unme se **koi bhi token nahi hai**:

| Jo aapne dekha | Wo kya hai | Token? |
| --- | --- | --- |
| Script ID `1-27IU7a…` | project ki id (code ka naam) | ❌ |
| Deployment ID `AKfycbwIJ1ge_…` | deployment ki id | ❌ |
| Web app URL `.../AKfycbw…/exec` | **yahi** website ko chahiye (`GOOGLE_SHEETS_WEBAPP_URL`) | ❌ (par secret hai) |
| Time zone / V8 / GCP "Default" / Script properties (khaali) | settings | ❌ |

**Token = code ke andar ki ek line** hai (`Code.gs` sabse upar):

```js
var TOKEN = 'CHANGE-ME-noor-token';   // ← ye token hai
```

Aapne deploy karte waqt ise badla nahi tha, isliye abhi token **`CHANGE-ME-noor-token`** hi hai
aur maine wahi Vercel me daala hai. Dono jagah **bilkul same** hona chahiye, warna script kuch
bhi accept nahi karti (chup-chaap skip).

**Ise badalna ho to (safety ke liye recommended):**

1. `Code.gs` me `var TOKEN = 'kuch-lamba-random';` kariye → **Ctrl+S**.
2. **Deploy → Manage deployments → ✏️ Edit → Version: New version → Deploy**.
3. Mujhe naya token bhejiye — main Vercel me `GOOGLE_SHEETS_TOKEN` update karke redeploy kar dunga
   (ya aap khud: Vercel → Settings → Environment Variables → edit → Redeploy).

⚠️ **Web app URL ko public me mat daaliye** (Instagram/WhatsApp/issue me nahi). Us URL me hi
asli "chaabi" hai — jo bhi usse jaanta hai wo sheet me row likh sakta hai. Isliye maine wo URL
repo/docs me **save nahi kiya**, sirf Vercel ke env me rakha hai.

---

## Step 1 — Sheet kholiye

1. Us Google account se login kariye jis account ki sheet aap use karna chahte hain
   (`owner ka apna Google account`).
2. Upar diya link kholein (naya banane ki zaroorat nahi — tabs already bane hue hain).

## Step 2 — Script editor kholein

Sheet ke menu me: **Extensions → Apps Script**. Ek naya tab khulega (`Code.gs`).

## Step 3 — Code paste kariye

1. `Code.gs` me jo default code hai, wo poora **delete** kar dijiye.
2. **`docs/00-overview/apps-script-code.md`** kholein — usme **poora code ek jagah** hai
   (kuch dhoondhna nahi padega). Neeche wala code block copy karke paste kar dijiye.
   *(Developer ke liye source: `scripts/google-apps-script/noor-sheets.gs`.)
3. Sabse upar is line ko dhoondhiye:

   ```js
   var TOKEN = 'CHANGE-ME-noor-token';
   ```

   Isme apna koi lamba random word daaliye, jaise:

   ```js
   var TOKEN = 'noor-9f3k2m-r23';
   ```

   👉 **Yahi token maine Vercel me daalna hai**, isliye ise yaad rakhein / mujhe bhej dein.
4. **Ctrl+S** (Mac: ⌘+S) → save.

## Step 4 — Setup chalaiye (tabs ban jaate hain)

1. Editor ke upar function dropdown me **`setup`** chuniye.
2. **Run** dabaiye.
3. Pehli baar Google **permission** maangega:
   **Review permissions → apna account chuniye → Advanced → "Go to Noor (unsafe)" → Allow**.
   (Ye "unsafe" warning har personal script par aati hai — ye aapka hi script hai.)
4. Sheet me wapas aaiye — 6 tab ban chuke honge:

   | Tab | Kya aata hai |
   | --- | --- |
   | **Settings** | phone, WhatsApp, email, UPI ID, announcement (site isi se padhti hai) |
   | **Orders** | har order + status change |
   | **Payments** | UTR submit, payment claim, verify, fail, reverse |
   | **Checkout** | kaun checkout tak pahuncha → review → order → fail |
   | **Messages** | contact form |
   | **Newsletter** | email subscribers |

## Step 5 — Web App deploy kariye

1. Editor me upar right: **Deploy → New deployment**.
2. Gear/cog icon → **Web app** chuniye.
3. Fields:

   | Field | Value |
   | --- | --- |
   | Description | `noor v2` |
   | **Execute as** | **Me (aapka email)** |
   | **Who has access** | **Anyone** |

   > "Anyone" ka matlab: website bina login request bhej sakti hai. Data safe hai kyunki
   > bina **token** ke script kuch nahi deta/likh'ta.

4. **Deploy** → **Web app URL** copy kariye. Wo aisa dikhega:
   `https://script.google.com/macros/s/AKfycb..................../exec`
5. **Authorize access** maange to Allow kariye.

## Step 6 — Test kariye (30 second)

Browser me ye link kholein (TOKEN aur URL apna daaliye):

```
<Web app URL>?action=health&token=<TOKEN>
```

Sahi jawab aisa aayega:

```json
{"ok":true,"version":2,"spreadsheet":"Noor Clothing — Orders",
 "sheets":[{"name":"Settings","tab":"Settings","rows":9},{"name":"Orders", ...}]}
```

Phir script editor me function **`testAppend`** chala kar **Run** kariye — Orders aur Checkout
tab me ek test row aa jayegi.

**Ek command me poora check** (Vercel env daalne ke baad):

```bash
node scripts/sheets-selfcheck.mjs "<Web app URL>" "<TOKEN>"
```

Ye health, Settings, aur write — teeno check karta hai, aur jo toota ho uska exact fix batata hai.

---

## Mujhe ye 2 cheezein bhej dijiye

1. **Web app URL** (jis ke end me `/exec` hai)
2. **TOKEN** (jo aapne Step 3 me daala)

Main inhe Vercel → `noor-clothing` → Settings → Environment Variables me daal kar redeploy
kar dunga:

| Variable | Value |
| --- | --- |
| `GOOGLE_SHEETS_WEBAPP_URL` | aapka `/exec` URL |
| `GOOGLE_SHEETS_TOKEN` | aapka token |

Uske baad: ek test order karke **Orders** tab me row dekh lein. Ho gaya ✅

---

## Optional — Settings ka turant refresh (bina Apps Script ke bhi)

Agar aap chahte hain ki **Settings** tab ki value (phone / UPI / announcement) site par
turant dikhe, to:

1. **Settings** tab kholein → **File → Share → Publish to web**.
2. **Settings** tab chuniye → format **Comma-separated values (.csv)** → **Publish**.
3. Jo link mile (`https://docs.google.com/spreadsheets/d/e/.../pub?output=csv`), wo mujhe bhej dein.

Main use `GOOGLE_SHEETS_SETTINGS_CSV_URL` me daal dunga — site har 60 second me wahan se
phone/UPI/announcement utha legi.

---

## Baad me code badalna ho to (yaad rakhiye)

Apps Script me code badalne par **naya version deploy** karna padta hai, warna purana code
chalta rehta hai:

**Deploy → Manage deployments → (pencil) Edit → Version: New version → Deploy**

## Kuch na aaye to —

| Problem | Wajah / fix |
| --- | --- |
| Sheet me kuch nahi aata | `Who has access` "Anyone" nahi hai, ya token galat hai → health link se test kariye |
| Health link par `unauthorized` | URL ka token aur Vercel ka `GOOGLE_SHEETS_TOKEN` alag hain |
| Tabs nahi bane | `setup` function nahi chalaya — Step 4 dobara |
| Payment/UTR ki row nahi aayi | Orders/Payments tab ke **header** delete/modify nahi karne (script header naam se column dhoondhta hai) |
| Purana data dikh raha hai | Deploy ke baad **New version** nahi banaya — upar wala step dekhiye |

**Sheet ke header badalne se row galat jagah ja sakti hai** — isliye headers jaise hain waise
rakhein (naye column add karna theek hai, hatana/palata nahi).

---

## 🔎 "Sheet me data aa raha hai ya nahi?" — 30 second me khud check kariye

Ye 3 cheezein **aap khud** dekh sakte hain, mujhse poochne ki zaroorat nahi:

| Check | Kaise | Sahi jawab |
| --- | --- | --- |
| 1. Sheet me rows | Sheet kholiye → `Orders` tab | 2nd row se neeche order rows |
| 2. Kaunsa code chal raha hai | browser me `.../exec?action=health&token=CHANGE-ME-noor-token` | `"version":"r25-1"` (ya usse naya) |
| 3. Script zinda hai | wahi URL kholne par JSON aaye (HTML page nahi) | `{"ok":true,...}` |

Agar check 2 me `version` **nahi** dikhta (ya `ReferenceError` aata hai) → **purana code chal
raha hai**, yaani *New version* deploy nahi hua. Sirf `Ctrl+S` kaafi nahi hota.

### Aaj (25 Oct) ka test result — exact

| Kya | Result | Matlab |
| --- | --- | --- |
| Vercel → Apps Script request | HTTP **200**, token sahi | rasta theek hai, password theek hai |
| Script ka jawab | `{"ok":false,"error":"ReferenceError: SPREADSHEET_ID is not defined"}` | **purana/aadha code** chal raha hai |
| Aapki sheet ke tabs | Orders · Payments · Messages · Checkout · Audit sab me **sirf header** (0 rows) | ek bhi row save nahi hui |
| Website ka database | messages/orders **save ho rahe hain** | customer ka data safe hai, sheet mirror nahi bana |

Isliye abhi ka kaam **sirf ek** hai: naya code + **New version** deploy. Uske baad pehla order
khud sheet me dikh jayega.

### Deploy ke baad kaise pata chalega (main test kar dunga)

`https://noor-ethnic-wear.vercel.app/api/sheet-selftest?key=lk-st-9f3k2m-7hq4rt-2026` kholiye:

- `book.codeVersion: "r25-1"` → naya code chal raha hai ✅
- `write.ok: true` → sheet me row likh gayi ✅
- `book.match: true` → **sahi sheet** pakdi hai ✅

> `sheet-selftest` tab me **ek test row** `Audit` tab me daalta hai (order data nahi chhoota).
