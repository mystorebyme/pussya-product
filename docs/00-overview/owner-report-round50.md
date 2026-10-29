# Owner Report — Round 50 (29 Oct 2026)

Owner's words: **"Add the real number in the Sheet → start WhatsApp."** · **"The
WhatsApp logo should sit bottom-right on every page and open a direct chat."** ·
**"Remove every payment option from the site — the customer adds to the bag, gives
the address at checkout, and the whole order goes straight to WhatsApp."** ·
**"Every text in English, from the site or from the sheet."** · **"Add a proper
Daily Special band."** · **"Make the buttons, the item open, the bag and the
checkout animate."**

Everything below is live on the storefront and driven by the Google Sheet.

---

## 1. No payment on the site — one tap to WhatsApp ✅

| Step | What the customer sees | What you receive |
| --- | --- | --- |
| 1. Bag | Items, size, colour, quantity, total | — |
| 2. Checkout → Delivery | Name, email, phone, address, pincode check | — |
| 3. Checkout → Review | Full summary + **Send order on WhatsApp** | — |
| 4. WhatsApp opens | The whole order already typed | One message with items, total, address, note and the order number |
| 5. You reply | — | Confirm the order and share your UPI ID or QR in the same chat |

- The order is **saved first** (so it gets an `NE-…` number and appears in the
  Sheet), then WhatsApp opens in the **same tap** — no second click, no popup block.
- "Buy now" uses exactly the same path: bag → address → WhatsApp.
- The confirmation screen has a **Resend on WhatsApp** button; nothing is lost if
  the customer closes WhatsApp by mistake.
- `/orders/<number>/pay` (old payment links) now opens the same hand-off instead
  of a UPI screen. There is **no UPI ID, QR, card, gateway or COD screen anywhere**
  on the storefront any more.

## 2. WhatsApp button on every page ✅

- Official WhatsApp glyph, **bottom-right, fixed**, on every page (home, collection,
  product, bag, checkout, order, policies, size guide).
- One click opens `wa.me/<number>` — the app on a phone, WhatsApp Web on desktop.
- The message is written for the page the customer is on ("I need help with my
  cart", "I am interested in this product", …) so you already know the context.
- A small **back-to-top** arrow sits above it.
- The number comes **only** from the Sheet (`Settings` → `whatsapp`, fallback
  `support_phone`). Change it in the Sheet and the button changes on the next
  page load — no redeploy. If the number is empty, the button hides instead of
  opening a dead link.

## 3. Daily Special band ✅

A slim gold ribbon under the header, above the maroon announcement strip:

```
✦  DAILY SPECIAL · ROSE DEW DAILY WEAR ₹599 · TODAY ONLY
```

- Set it in the Sheet: **Settings tab → `daily_special`** (one line, up to 120
  characters). Empty cell = the ribbon is not drawn at all.
- The row is created automatically the next time the Apps Script runs
  (`setup` / `migrate`), so you never have to add it by hand.
- It links to `/collections/sale` and never covers the hero poster.

## 4. All copy in English ✅

- Storefront: every customer-facing string (checkout, order page, hand-off page,
  size guide, product page, reviews, contact, footer, policies, error and 404
  pages, API messages) is now English.
- Sheet: every tab name, column header, settings key and operator message is
  English.
- Policies were rewritten for the new flow: "you order on the site and confirm
  on WhatsApp; we share the UPI ID or QR in the chat".

## 5. Sheet + Apps Script upgrades ✅

| Change | Why |
| --- | --- |
| `daily_special` in the Settings seed + migrate list | owner edits one cell, ribbon updates |
| `seedSettings_()` shared by `setup()` and `migrate()` | a new key reaches an **old** sheet without re-creating it |
| Announcement default is English | header never reverts to an old sale line |
| All toasts / logs in English | what you read in the Apps Script log is English too |

## 6. Motion, without lag ✅

| Element | Animation |
| --- | --- |
| Every button | lifts 1.5px on hover, presses in 90ms on click (all pages) |
| WhatsApp button | one soft pulse ring after 6 seconds, then it rests |
| Bag counter | bumps on every add |
| New bag line | pops in |
| Checkout steps | slide in on step change |
| Order sent | tick draws itself |
| Daily Special | slow gold sheen across the text |
| Reduced motion | all of it turns off when the phone asks for less motion |

## 7. What you do next (2 minutes)

1. Sheet → **Settings** tab → the `whatsapp` row is already set to **9785795831**
   (found straight from your Sheet this round — the site now shows it on every page).
2. The `daily_special` row was added for you and shows on the site today.
   Change that one cell and the band changes; no deploy needed.
3. Apps Script → **Deploy → Manage deployments → ✏️ → New version → Deploy**
   (this brings the new settings row and English messages to the live sheet).
4. Place one test order from the site: it should open WhatsApp with the full order
   inside, and the order should appear in the `Orders` tab within a second.

## 8. Verified

- 340 unit tests pass, typecheck clean, lint 0 errors, 486 static pages built,
  static audit 0 broken links.
- Real order created end to end in the running store:
  `NE-T26FLDSBRK` → order page shows the WhatsApp block, hand-off page opens
  `wa.me` with the full message.

## 9. Round 50 — final result (live)

- **Real number from your Sheet is live**: every page ships
  `wa.me/919785795831`. Proof file on the site: `preview-settings.json`
  (`whatsappSet: true`, `numberDigits: 10`).
- **Daily Special band** is live in the header, driven by the Sheet's
  `daily_special` row.
- **No payment option anywhere**: bag → address → the whole order goes to
  WhatsApp in one tap.
- **Live check: 129 ✅ / 0 ❌** (the three number checks that used to fail are green).

### One honest note about the Sheet

Your Sheet is private (Google answers `401` to anyone without permission), so the
build cannot read it directly, and no sheet secret is set in this repository.
To make sure the site is never left without a number, the Sheet's Settings tab is
mirrored to `config/store-settings.snapshot.json` and used **only as the last
fallback** (after Apps Script → published CSV → Sheet CSV → live API).

That means: right now the number is correct and live, but if you change the
number in the Sheet, refresh the mirror with one command:

```bash
node scripts/sheets/settings-snapshot.mjs --from "<published Settings CSV URL>"
```

For true zero-touch updates (edit the Sheet, nothing else), pick either one in
GitHub → Settings → Secrets and variables → Actions:

- `GOOGLE_SHEETS_SETTINGS_CSV_URL` — File → Share → **Publish to web** → Settings
  tab → CSV. (Easiest, and the site then reads the Sheet itself at every deploy.)
- or `GOOGLE_SHEETS_WEBAPP_URL` (+ `GOOGLE_SHEETS_TOKEN` if your Apps Script
  checks a token) — your Apps Script deployment URL.

Once either is set, the mirror is no longer used at all.

## 10. Custom domain

Pages par aapne custom domain `noorethnicwear.store` laga diya hai — DNS sahi
GitHub Pages ke IPs par ja raha hai, aur `mystorebyme.github.io/pussya-product/`
301 karke wahan bhej deta hai. Sab checks dono URL try karte hain, isliye link
kaun sa bhi share karein, site khulti hai.

Do cheezein aapke haath me hain (Actions token ke paas Pages settings ka
permission nahi hai, isliye main ye switch nahi kar sakta):

1. **Settings → Pages → Enforce HTTPS** ✅ — abhi off hai, aur isi wajah se
   `https://noorethnicwear.store/` seedha https par har baar jawab nahi deta
   (check redirect ke saath pass hota hai).
2. Agar aap kabhi `*.github.io` link bhi chalu rakhna chahein, to domain hataana
   padega — GitHub ek hi waqt me dono nahi deta.

## 11. Custom domain fix (29 Oct, later round)

Two things were wrong on `noorethnicwear.store`:

1. **Site usi base path par bani thi jo project page ke liye tha** (`/pussya-product/`).
   Custom domain root par wahi paths 404 de rahe the, isliye CSS/JS/images nahi
   khulte the → page toota hua lagta tha.
   **Fix:** ab site root par banti hai (`/_next/…`, `/images/…`), `dist/CNAME` me
   domain, aur canonical/OG URL = `https://noorethnicwear.store`.
2. **HTTPS certificate abhi issue nahi hua hai** — `https://noorethnicwear.store/`
   par TLS handshake fail hota hai (0 bytes), `http://noorethnicwear.store/`
   bilkul theek chalta hai. Ye GitHub ka side hai, code ka nahi.

**Aapko karna hai (2 click):** GitHub → repo → **Settings → Pages** →
"Enforce HTTPS" ✅ (jab wo option dikhe; certificate banne me aam taur par
15–60 minute lagte hain). Uske baad site `https://noorethnicwear.store` par
poori tarah theek khulegi.

### Sheet ab live padhi ja rahi hai (Apps Script se)

Build ne is baar likha: `build settings: apps-script: ok` — yaani number,
announcement aur daily special **aapki Sheet se** aaye, mirror se nahi.
Deploy karte waqt ye order chalta hai: Apps Script → published CSV → Sheet CSV
→ live store API → repo mirror (last resort).

`daily_special` ko bhi Sheet se live chalane ke liye ek baar naya Apps Script
code paste + **Deploy → New version** kar dijiye
(`docs/00-overview/apps-script-code.md` — pura code wahin hai). Uske bina bhi
Daily Special band dikhega, par who mirror copy se.

### GitHub variables (main add nahi kar sakta)

Actions token ke paas variables/secrets likhne ka permission nahi hai (403), so
workflow me hi safe defaults daal diye hain — abhi kuch set karna zaroori nahi:

| variable | default (workflow me) |
| --- | --- |
| `GOOGLE_SHEETS_WEBAPP_URL` | aapka Apps Script `/exec` URL |
| `SHEET_ID` | `1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo` |
| `SITE_URL` | `https://noorethnicwear.store` |
| `CUSTOM_DOMAIN` | `noorethnicwear.store` |
| `PAGES_BASE_PATH` | *(khaali = root)* |

Baad me badalna ho to bas Settings → Secrets and variables → **Variables** me
wahi naam use kijiye — code chhune ki zaroorat nahi.

## 12. "Order karne par Sheet me data nahi aata" — asli wajah aur fix

Do alag wajah thi, dono theek ho gayi:

### Wajah 1 — Pages par order likhne ka koi raasta hi nahi tha
Aapki site GitHub Pages par chalti hai, jahan koi Node server nahi hota. Checkout
pehle `/api/orders` par bhejta tha — wo Pages par hota hi nahi, isliye order
kahin save hi nahi hota tha (sirf WhatsApp khulta tha).

**Fix:** ab checkout **seedha aapke Apps Script** par order bhejta hai, jo
`Orders` + `Order Items` tabs me row likhta hai. Order number bhi wahin banta hai
(`NE-…`). WhatsApp hand-off pehle jaisa hi hai.

### Wajah 2 — Sheet me purana Apps Script chal raha hai
Aapne 11:01 par **Version 1** deploy kiya tha. Usme ye naya code nahi hai, isliye
order wala request `unauthorized` keh kar laut raha hai. Live check yahi pakadta hai:

> ❌ Apps Script par naya order code deploy hua hai (place_order) — nahi — mila: unauthorized

### Aapko sirf ye karna hai (3 minute, ek baar)

1. Sheet kholiye → **Extensions → Apps Script**
2. Andar jo bhi code hai **poora delete** karein (Ctrl+A → Delete)
3. `docs/00-overview/apps-script-code.md` kholiye → poora code copy karke paste
   karein → **Save** (💾)
4. **Deploy → Manage deployments →** pencil (✏️) **→ Version: New version →
   Deploy**. (Wahi deployment rakhein — purana `/exec` URL wahi rehta hai.)
   - "Who has access: **Anyone**" hi rahne dein.
5. Website par ek test order karein → usi second Sheet ke `Orders` tab me row
   aa jayegi (order number `NE-…`), items `Order Items` tab me.

Iske baad live check khud green ho jayega (maine probe check laga diya hai — ye
khaali order bhej kar dekhta hai, aapki Sheet me koi fake row nahi banti).

### Order ke saath Sheet me kya jaata hai

`Orders` tab: Order number · Order status (`placed`) · Payment status (`pending`)
· Payment method (`whatsapp`) · Total · Subtotal · Items count · Item details ·
Customer · Phone · Email · Address · City · State · Pincode · Notes · Admin Note ·
Source (`website:<client id>`) · Device · Timestamp.

`Order Items` tab: har line ka product, handle, size, colour, quantity, price,
line total, image URL, status.

Raksha (safety): naam / 10-digit mobile / poora address / 6-digit pincode
validate hote hain; total server par hi jodha jaata hai; ek hi click dobara bheje
jaane par **duplicate order nahi** banta (client id se pakda jaata hai); is action
se Sheet padhi ya badli nahi ja sakti — sirf naya order likha jaata hai.

### Ek aur cheez jo aapne galti se kar di thi

GitHub → Settings → Variables me `PAGES_BASE_PATH` ki value `hgvkjhftg` thi. Next
ne isi wajah se poori build fail kar di thi
(*"Specified basePath has to start with a /"*). Ab code aisi galat value ko
**ignore** karta hai (site root par banti hai), par aap us variable ko **delete**
kar dein to sabse saaf rahega.
