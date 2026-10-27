# Software Requirements Specification (SRS)

## 1. System overview

```
Customer ──► apps/web (Next.js, static + server actions) ──► .data / catalog.json
Admin    ──► apps/admin (Next.js, cookie session)        ──► .data (shared)
Mobile/Partner ──► apps/api (Express, /api/v1)           ──► catalog.json + .data
Payment provider ──► webhook (HMAC verified)
```

## 2. Functional requirements (Phase 1)

| ID | Requirement | Priority | Verification |
| --- | --- | --- | --- |
| FR-01 | Catalogue me 287 products, exact title/price/MRP/sizes | P1 | `tests/unit/catalog.test.mjs` |
| FR-02 | Collection page: sort (featured, price, discount), price filter, load more | P1 | manual + E2E |
| FR-03 | Product detail: image, price, discount, size selector, details, related | P1 | manual |
| FR-04 | Search (header instant + /search) 2 char ke baad | P1 | API test |
| FR-05 | Cart localStorage me, refresh ke baad bhi bacha rahe | P1 | manual |
| FR-06 | Checkout: address validation (pincode 6 digit, phone 10 digit) | P1 | unit |
| FR-07 | Order create idempotent (same key → same order) | P1 | integration |
| FR-08 | Server-side price recompute (client amount ignore) | P1 | integration |
| FR-09 | COD > Rs. 3,500 reject | P1 | integration |
| FR-10 | Order confirmation + tracking page (status timeline) | P1 | manual |
| FR-11 | Admin login (8h session), orders status workflow + audit | P1 | manual |
| FR-12 | Admin price edit / stock toggle persist | P1 | manual |
| FR-13 | Policy + contact pages | P1 | manual |
| FR-14 | Payment link (Razorpay) / manual fallback | P1 | staged |
| FR-15 | Webhook: signature verify + event dedupe | P1 | integration |
| FR-16 | Sitemap (297 URLs), robots, JSON-LD, OG | P1 | manual |

## 3. Non-functional

- Mobile-first (360px se), Lighthouse mobile performance ≥ 90 on home/PDP.
- Har page static ho sake to static ho (287 PDP prerendered).
- Image CDN direct (browser se), Next server se proxy nahi.
- Error states: empty cart, out of stock, invalid pincode, network fail — sabhi visible.
- Accessibility: WCAG 2.1 AA basics (labels, focus, contrast, keyboard).

## 4. Interfaces

- REST: `/api/v1/*` (apps/api) + Next route handlers (web checkout, search).
- Webhooks: `/api/v1/webhooks/razorpay` (raw body).
- Data files: `database/seeds/catalog.json`, `.data/*.json`.

## 5. Constraints

Node ≥ 20.9, no external DB in Phase 1, no client-side secrets, images hotlinked from CDN.
