# Traceability matrix

| Req ID | Feature | Code | Test |
| --- | --- | --- | --- |
| FR-01 | Catalogue 287 products | `database/seeds/catalog.json`, `apps/web/src/lib/store.ts` | `tests/unit/catalog.test.mjs` |
| FR-02 | Collection sort/filter | `apps/web/src/app/collections/[handle]/page.tsx`, `/api/products` | manual + `tests/e2e/storefront.spec.ts` |
| FR-03 | PDP | `components/product-detail.tsx` | `tests/e2e/storefront.spec.ts` |
| FR-04 | Search | `app/api/search/route.ts` | `tests/integration/search.test.mjs` |
| FR-05 | Cart persist | `components/cart-provider.tsx` | manual |
| FR-06 | Address validation | `packages/validation/index.ts` | `tests/unit/validation.test.mjs` |
| FR-07 | Idempotent order | `app/api/orders/route.ts`, `apps/api/.../idempotency.middleware.ts` | `tests/integration/order-idempotency.test.mjs` |
| FR-08 | Server price recompute | `apps/web/src/lib/orders.ts` | `tests/unit/pricing.test.mjs` |
| FR-09 | COD limit | `lib/orders.ts`, `orders.service.ts` | `tests/unit/pricing.test.mjs` |
| FR-10 | Order page | `app/orders/[orderNumber]/page.tsx` | manual |
| FR-11 | Admin orders + audit | `apps/admin/src/app/(admin)/orders` | manual |
| FR-12 | Admin product edit | `apps/admin/src/app/(admin)/products`, `lib/data.ts` | manual |
| FR-13 | Policies | `src/content/policies/*.md` | manual |
| FR-14 | Payment link | `lib/payments.ts`, `payments.service.ts` | staged (keys ke saath) |
| FR-15 | Webhook verify | `app/api/webhooks/razorpay/route.ts` | `tests/integration/webhook.test.mjs` |
| FR-16 | SEO | `app/sitemap.ts`, `app/robots.ts`, layout metadata | manual |
