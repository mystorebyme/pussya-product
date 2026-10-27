# Apps Script v3 — setup steps (owner ke liye, 4 minute)

Ye script website aur aapki Google Sheet ke beech ka pul hai. Isse **messages,
orders, payment, invoice, tracking, reviews, coupon, stock** — sab sheet me aate hain
aur Settings tab se site ki values (phone, UPI, announcement) control hoti hain.

Code yahan hai: **[`apps-script-code.md`](./apps-script-code.md)** (poora copy karne layak)



## Naya kya hai — `r31-1` (tracking)

- `?action=timeline&order=NE-XXXX&phone=98XXXXXXXX` — sheet se hi poora tracking:
  5 step, har update ki history, courier + AWB + **courier tracking link**.
  Phone match na ho to jawab nahi milta (kisi doosre ka data safe).
- `?action=seed` — demo/test data (Settings ko chhod kar har tab me).
- `?action=clear-demo` — wahi demo data hata deta hai.
- Courier link khud banta hai (Delhivery, Blue Dart, DTDC, India Post, Ekart, XpressBees,
  Shadowfax, Ecom Express, Shiprocket, Professional, Amazon, FedEx, DHL).

> Sheet script update karne ke baad **New version** deploy karna zaroori hai, warna
> `?action=health` me purana version hi dikhega.

---

## ⚠️ SABSE PEHLE — sheet ka access (yahi asli problem hai)

Aapke sheet (`1b8DReh2…`) **owner ka apna Google account** ka hai, par Apps Script
**owner ka apna Google account** se chal rahi hai. Isi wajah se har function fail ho raha hai:

```
You do not have permission to access the requested document.
```

**Fix — 2 minute (koi bhi ek):**

**A) Sheet share kar do (sabse aasan, URL wahi rahega):**
1. Jis account me sheet hai (`owner ka apna Google account`) us se sheet kholein.
2. **Share** (upar right) → `owner ka apna Google account` daalein → **Editor** → **Send**.
3. Apps Script me wapas → function **`setup`** → **▶ Run**. Ab chalega ✅

**B) Script usi account se banao jiske paas sheet hai:**
1. `owner ka apna Google account` se sheet kholein → **Extensions → Apps Script**.
2. Poora code paste karein → `setup` → Run (permission → Allow).
3. Deploy → New deployment → Web app (Execute as **Me**, access **Anyone**) → naya
   `/exec` URL copy → mujhe bhej dein (main Vercel me daal dunga).

> Kaun sa account script chala raha hai — pata karna ho to function **`whoAmI`** → Run.
> Poora check chahiye to function **`doctor`** → Run (log me report + problems).

### Aaj ka verified diagnosis (25 Oct 2026, live test)

| Layer | Test | Result |
|---|---|---|
| Deployment public hai? | galat token ke saath `/exec` call | ✅ JSON aaya (`unauthorized`) — yaani anonymous call script tak pahunch rahi hai |
| Version naya hai? | jawab me `version` | ✅ `r31-1` |
| Token Vercel se match? | `CHANGE-ME-noor-token` ke saath call | ✅ token pass hua (aage badha) |
| Sheet khul rahi hai? | usi call ka agla step | ❌ **"You do not have permission to access the requested document"** |

Matlab: code ✅, deploy ✅, token ✅ — sirf **sheet ka access** baaki hai. Do cheezein
karni hain (dono ek hi baar me):

1. **Sheet share:** sheet ke owner account se → Share → `owner ka apna Google account` → **Editor** → Send.
2. **Script authorize:** Apps Script (owner ke Google account se) → function `setup` → Run →
   permission prompt me **Allow**. (Pehli baar authorize na hone par bhi anonymous
   call par wahi "permission" error aata hai.)

**Checkpoint (10 second):** incognito window (logged out) me ye kholein —
```
<webapp URL>?action=health&token=CHANGE-ME-noor-token
```
- ❌ "You do not have permission…" = upar ke 2 step abhi baaki hain
- ✅ `{"ok":true,"version":"r31-1","sheets":[...]}` = ho gaya, website bhi chal jayegi


---

## 🆕 Naya (R27-2): sheet ka jhanjhat khatam — script apni sheet khud bana leti hai

Agar configured sheet kisi doosre account ki ho (ya "Sorry, unable to open the file"
aaye), to ab script **khud apni nayi sheet** bana leti hai — usi Google account me
jo script chala raha hai (`owner ka apna Google account`). Koi Share/Editor ka chakkar nahi.

**Chalane ka tareeka (30 second):**

1. Apps Script → function dropdown → **`createOwnSheet`** → **▶ Run**
2. **Execution log** me URL aayega:
   `✅ Nayi sheet: https://docs.google.com/spreadsheets/d/…/edit`
   (toast me bhi dikhega)
3. Wo link kholein — 16 tabs, headers, **fixed column widths** aur formatting ready milenge.
4. Purani sheet ka data waisa hi safe rehta hai (kuch delete nahi hota).

> Iske baad sab kuch nayi sheet me aayega. Verify:
> `<webapp URL>?action=health&token=<TOKEN>` → `spreadsheetUrl` naya link dikhayega.

## 🆕 Columns fix (manually kaam karne me aasan)

`setup` / `createOwnSheet` chalane par har tab me:

- **header row freeze** + bold + grey (scroll karte waqt naam dikhte rehte hain)
- **fixed column widths** (jaise Order number 120px, Total 90px, Message 320px…)
- **lambe columns me wrap** (Message, Review, Item details, Address…) — text kata nahi
- **₹ format** money columns par, **date format** Timestamp par
- **filter dropdown** header par — owner khud sort/filter kar sakta hai

Formatting kabhi bigad jaye to function **`formatAll`** → Run (sab dobara set ho jayega).

---

## Step 0 — pehle purana code hatao (zaroori)

1. Sheet kholein → **Extensions → Apps Script**.
2. `Code.gs` me jo bhi likha hai, **Ctrl+A → Delete** (poora saaf).

> Purana code rehne se `ReferenceError: SPREADSHEET_ID is not defined` aata hai —
> yahi wajah thi ki sheet me data nahi ja raha tha.

## Step 1 — naya code paste karo

3. [`apps-script-code.md`](./apps-script-code.md) kholein → poora code **copy** karein →
   `Code.gs` me **paste**.
4. Code ke sabse upar ye do line dhoondho:

```js
var TOKEN = 'CHANGE-ME-noor-token';
var CODE_VERSION = 'r31-1';
```

`TOKEN` ki jagah apna lamba random word daalo (jaise `noor-9f3k2m-2026`).
**Yahi token Vercel me bhi daalna hai (Step 6)** — dono jagah bilkul same.

5. **`SPREADSHEET_ID` line ko chhedna nahi:**
```js
var SPREADSHEET_ID = '<SHEET_ID>';
```
(Agar galti se delete ho jaye to bhi script crash nahi hogi — andar fallback id hai.)

## Step 2 — save

6. **Ctrl + S** (ya 💾 icon). Tab band karne par bhi save rehta hai.

## Step 3 — setup chalao (tabs banane ke liye)

7. Upar toolbar me **function dropdown** (jahan "doGet" likha hota hai) → **`setup`** chuniye
   (sabse upar wala function `setup` hai) → **▶ Run**.
8. Pehli baar Google permission maangega:
   - **Review permissions** → apna account chuniye
   - "Google hasn't verified this app" → **Advanced** → **Go to … (unsafe)** → **Allow**
   > Ye warning **har** personal Apps Script par aati hai (script aapka hi hai).
   > Script sirf aapki sheet padhta/likhta hai — bahar kuch nahi bhejta.
9. Sheet par wapas aayein — **16 tabs** ban chuke honge:

| Tab | Kya aata hai |
|---|---|
| **Settings** | phone, WhatsApp, email, UPI ID, announcement, GSTIN — site 10 second me padh leti hai (payment page turant) |
| **Dashboard** | aaj ke orders, revenue, pending payment, naye messages (script khud bharta hai) |
| **Orders** | har order + har status change (poori timeline) |
| **OrderItems** | har item alag row (size, colour, qty, price) |
| **Payments** | UTR submit / claimed / verified / failed |
| **Invoices** | GST invoice (taxable, CGST/SGST/IGST, total) |
| **Shipments** | courier, AWB, tracking URL, status |
| **Checkout** | funnel: checkout khula → review → order placed → fail |
| **Messages** | contact form ke messages (+ replied status) |
| **Newsletter** | email subscribers (duplicate apne aap skip) |
| **Reviews** | reviews (rating, verified, approve/pending) |
| **Coupons** | coupon codes, uses, limit, active |
| **Inventory** | stock ka har change (kisne, kitna, kyun) |
| **Audit** | admin panel ki activity |
| **Errors** | website/script ki error (debug ke liye) |
| **Sync** | har sync call ka hisaab (kab, kya, kitni rows) |

## Step 4 — deploy (asli kaam yahan hota hai)

10. **Deploy → New deployment**
11. Gear ⚙️ icon → **Web app** chuniye
12. Settings:

| Field | Value |
|---|---|
| Description | `noor v3` |
| **Execute as** | **Me (aapka email)** |
| **Who has access** | **Anyone** ⚠️ |

> ⚠️ "Anyone with a Google account" **nahi** chunna — us se website ko Google ka
> login page milta hai aur data kabhi nahi jaata (aapke saath yahi hua tha).

13. **Deploy** → **Web app URL** copy kariye. Wo `…/exec` par khatam hota hai.

## Step 5 — test (30 second)

14. Browser me kholein (apna token daal kar):
```
<Web app URL>?action=health&token=<TOKEN>
```
Jawab aisa aana chahiye:
```json
{"ok":true,"version":"r31-1","spreadsheet":"Noor Ethnic Wear — Store","sheets":[…]}
```
- `ok:true` = script chal rahi hai ✅
- `version: r31-1` = naya code chal raha hai ✅ (purana version dikhe to Step 4 dobara
  karein — sirf Ctrl+S se code **nahi** chalta)
- `unauthorized` = token galat (dono jagah same karein)

## Step 6 — Vercel me URL + token daalo

15. Vercel → project **noor-clothing** → **Settings → Environment Variables**
16. Do variable (Production + Preview dono):

| Name | Value |
|---|---|
| `GOOGLE_SHEETS_WEBAPP_URL` | aapka `…/exec` URL |
| `GOOGLE_SHEETS_TOKEN` | wahi TOKEN jo script me hai |

17. **Deployments → latest → ⋯ → Redeploy** (environment variable change ke baad
    redeploy zaroori hai — warna purana URL hi chalta rahega)

## Step 7 — asli test (website se)

18. Website → **Contact** page → ek test message bhejein.
19. Sheet → **Messages** tab → row wahan honi chahiye (Timestamp, Name, Email, Message…).
20. Website par ek test order karein → **Orders** + **OrderItems** + **Payments** me rows.
21. Ye link kholiye (30 second me poora sach):
```
https://noor-ethnic-wear.vercel.app/api/sheet-selftest?key=lk-st-9f3k2m-7hq4rt-2026&v=check2
```
`sheetMirror: true` = sab chalu ✅

## Step 8 (optional) — daily dashboard + backup

22. Apps Script me function dropdown → **`installTriggers`** → **▶ Run**.
    - roz raat **9 baje** Dashboard refresh
    - har **Sunday 2 baje** Drive me sheet ka backup

---

## Website kya-kya bhejti hai (automatic)

| Website ka event | Sheet tab |
|---|---|
| contact form submit | **Messages** |
| footer email signup | **Newsletter** |
| checkout start / review / fail | **Checkout** |
| order place | **Orders** + **OrderItems** + **Payments** |
| UTR submit / payment verify / reverse | **Payments** (Orders timeline bhi) |
| courier / AWB update | **Shipments** (+ Orders) |
| GST invoice download | **Invoices** |
| admin panel ka edit | **Audit** |
| website error | **Errors** |
| har sync | **Sync** |

Settings tab me jo value badlegi, site par **10 second** me live ho jayegi
(phone, WhatsApp, email, UPI ID, announcement, GSTIN, free shipping, admin URL) —
payment page ka UPI ID/QR **turant** badalta hai. Redeploy karne ki zaroorat nahi.
Check: browser me `https://<aapki-site>/api/settings` kholein → `data.upiId` wahi hona
chahiye jo sheet me hai, aur `meta.sheetSource` = `"apps-script"`.
(Detail: `docs/09-devops/google-sheets.md` §4b.)

---

## Problem aaye to (troubleshooting)

| Dikh raha hai | Matlab | Fix |
|---|---|---|
| **`You do not have permission to access the requested document`** | script ka account sheet ka owner nahi hai | upar wala **access section** (Share → Editor ya script sheet ke andar se banaiye) |
| `ReferenceError: SPREADSHEET_ID is not defined` | purana code chal raha hai | Step 1 se dobara paste + Step 4 (**New version**) |
| Google ka **login page** (HTML) | access "Anyone" nahi | Deploy → Manage deployments → ✏️ → Who has access: **Anyone** → Deploy |
| `unauthorized — token match nahi hua` | token alag hai | script ka TOKEN = Vercel ka `GOOGLE_SHEETS_TOKEN` |
| `version` purana dikh raha hai | naya version deploy nahi hua | Manage deployments → ✏️ → Version: **New version** → Deploy |
| Sheet me row nahi aa rahi | Vercel me purana URL | Step 6 (URL update + **Redeploy**) |
| Data kisi **doosri (copy) sheet** me ja raha | script galat sheet se juda hai | `SPREADSHEET_ID` line check karein (Step 1) |
| "Sheet khul nahi rahi" | account ko sheet par access nahi | Sheet → Share → Editor me wahi Google account add karein |
| kuch samajh nahi aa raha | script khud check kare | Apps Script → function **`testSelf`** → Run → **Execution log** dekhein |
| header kharab ho gaya | — | function **`repairHeaders`** → Run |

---

## Security (zaroori)

- `/exec` URL aur **TOKEN kisi ko na dein** (WhatsApp par bhi nahi) — inse aapki
  sheet me row daali ja sakti hai.
- Ye script kisi bahar service ko data nahi bhejti, koi paid API nahi use karti.
- Website ka admin token / UPI secret sheet me kabhi nahi jaata.
- Sheet ka access sirf aapke Google account ke paas rakhein (Share → sirf aap).
