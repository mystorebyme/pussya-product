# Structure

Har folder kyun hai aur andar kya hai. Naya code kahan daalna hai — yahi se decide karo.

```
noor-ethnic-wear/
├── apps/
│   ├── web/                  customer storefront (Next.js 16, port 3000)
│   │   ├── src/app/          routes: /, collections/[handle], products/[handle], cart,
│   │   │                     checkout, search, orders/[orderNumber], policies/[slug],
│   │   │                     pages/[slug], account + api/* route handlers
│   │   ├── src/components/   announcement-bar, header, footer, product-card (hover swap),
│   │   │                     product-gallery (thumbs+zoom+swipe), product-detail, phone-otp,
│   │   │                     reveal (scroll animation), safe-image (CDN failure → placeholder)
│   │   ├── src/lib/          store, orders (status/tracking/invoice), invoice + invoice-pdf (GST),
│   │   │                     otp + phone-token (Firebase), payments, messages, markdown, format
│   │   ├── src/config/       site config (nav, support numbers, status copy)
│   │   ├── src/content/      policy markdown
│   │   ├── src/data/         catalog.json (generated — hand-edit mat karo)
│   │   └── public/           logo, placeholder svg, icons
│   ├── admin/                owner panel (Next.js 16, port 3001, noindex)
│   │   ├── src/app/(admin)/  13 protected routes + layout
│   │   ├── src/app/login/    login screen
│   │   ├── src/app/actions.ts  server actions (status, price, stock, settings)
│   │   ├── src/lib/          auth (HMAC session), data (json store + audit), format
│   │   └── src/middleware.ts  route guard → 307 /login
│   └── api/                  REST API (Express 5, port 4000)
│       ├── src/modules/      products, orders, payments, health (5-file pattern)
│       ├── src/middlewares/  request-id, error, validate, rate-limit, idempotency, auth
│       ├── src/integrations/ email, razorpay, shiprocket, whatsapp
│       ├── src/jobs/         queues, workers, schedulers
│       ├── src/webhooks/     razorpay raw-body handler
│       └── src/config/       env, logger, data access
├── packages/
│   ├── types/                shared TS models (Product, Order, Cart…)
│   ├── validation/           zod schemas + business constants + status machine + order numbers
│   ├── api-client/           typed fetch client (web/admin → api)
│   ├── ui/                   shared primitives
│   └── config/               tsconfig base
├── database/
│   ├── prisma/schema.prisma  canonical relational model (Postgres for Phase 2)
│   ├── sql/constraints.sql   CHECK constraints Prisma cannot express
│   ├── seeds/catalog.json    the catalogue of record (287 products, 1,971 images)
│   ├── seeds/live/           raw live-store snapshot (products, collections, membership, HTML)
│   ├── seeds/seed.ts         idempotent DB seed
│   ├── scripts/              backup.sh, restore.sh
│   └── migrations/           future prisma migration history
├── docs/                     00-overview → 11-maintenance (87 files, numbered)
├── infra/
│   ├── nginx/noor.conf     single-VPS reverse proxy (optional path)
│   ├── monitoring/           health.sh (one-shot), uptime.sh (loop + alerts)
│   └── scripts/deploy.sh     verify → build → backup → deploy → health
├── tests/
│   ├── unit/                 pricing, validation, catalogue, order numbers
│   ├── integration/          orders service, api routes (real HTTP), webhook, search, admin session
│   ├── e2e/                  smoke.mjs (no deps) + playwright spec
│   ├── fixtures/             sample payloads
│   ├── performance/          budgets + lighthouse notes
│   └── security/             manual checklist + header probe
├── scripts/
│   ├── build-catalog.mjs     live snapshot → catalog.json (+ app copies)
│   ├── verify-catalog.mjs    CI gate (snapshot parity: galleries, descriptions, sizes, counts)
│   ├── catalog-sync/
│   │   ├── fetch-live.mjs    Shopify JSON + membership + page HTML → database/seeds/live/
│   │   └── (chalao: npm run catalog:sync ya GitHub Actions → Catalog sync)
│   ├── lib/sizes.mjs         size normalisation (shared)
│   └── setup.sh              first-run bootstrap
├── .claude/skills/           15 project skills (each with SKILL.md)
├── agent-guides/             6 human/agent walkthroughs
├── .github/workflows/        ci.yml, deploy.yml, catalog-sync.yml
├── docker-compose.yml        local full stack
└── turbo.json                task graph
```

## Rules of placement

| Cheez | Kahan |
| --- | --- |
| Naya page/route | `apps/<app>/src/app/...` |
| Shared business rule | `packages/validation/index.ts` (ek hi jagah) |
| Shared type | `packages/types/index.ts` |
| Server-only data access | `apps/web/src/lib/*.ts` (web), `apps/api/src/config/data.ts` (api), `apps/admin/src/lib/data.ts` (admin) |
| Product data | `database/seeds/catalog.json` (generated — `npm run catalog:build`) |
| Naya product/live data | `npm run catalog:sync` (Shopify se snapshot, phir build) |
| GST/tax rule | `packages/validation/index.ts` (`apparelGstRate`, `splitTax`) |
| Docs | `docs/<numbered-folder>/` |
| Deployment glue | `infra/` |
| Test | `tests/` (unit/integration/e2e) |

## Kyun alag-alag apps

Admin ka code customer ke browser me kabhi nahi jaata, aur api ko mobile/partner clients ke liye
stable contract chahiye. Teeno ek dusre ko import nahi karte — sirf `packages/*` shared hai
(`docs/03-architecture/adr/0006-separate-admin.md`, `0001-monorepo.md`).
