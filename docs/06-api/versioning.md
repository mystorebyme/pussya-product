# Versioning & compatibility

## Rules

1. URL-based: `/api/v1`. Breaking change → `/api/v2` (6 month deprecation window).
2. Additive changes v1 me ship ho sakte hain (naya field, naya optional param).
3. Field remove/rename/retype = breaking.
4. Enum me naya value add = additive, par client ko default branch chahiye.
5. Deprecation: `Deprecation: true` + `Sunset: <date>` headers, 30 din pehle docs update.

## Client compatibility

`packages/api-client` version `0.x` — API change ke saath bump; storefront aur api-client ek hi PR me update.

## Contract testing

`tests/integration/api-contract.test.ts` — response shape snapshots. CI fail on unexpected shape change.

## Rate limits (per IP)

| Route | Limit |
| --- | --- |
| `GET /products*` | 120/min |
| `POST /orders` | 10/min |
| `POST /payments/link` | 10/min |
| `GET /orders/:orderNumber` | 30/min |
| admin routes | 60/min |
| webhook | 300/min (provider IPs) |

429 response: `Retry-After` + `error.code = RATE_LIMITED`.
