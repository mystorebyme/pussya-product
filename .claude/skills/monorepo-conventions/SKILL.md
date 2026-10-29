---
name: monorepo-conventions
description: How this npm-workspaces monorepo is wired — package names, import boundaries, scripts, tsconfig paths, and where new code belongs.
---

# Monorepo conventions

## Layout

```
apps/web      @noor/web    storefront (Next 16)
apps/admin    @noor/admin  admin panel (Next 16)
apps/api      @noor/api    Express 5 API
packages/types       @noor/types       shared models
packages/validation  @noor/validation  zod + business constants
packages/api-client  @noor/api-client  typed fetch client
packages/ui          @noor/ui          shared primitives
packages/config      @noor/config      tsconfig/eslint base
database/     prisma + seeds + sql + scripts
docs/         numbered docs 00–11
tests/        unit / integration / e2e
infra/         nginx, monitoring, deploy scripts
```

## Boundaries

| Rule | Why |
| --- | --- |
| App → app import **never** | alag deploy units, circular risk |
| Shared logic → `packages/*` | ek hi jagah rule |
| `@noor/web` me `fs` sirf `lib/*` (server-only) | client bundle |
| DB access sirf `apps/api/src/config/data.ts` (web ke liye `lib/*.ts`) | swap point |

## Imports

```ts
import { createOrderSchema, COD_FEE } from "@noor/validation";
import type { Order, Product } from "@noor/types";
import { createApiClient } from "@noor/api-client";
import { formatPrice } from "@/lib/format";      // app-local
```

`transpilePackages: ["@noor/types", "@noor/validation"]` next.config me.

## Scripts (root)

```bash
npm run dev           # web (:3000)
npm run dev:admin     # admin (:3001)
npm run dev:api       # api (:4000)
npm run build:all     # teeno build
npm run typecheck     # sab workspaces
npm test              # unit
npm run catalog:build
npm run setup
```

## Adding a package

1. `packages/<name>/package.json` — `"main": "index.ts"`, `"types": "index.ts"`, `"type": "module"`.
2. Root `npm install` (workspace link).
3. Consumer ke `dependencies` me `"@noor/<name>": "*"`.
4. Next app me `transpilePackages` add.

## Don't

- Root `devDependencies` me app-only libs.
- `../../../packages/...` relative imports — package name use karo.
- Ek app ka code doosre app me copy-paste (package banao).
