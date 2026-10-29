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

1. Sheet → **Settings** tab → check the `whatsapp` row has your number
   (`98765 43210` or `+91 98765 43210` — both work).
2. In the same tab, fill `daily_special` with today's line (or leave it empty).
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
