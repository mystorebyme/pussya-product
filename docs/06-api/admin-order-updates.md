# Admin → customer order updates

Admin jo bhi order par karta hai, customer ko `/orders/<number>` par wahi dikhna chahiye.
Ye doc Round 8 me bane parity work ka contract hai.

## 1. Status (order kahan hai)

`PATCH /api/admin/orders/:orderNumber` — `action: "status"`

```json
{ "action": "status", "status": "confirmed", "note": "size confirm ho gaya", "actor": "admin@noorethnicwear.in" }
```

- Allowed transitions `@noor/validation` me hain (`placed → confirmed → packed → shipped → delivered`).
- Invalid transition par kuch nahi likha jaata (silent no-op), UI refresh par purana status dikhta hai.
- Customer page par tracking timeline (`data-testid="order-tracking"`) me step + time dikhta hai.

## 2. Free-text note ("abhi kahan atka hai")

`PATCH /api/admin/orders/:orderNumber` — `action: "note"`

```json
{ "action": "note", "text": "Delhivery pickup kal subah", "actor": "admin@noorethnicwear.in" }
```

- Type: `OrderStatusNote = { text, at, by, status }` (`@noor/types`).
- 240 characters tak; **khaali text = note clear**.
- Audit: `order.note_updated` / `order.note_cleared`.
- Customer page: timeline ke neeche "Update from our team" box (`data-testid="order-note"`).
- Postgres: `orders.status_note` (jsonb, migration `0004`).

## 3. Payment verification (manual UPI / bank transfer)

`PATCH /api/admin/orders/:orderNumber` — `action: "payment"`

```json
{ "action": "payment", "reference": "UPI-REF-123", "amount": 199900, "actor": "admin@noorethnicwear.in" }
```

- `reference` (UTR) required — bina reference payment verify nahi hoti.
- `amount` paise me (admin UI rupees me leta hai aur convert karta hai).
- Order `placed` tha to `confirmed` ho jaata hai, `paymentStatus` = `paid`, `verifiedAt`/`verifiedBy` set.
- Customer page ka payment block (`data-testid="payment-status"`) verified date + reference dikhata hai.
- Ulta case: `action: "payment_failed"` (reason ke saath) — `paymentStatus = "failed"`.

## 4. Tracking

`PATCH /api/admin/orders/:orderNumber` — `action: "tracking"`

```json
{ "action": "tracking", "courier": "Delhivery", "awb": "AWB123", "url": "https://www.delhivery.com/track/AWB123" }
```

Customer page par courier + AWB + direct tracking link.

R31 se:
- `awb` server par saaf hota hai (space/dash hata kar uppercase) — `" 1abc 2345 "` → `1ABC2345`.
- `url` khaali chhodne par link **khud ban jaata hai** (`apps/web/src/lib/tracking.ts`):
  Delhivery, Blue Dart, DTDC, India Post, Ekart, XpressBees, Shadowfax, Ecom Express,
  Shiprocket, The Professional Couriers, Amazon, FedEx, DHL.
- Customer page par ab **per-step dates + poora update history** dikhta hai
  (`data-testid="tracking-updates"`), cancelled/returned par red banner
  (`data-testid="tracking-stopped"`), aur phone/email mask rehte hain.
- Sheet me bhi wahi link jaata hai (`Shipments` tab ka `Tracking URL`), isliye owner
  ke WhatsApp/email me bhi clickable link hota hai.

## 5. Manual invoices (admin ke apne naam/address par)

| Method | Path | Kaam |
| --- | --- | --- |
| `GET` | `/api/admin/invoices` | saare manual invoices |
| `POST` | `/api/admin/invoices` | naya invoice (`LK/MANUAL/0001`, `0002`, …) |
| `GET` | `/api/admin/invoices/:number` | ek invoice |

- Series `LK/MANUAL/` real GST order series (`LK/YYYY-MM/`) se alag rehti hai, isliye numbering clash nahi hoti.
- Amounts **paise** me.
- Storage: Postgres `manual_invoices` (migration `0004`), local dev me `.data/manual-invoices.json`.
- Admin UI: `/invoices` (banao + list), `/invoices/<number>` (print/WhatsApp).

## Auth

Sab `/api/admin/*` routes `authorization: Bearer $ADMIN_API_TOKEN` maangte hain; token na ho ya galat ho to `401`.
Admin panel remote mode me `STORE_API_URL` + `ADMIN_API_TOKEN` se hi in routes ko call karta hai — koi local copy nahi rakhta.

## Tests

- `tests/unit/tracking.test.ts` — courier link (13 courier), AWB cleaning, 5-step timeline,
  cancel/return, update history.
- `tests/e2e/payments.mjs` — paid → packed → courier/AWB → shipped, page par AWB +
  courier link + history + cancelled banner.
- `tests/e2e/smoke.mjs` — note save → customer page par text, payment verify → `paid` + UTR customer page par,
  invoice create/list, aur token ke bina `401`.
- `tests/db/postgres.test.ts` — `status_note` jsonb round-trip, note clear, manual invoice series + persistence.
