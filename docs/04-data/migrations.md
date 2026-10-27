# Migrations

## Phase 1 (no database)

Catalogue rebuild = "migration":

```bash
npm run catalog:build          # regenerate database/seeds/catalog.json
cp database/seeds/catalog.json apps/web/src/data/catalog.json
cp database/seeds/catalog.json apps/admin/src/data/catalog.json
```

JSON file format ke liye `schemaVersion` field rakho; reader purane shape ko handle kare.

## Phase 2 (Postgres/Prisma)

| Step | Command |
| --- | --- |
| Schema edit | `database/prisma/schema.prisma` |
| Dev migrate | `npx prisma migrate dev --name add_invoices` |
| Prod apply | `npx prisma migrate deploy` (deploy step, kabhi `db push` prod me nahi) |
| Seed | `npx tsx database/seeds/seed.ts` (idempotent upsert on `handle`) |

### Rules

1. Har migration reversible ya forward-only with backup (documented).
2. Column drop = 2 releases (deprecate → drop).
3. Data backfill alag script (`database/scripts/backfill-*.ts`), migration ke baad chalti hai.
4. `database/migrations/` git me commit hoti hai; prod-only manual SQL allowed nahi.

## Cutover from JSON → Postgres

1. `prisma migrate deploy`.
2. Import `.data/orders.json` via `database/scripts/import-json.ts` (orderNumber unique, audit preserve).
3. Dual-write flag `PERSISTENCE=json|postgres` — ek sprint dono, compare counts.
4. Read switch + 7 din rollback window.
