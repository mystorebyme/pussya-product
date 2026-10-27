# Data model

## Two layers

| Layer | Storage | Writable | Owner |
| --- | --- | --- | --- |
| **Catalogue** | `database/seeds/catalog.json` (build artifact) | rebuild only | `scripts/build-catalog.mjs` |
| **Transactional** | `.data/*.json` (Phase 1) → Postgres (Phase 2) | runtime | web/admin/api |

## Entities

```
collections 1 ─── n products (many-to-many via collection handles)
products    1 ─── n variants (size × sku × stock)
products    1 ─── n images
customers   1 ─── n addresses
customers   1 ─── n orders
orders      1 ─── n order_items ─── 1 variant
orders      1 ─── n payment_attempts
orders      1 ─── n invoices (Phase 2)
orders      1 ─── n webhook_events (via payment)
coupons     1 ─── n orders (applied code snapshot)
audit_logs  n (actor × action × entity)
settings    key-value singleton
```

## Files (Phase 1)

| File | Contents |
| --- | --- |
| `.data/orders.json` | `{ orders: Order[] }` |
| `.data/idempotency.json` | `{ "<key>": { orderNumber, createdAt } }` |
| `.data/messages.json` | contact form submissions |
| `.data/newsletter.json` | email signups |
| `.data/customers.json` | derived + notes |
| `.data/overrides.json` | `{ "<handle>": { price?, stock? } }` |
| `.data/settings.json` | store settings |
| `.data/audit.json` | admin actions |
| `.data/webhook-events.json` | provider event ids (dedupe) |

## Rules

1. Money = integer paise. Koi float nahi.
2. IDs = stable slugs (`handle`) for catalogue, `cuid`-like random for orders.
3. Order line snapshot: title, price, image at purchase time (baad me catalogue badle to order na badle).
4. Delete = soft (archive flag) where money is involved.
5. PII minimal: naam, phone, email, address. Koi card data kabhi store nahi.
