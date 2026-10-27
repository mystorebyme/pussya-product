# Delivery & pincode rules

## Kyun

Pehle pincode check sirf 6-digit regex tha — `999999` bhi "deliverable" dikhta tha.
Ab har check **asli data + admin rules** par hota hai.

## Data

- `database/seeds/delivery/pincodes.json` — India Post ka pincode data:
  **19,486 pincodes, 36 states/UTs**, state → district → pincodes.
- Jo pincode is data me nahi hai (jaise `999999`, `123456`) wo **kabhi deliverable nahi**.
- Source package: `india-post-pincode` (MIT). Refresh karna ho to isi se regenerate karein.

## Rules (admin panel → Delivery)

| Setting | Matlab |
| --- | --- |
| `allowAllStates: true` (default) | Sabhi states allowed — sirf data me maujood pincode chalte hain |
| `allowAllStates: false` + `states` | Sirf tick kiye states ke pincodes allowed |
| `blockedPincodes` | Kisi bhi state ka specific pincode band (state allowed ho tab bhi) |
| `allowedPincodes` | State band ho tab bhi ye pincodes allowed (override) |
| `deliveryDays` | Customer ko dikhne wala estimate |
| `freeShipping` | Free shipping flag |

Block list hamesha allowed list se jeetti hai.

## Kahan lagta hai

1. **PDP "Check delivery"** → `GET /api/delivery/check?pincode=302001` (asli result + state/district).
2. **Checkout** → pincode 6 digit hote hi auto-check, galat/blocked par order aage nahi badhta; state auto-fill.
3. **Server** → `createOrder()` me dobara check (`code: pincode_not_serviceable`) — client bypass ho to bhi order nahi banta.
4. **Admin** → `GET/PUT /api/admin/delivery` (Bearer `ADMIN_API_TOKEN`), page `/delivery`.

## Storage

- `DATABASE_URL` set → Postgres table `delivery_settings` (migration `0002_delivery.sql`).
- Warna `.data/delivery.json` (dev).
- Source of truth storefront hai; admin panel API se hi padhta/likhta hai — isliye admin ka
  block turant website par lagta hai.

## Tests

- `npm test` → `tests/unit/delivery.test.ts` (fake pincode reject, state block, pincode block, override).
- `npm run test:db` → Postgres me settings persist + blocked pincode par order reject.
- `npm run test:smoke` → live server par check endpoint + admin auth.
