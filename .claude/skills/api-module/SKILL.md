---
name: api-module
description: Add a new module to apps/api following the 5-file pattern (routes, controller, service, schema, test) with consistent errors, validation and typing.
---

# API module pattern

## Structure

```
apps/api/src/modules/<name>/
├── <name>.routes.ts      # URL + middleware wiring
├── <name>.controller.ts  # HTTP layer (req/res), no business logic
├── <name>.service.ts     # business logic + data access, no express types
├── <name>.schema.ts      # zod (ya @noor/validation se import)
└── <name>.test.ts        # unit test (node:test)
```

## Template

```ts
// coupons.routes.ts
import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../../middlewares/validate.middleware";
import { requireAdmin } from "../../middlewares/auth.middleware";
import * as controller from "./coupons.controller";
export const couponsRouter = Router();
couponsRouter.get("/coupons", requireAdmin, controller.list);
couponsRouter.post("/coupons", requireAdmin, validateBody(couponSchema), controller.create);
```

```ts
// coupons.controller.ts
export function list(_req: Request, res: Response) {
  return ok(res, service.listCoupons());
}
```

```ts
// coupons.service.ts
export function listCoupons(): Coupon[] { return readRows<Coupon>("coupons.json"); }
```

## Register

`apps/api/src/app.ts` → `app.use("/api/v1", couponsRouter)` (health ke baad, 404 se pehle).

## Rules

- Controller me `try/catch` nahi — `errorHandler` handle karta hai, `HttpError` throw karo.
- Response envelope: `ok(res, data)`, `paginated(res, items, { page, perPage, total })`,
  `fail(res, status, code, message)`.
- Validation `validateBody` / `validateQuery` middleware se, controller me nahi.
- Secrets `config/env.ts` se; `process.env` direct module me nahi.
- Auth: admin routes par `requireAdmin` (Bearer `ADMIN_API_TOKEN`).
- Rate limit public write routes par.
- Test happy path + 1 validation failure minimum.

## Checklist

```
[ ] route registered in app.ts
[ ] zod schema (shared ho to @noor/validation)
[ ] service pure-ish (no req/res)
[ ] error codes constants me
[ ] npm run typecheck -w @noor/api
[ ] curl smoke + docs/06-api/endpoints.md update
```
