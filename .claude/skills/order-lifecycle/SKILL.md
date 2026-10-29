---
name: order-lifecycle
description: Implement or debug order creation, pricing, coupons, COD rules, idempotency, status transitions and payment state. Use for anything touching orders or money.
---

# Order lifecycle

## Money rules (`packages/validation/index.ts`)

| Rule | Value |
| --- | --- |
| COD max subtotal | `350_000` paise (Rs. 3,500) |
| COD fee | `5_000` paise (Rs. 50) |
| Shipping | free |
| Coupons | `NOOR10` 10%, `WELCOME15` 15% |
| Max qty per line | 10 |
| Order number | `NE-` + base36 stamp + random, regex `^NE-[A-Z0-9]{6,12}$` |
| Cart storage | `noor:cart:v1` |

`total = subtotal - discount + (cod ? COD_FEE : 0)`, minimum 0.

## Server rules (never break)

1. Price sirf catalogue se — client ka bheja amount ignore.
2. `quantity` 1..10, `size` product ke sizes me se.
3. COD subtotal > Rs. 3,500 → 400 `cod_not_allowed` ("COD sirf Rs. 3,500 se kam orders par available hai").
4. `Idempotency-Key` same → same order (duplicate nahi).
5. Writes atomic (`tmp` + `rename`).
6. Order line item snapshot (title/price/image) — catalogue baad me badle to order na badle.

## Status machine

```
placed ──► confirmed ──► packed ──► shipped ──► delivered
   │           │            │           │
   └───────────┴────────────┴───────────┴──► cancelled
shaipped/delivered ──► returned
```

Allowed: `placed→confirmed|cancelled`, `confirmed→packed|cancelled`, `packed→shipped|cancelled`,
`shipped→delivered|returned`, `delivered→returned`. Baaki → 409 `INVALID_TRANSITION`.

COD `delivered` par `paymentStatus` `paid` ho jaata hai.
Prepaid: `pending` → webhook `paid` (order `placed` tha to `confirmed`).

## Files

- Web: `apps/web/src/lib/orders.ts`, `apps/web/src/app/api/orders/route.ts`
- API: `apps/api/src/modules/orders/{routes,controller,service}.ts`
- Admin: `apps/admin/src/app/actions.ts` (`updateOrderStatusAction`)
- Types: `packages/types/index.ts` (`Order`, `OrderStatus`, `PaymentStatus`)

## Debug

```bash
jq '.orders[0]' .data/orders.json
curl -s localhost:4000/api/v1/orders/NE-XXXX | jq
```

Order page 404 → check `.data/orders.json` aur `getOrder()` case-sensitivity.
Total mismatch → coupon case (uppercase), ya COD fee missing.
