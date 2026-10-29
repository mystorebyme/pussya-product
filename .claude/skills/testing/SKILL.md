---
name: testing
description: Write and run unit, integration and e2e tests for this repo; keep the traceability matrix honest. Use before any PR that touches orders, pricing, catalogue or checkout.
---

# Testing

## Commands

```bash
npm test                     # tsx --test tests/unit/
npm run test:integration     # route handlers / api with temp DATA_DIR
npm run test:e2e             # playwright (needs build + server)
npm run typecheck
```

## Layers

| Layer | Location | Tools | Speed |
| --- | --- | --- | --- |
| unit | `tests/unit/*.test.ts` | `node:test` + `tsx` | < 5s |
| integration | `tests/integration/*.test.ts` | fetch + temp `.data` | < 30s |
| e2e | `tests/e2e/*.spec.ts` | Playwright | < 3 min |

## Unit test template

```ts
import test from "node:test";
import assert from "node:assert/strict";
import { computeDiscount, COD_FEE } from "@noor/validation";

test("NOOR10 on Rs. 2,519", () => {
  assert.equal(computeDiscount(251_910, "NOOR10"), 25_191);
});
```

## Integration pattern

```ts
process.env.DATA_DIR = await fs.mkdtemp("/tmp/noor-test-");
const { POST } = await import("@/app/api/orders/route");   // ya live server
```

## Must-cover (non-negotiable)

1. Price server-side (client price ignore).
2. COD > Rs. 3,500 rejected.
3. Same `Idempotency-Key` → same order.
4. Webhook valid/invalid signature + duplicate event.
5. Catalogue: 287 products, no dup handles, price > 0, sizes non-empty.
6. Invalid pincode/phone/qty rejected.
7. Admin routes without cookie → 307.

## Rules

- Koi real network call test me nahi.
- Fixed expectations catalogue se (committed JSON), random nahi.
- Har bug fix ke saath regression test.
- Flaky test delete karo ya deterministic banao — skip mat karo.
- `npm test` 5s se zyada le to unit/integration split galat hai.
