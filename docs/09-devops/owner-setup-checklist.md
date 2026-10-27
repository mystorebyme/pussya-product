# Owner setup — 3 kaam, ~10 minute

Ye checklist aapke (owner ke) liye hai. Code ka kuch nahi karna — sirf Google Sheet,
Apps Script aur hosting ke clicks.

Sheet ready hai (16 tabs + headers + Settings keys):

> **Noor Ethnic Wear — Store DB (Orders · Products · Settings)**
> https://docs.google.com/spreadsheets/d/1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo/edit

Abhi usme **demo values** hain (`upi_id = noor.ethnicwear@upi`, phone/WhatsApp
`9876543210`) — sirf testing ke liye. Asli values daalna pehla kaam hai.

---

## Kaam 1 — Settings tab me apni asli values (2 min)

Sheet → **Settings** tab. Sirf `value` column (B) badalna hai:

| key | kya daalna hai | matlab |
| --- | --- | --- |
| `upi_id` | aapki asli UPI ID (jaise `naam@okhdfcbank`) | customer ka paisa yahan aayega |
| `upi_name` | UPI app me dikhne wala naam | payee name |
| `support_phone` | 10 digit mobile | header ka WhatsApp button |
| `whatsapp` | 10 digit WhatsApp | sab WhatsApp links |
| `announcement` | top bar ki line | khaali = generic lines |

⚠️ `upi_id` **galat** chhoda to customer ka paisa galat jagah ja sakta hai — isko sabse
pehle theek kariye. Baaki cell khaali chhod sakte hain, wo site par dikhte hi nahi.

## Kaam 2 — Apps Script deploy (5 min, ek hi baar)

1. Usi Sheet me → **Extensions → Apps Script**.
2. Repo ki file `scripts/google-apps-script/noor-sheets.gs` kholiye → **poora** code copy →
   Apps Script editor me purana code hata kar paste → **Save** (💾).
3. Upar function dropdown me **`setup`** chuniye → **Run** → Google permission maange to
   **Allow** (aapka hi account hai).
4. **Deploy → New deployment → Web app**:
   - *Execute as:* **Me**
   - *Who has access:* **Anyone**
   - **Deploy** → `/exec` URL copy kariye (`https://script.google.com/macros/s/…/exec`).
5. Browser me wo URL kholiye — JSON dikhna chahiye (`"ok":true`). HTML/login page aaye to
   step 4 dobara kariye ("Anyone" chuniye).

## Kaam 3 — Hosting par 3 values (2 min)

Vercel → Project → **Settings → Environment Variables** (Production + Preview dono):

```
GOOGLE_SHEETS_WEBAPP_URL = <jo /exec URL copy kiya>
GOOGLE_SHEETS_TOKEN      = <koi lamba random token, 32+ characters>
SHEET_EXPECTED_ID        = 1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo
```

Save ke baad **Deployments → Redeploy** (env purani build par nahi lagti).

Token ko sheet me bhi ek baar set karna hai (taaki script sirf aapki site se baat kare):
`<exec URL>?action=set_token&token=<wahi token>`

---

## Check (1 min)

1. `https://<site>/api/settings` kholiye →
   `"meta":{"sheetSource":"apps-script"}` aur `upiId` = sheet wali value.
2. Sheet me phone number badal kar **3 second** baad site refresh kariye — naya number.
3. Checkout → order place → step 3 me QR + UPI ID dikhne chahiye (koi "refresh kariye"
   message nahi aayega).
4. Order ki row Sheet ke **Orders** tab me aa jaayegi.

Kuch na chale to: Sheet → Apps Script → **Deployments → Manage deployments** me "Anyone"
hai ya nahi dekhiye, aur `/api/sheet-health` kholkar exact error padhiye.

---

## Aage ke optional kaam

- **Domain:** domain final hone par `NEXT_PUBLIC_SITE_URL` badal dijiye (WhatsApp/invoice
  links isi se bante hain).
- **Asli products:** abhi catalogue me sample products hain; `npm run catalog:build`
  se naya catalogue banta hai.
- **Order status:** owner panel (admin) → Orders → status badaliye
  (placed → confirmed → packed → shipped → delivered); har change Sheet me row bana deta hai.
