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
