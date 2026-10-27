# C4 diagrams

## L1 — System context

```
        ┌──────────┐                        ┌────────────────────┐
        │ Customer │──── browse / buy ─────►│ Noor Storefront │
        └──────────┘                        └─────────┬──────────┘
                                                      │ orders, payments
        ┌──────────┐                        ┌─────────▼──────────┐
        │  Owner   │──── manage ───────────►│ Noor Admin       │
        └──────────┘                        └─────────┬──────────┘
                                                      │
                     ┌────────────────────────────────▼─────────────────┐
                     │  Noor API (Express)  ◄── webhooks ── Razorpay  │
                     └────────────────────────────────┬─────────────────┘
                                                      │ images
                                              ┌───────▼────────┐
                                              │ Shopify CDN    │
                                              └────────────────┘
```

## L2 — Containers

| Container | Responsibility | Technology |
| --- | --- | --- |
| Storefront | Customer UI, checkout, order page | Next.js (SSG + route handlers) |
| Admin | Operations UI | Next.js (server components + actions) |
| API | Partner/mobile contract, webhooks | Express 5 |
| Data store | Orders, messages, overrides, settings | JSON files → Postgres |
| Payment provider | Collect money | Razorpay |

## L3 — Components (storefront)

`store.ts` (catalogue read) · `orders.ts` (create/read) · `payments.ts` (provider adapter) ·
`cart-provider` (client state) · `product-detail` / `product-card` (UI) · `markdown.tsx` (policies).

## L4 — Code

`apps/web/src/lib/orders.ts` → `createOrder()` pure function + file IO; testable, HTTP-free.
