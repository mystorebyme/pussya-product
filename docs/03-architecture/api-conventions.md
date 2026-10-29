# API conventions

## Base

`/api/v1/*` (apps/api). Storefront ke apne route handlers `/api/*` (checkout, search) — woh internal hain.

## Response shape

```json
// success (single)
{ "data": { "orderNumber": "NE-05K05TGG" } }

// success (list)
{ "data": [...], "page": 1, "perPage": 24, "total": 287, "totalPages": 12 }

// error
{ "error": { "code": "VALIDATION_ERROR", "message": "Pincode 6 digit ka hona chahiye", "details": {} } }
```

## Rules

1. `GET` kabhi mutate nahi karta.
2. `POST /orders` idempotent — `Idempotency-Key` header (client sends a uuid). Replay returns the same
   body plus `idempotent-replay: true`; keys are stored in `.data/idempotency.json` for 7 days.
3. Money integer paise.
4. Dates ISO-8601 UTC (`2026-10-24T06:10:51.078Z`).
5. Pagination: `page` (1-based) + `perPage` (max 60). List endpoints meta return karte hain.
6. Filtering whitelist only (`q`, `collection`, `category`, `sort`, `page`, `perPage`) — arbitrary params nahi.
   `sort` values: `featured` (default), `price-low`, `price-high`, `discount`.
7. Versioning: breaking change = `/api/v2`. Additive change v1 me allowed.
8. Every request gets `x-request-id` (echoed back).
9. Rate limit headers: `retry-after` on 429.
10. Auth: `Authorization: Bearer <token>` for admin routes.

## Naming

- Resources plural: `/products`, `/orders`, `/collections`.
- Handles/order numbers as path params: `/products/:handle`, `/orders/:orderNumber`.
- Status transitions: `PATCH /orders/:orderNumber/status`.
