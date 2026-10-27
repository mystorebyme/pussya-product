# API endpoints (v1)

Base: `http://localhost:4000/api/v1` (prod: `https://api.noorethnicwear.in/api/v1`)

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | uptime + catalogue count |
| GET | `/products` | — | list, filters, pagination |
| GET | `/products/:handle` | — | single product |
| GET | `/collections` | — | 9 collections + counts |
| GET | `/catalog/meta` | — | counts, price range, categories |
| POST | `/orders` | — + `Idempotency-Key` | create order |
| GET | `/orders/:orderNumber` | — | order status (public tracking) |
| GET | `/orders` | Bearer admin | list orders |
| PATCH | `/orders/:orderNumber/status` | Bearer admin | status transition |
| GET | `/admin/dashboard` | Bearer admin | KPIs |
| POST | `/payments/link` | — | create payment link |
| POST | `/webhooks/razorpay` | HMAC signature | payment events |

## Query params — `GET /products`

| Param | Values | Default |
| --- | --- | --- |
| `q` | search text | — |
| `collection` | `saree`, `lehnga-choli`, `party-wear-gown`, `printed-suit-set`, `weddin-collection`, `new-arrivals`, `trending`, `sale`, `noors-choice` | — |
| `category` | `Anarkali suit`, `Lehenga`, … (exact `productType`) | — |
| `sort` | `price-low`, `price-high`, `discount`, `featured` | `featured` |
| `page` | ≥ 1 | 1 |
| `perPage` | 1–60 | 24 |

## Examples

```bash
# list
curl "http://localhost:4000/api/v1/products?collection=lehnga-choli&perPage=3"

# single
curl "http://localhost:4000/api/v1/products/luxury-mustard-embroidered-georgette-anarkali-suit"

# create order (flat customer fields + `quantity`)
curl -X POST http://localhost:4000/api/v1/orders \
  -H 'content-type: application/json' -H 'Idempotency-Key: 3f1c…' \
  -d '{"customerName":"A","email":"a@b.com","phone":"9876543210",
       "address":"12 MG Road, Panch Batti","city":"Jaipur","state":"Rajasthan","pincode":"302001",
       "items":[{"handle":"saniya-s-wine-gown","size":"M [38]","quantity":1}],
       "paymentMethod":"cod"}'

# admin list
curl -H "authorization: Bearer $ADMIN_API_TOKEN" "http://localhost:4000/api/v1/orders?status=placed"
```

## Status flow endpoint

```json
PATCH /orders/NE-05K05TGG/status
{ "status": "shipped", "note": "AWB 1234567890" }
```
Invalid transition → `409 INVALID_TRANSITION`.

## Storefront admin endpoints (Next app, `apps/web`)

Ye `api` service ke nahi, storefront app ke route handlers hain — admin panel inhe call karta hai
(`STORE_API_URL` + `ADMIN_API_TOKEN`). Detail: [admin-order-updates.md](./admin-order-updates.md).

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/admin/orders` | Bearer admin | list orders |
| GET | `/api/admin/orders/:orderNumber` | Bearer admin | single order |
| PATCH | `/api/admin/orders/:orderNumber` | Bearer admin | `action`: `status` \| `tracking` \| `note` \| `payment` \| `payment_failed` |
| GET | `/api/admin/invoices` | Bearer admin | manual invoices |
| POST | `/api/admin/invoices` | Bearer admin | manual invoice banao (`LK/MANUAL/0001`) |
| GET | `/api/admin/invoices/:number` | Bearer admin | single manual invoice |
| GET | `/api/admin/delivery` | Bearer admin | delivery rules |
| PUT | `/api/admin/delivery` | Bearer admin | state/pincode rules save |
| GET | `/api/admin/settings` | Bearer admin | store settings |
| PUT | `/api/admin/settings` | Bearer admin | store settings save |
| GET | `/api/delivery/check?pincode=` | — | serviceability |
| GET | `/api/settings` | — | public store settings (header/footer) |
