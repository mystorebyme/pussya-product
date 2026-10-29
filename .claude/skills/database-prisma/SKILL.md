---
name: database-prisma
description: Work with database/schema.prisma, SQL constraints, seeds, migrations and JSON→Postgres cutover. Phase 1 uses JSON files; this skill is for schema truth and the Phase 2 path.
---

# Database & Prisma

## Layout

```
database/
├── prisma/schema.prisma     # canonical model (Phase 2 runtime)
├── sql/constraints.sql      # CHECKs Prisma express nahi kar sakta
├── seeds/seed.ts            # catalogue → DB (idempotent upsert)
├── seeds/catalog.json       # build artifact (287 products)
├── scripts/backup.sh        # .data snapshot
├── scripts/restore.sh       # restore + validate
└── migrations/              # prisma migrate history
```

## Phase 1 reality

Runtime store = `.data/*.json` (orders, settings, overrides, audit, messages).
`apps/api/src/config/data.ts` ek interface deta hai (`readRows`/`writeRows`); Phase 2 me yahi
Prisma repository se implement hoga — service layer untouched.

## Prisma workflow

```bash
npx prisma format --schema database/prisma/schema.prisma
npx prisma validate --schema database/prisma/schema.prisma
npx prisma migrate dev --name add_invoices --schema database/prisma/schema.prisma
npx prisma migrate deploy --schema database/prisma/schema.prisma    # prod
npx tsx database/seeds/seed.ts
```

## Model rules

1. Money `Int` paise (not Decimal/float).
2. `orderNumber` unique + indexed; `handle` unique per product.
3. Order items snapshot title/price/image (FK ke saath copy bhi).
4. Soft delete where money involved (`archivedAt`).
5. Timestamps `@default(now())` + `@updatedAt`.
6. Enums Prisma me (OrderStatus, PaymentStatus, PaymentMethod).
7. Indexes: `Order.status`, `Order.createdAt`, `Product.handle`, `OrderItem.orderId`.

## Constraints (SQL)

`price > 0`, `compare_at_price IS NULL OR compare_at_price > price`, `quantity BETWEEN 1 AND 10`,
`total >= 0`, `order_number ~ '^NE-[A-Z0-9]{6,12}$'`.

## Backup

```bash
bash database/scripts/backup.sh    # .data/backups/*.json
bash database/scripts/restore.sh .data/backups/orders-<ts>.json
```

Phase 2: `pg_dump -Fc` daily + monthly retention, restore rehearsal monthly
(`docs/11-maintenance/backup-restore.md`).
