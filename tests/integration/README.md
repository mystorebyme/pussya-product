# Integration tests

Real modules, real HTTP, temp data dirs (`tests/helpers/env.ts` isolates each suite).

| File | Covers |
| --- | --- |
| `orders.test.ts` | server-side pricing, coupon, strict size validation, COD limit, transitions, payment webhook effect, persistence |
| `search.test.ts` | query matching, collection filter, sorting, pagination, meta |
| `webhook.test.ts` | HMAC verify: valid, wrong secret, tampered payload, truncated signature |
| `http-api.test.ts` | Express app on a random port: envelope, pagination, 401 guards, validation, idempotent replay, 409 transition, unsigned webhook, 404 envelope |
| `admin-session.test.ts` | session round-trip, tamper, expiry, credential check |

```bash
npm run test:integration
```
