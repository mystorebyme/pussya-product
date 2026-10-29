# Low Level Design

## Storefront data layer (`apps/web/src/lib/store.ts`)

- `catalog.json` (410KB) import sirf server components me.
- `getProducts()`, `getProduct(handle)`, `getProductsByCollection()`, `getRelated()`, `searchProducts()`.
- Client bundles me sirf `navigationCollections` (9 entries) jaata hai.

## Cart (`components/cart-provider.tsx`)

- `localStorage["noor:cart:v1"]` → `MiniCartLine[]` keyed `handle::size`.
- `addItem`, `setQuantity` (max 10), `removeLine`, `clear`; subtotal derived.
- SSR safe: hydration ke baad hi read.

## Order creation

```ts
POST /api/orders  { customerName, email, phone, address, city, state, pincode,
                    notes?, couponCode?, paymentMethod, items[] }
Headers: Idempotency-Key (client uuid)

1. zod (packages/validation/createOrderSchema)
2. items → product lookup (catalogue) → size valid? qty 1..10
3. subtotal = Σ price*qty   (client price ignore)
4. discount = computeDiscount(subtotal, coupon)
5. COD rule: subtotal > 350000 → 400 COD_NOT_ALLOWED
6. total = subtotal - discount + (cod ? 5000 : 0)
7. order = { id, orderNumber: NE-XXXXXXX, status: placed, paymentStatus, items, audit[] }
8. write .data/orders.json (tmp + rename)
```

## Admin mutations (server actions)

`updateStockAction`, `updatePriceAction`, `updateOrderStatusAction`, `saveSettingsAction`
→ write override/setting file → `appendAudit()` → `revalidatePath()`.

## API module pattern (5 files)

`<name>.controller.ts` (HTTP), `<name>.routes.ts` (URL + middlewares), `<name>.schema.ts` (zod wiring),
`<name>.service.ts` (business logic, no HTTP), `<name>.test.ts` (unit).

## Error model

```json
{ "error": { "code": "COD_NOT_ALLOWED", "message": "COD under Rs. 3500 only", "details": {} } }
```

Codes: `VALIDATION_ERROR`, `NOT_FOUND`, `RATE_LIMITED`, `UNAUTHORIZED`, `COD_NOT_ALLOWED`, `INTERNAL_ERROR`.

## State machines

- Order: placed → confirmed → packed → shipped → delivered (ya cancelled/returned)
- Payment: pending → paid | failed ; cod → paid on delivery ; paid → refunded

## Concurrency

Phase 1: single instance + atomic file rename. Phase 2: DB row lock / `UPDATE ... WHERE stock >= qty`.
