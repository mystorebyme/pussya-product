# Tracking, OTP aur invoice endpoints

Storefront ke Next route handlers (apps/web/src/app/api) — ye public surface hai jo
customer/checkout use karta hai. Admin panel server actions se chalta hai.

| Method | Path | Auth | Kaam |
| --- | --- | --- | --- |
| GET | `/api/otp/status` | public | `{ required, mode }` — checkout ko OTP step dikhana hai ya nahi |
| POST | `/api/otp/start` | public | `{ phone }` → `{ mode, devCode? }` (devCode sirf non-prod) |
| POST | `/api/otp/verify` | public | `{ phone, idToken }` ya `{ phone, code }` → `{ phoneToken }` (15 min) |
| POST | `/api/orders` | public + `phoneToken` (jab OTP on hai) | order create; phone mismatch → `400 phone_mismatch` |
| GET | `/api/orders/:orderNumber/invoice?phone=XXXX` | order phone ke last 4 digit | GST invoice **PDF** (403 warna) |
| GET | `/orders/:orderNumber/invoice?phone=XXXX` | page | printable invoice + "Download PDF" |
| GET | `/orders/:orderNumber` | page | order status, tracking timeline, courier/AWB, invoice link |

## Tracking data model

```jsonc
"tracking": {
  "courier": "Delhivery",
  "awb": "AWB-998877",
  "url": "https://www.delhivery.com/track/package/AWB-998877",
  "shippedAt": "2026-10-24T07:12:00.000Z",
  "deliveredAt": null,
  "updatedAt": "2026-10-24T07:12:00.000Z",
  "updatedBy": "admin@noorethnicwear.in"
}
```

- Admin panel → order → **Courier & tracking** form (courier, AWB, link) → `setOrderTracking()`
  → order record + audit entry (`order.tracking_updated`).
- Customer ka order page timeline status ke saath date dikhata hai (audit se) aur
  AWB hone par "Track with courier" button.
- Status machine `@noor/validation` me hai: `placed → confirmed → packed → shipped → delivered`
  (+ `cancelled`, `returned`). Invalid jump `409 INVALID_TRANSITION`.
