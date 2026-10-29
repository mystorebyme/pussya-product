# Database

## Phase 1 (aaj chal raha hai)

- **Catalogue**: `seeds/catalog.json` — build artifact. Source: noorethnicwear.in se scrape kiya gaya
  (287 products, 9 collections), `npm run catalog:build` se regenerate hota hai.
- **Orders / messages**: `.data/*.json` (repo root) — file store, atomic write ke saath.
  Storefront, admin aur api teeno **ek hi file** padhte hain, isliye order turant admin me dikhta hai.
- Database ki zaroorat nahi → deploy simple, cost zero, TTFB fast.

Kyun: 287 products ke saath read-only catalogue ke liye DB round-trip waste hai. Static JSON
`generateStaticParams` ke saath build hota hai, isliye product pages prerendered milte hain.

## Phase 2 (schema ready hai)

`prisma/schema.prisma` production schema hai: users, addresses, variants (size-wise stock),
payment attempts, webhook events, invoices (GST), reviews, consents.

```bash
# 1. Postgres up
docker run -e POSTGRES_PASSWORD=postgres -e POSTGRES_DB=noor -p 5432:5432 postgres:16-alpine

# 2. env
export DATABASE_URL="postgresql://postgres:postgres@localhost:5432/noor"

# 3. schema + safety constraints
npx prisma migrate dev --schema database/prisma/schema.prisma --name init
psql "$DATABASE_URL" -f database/sql/constraints.sql

# 4. seed
npx tsx database/seeds/seed.ts
```

## Migration rules

1. Migration file kabhi edit nahi — naya migration banao.
2. Destructive change (column drop) 2 steps me: pehle code se hatao, deploy, phir column drop.
3. Paisa column hamesha `Int` (paise). `Float`/`Decimal` money ke liye nahi (GST rounding).
4. Har migration ke baad `constraints.sql` dobara chalayein (checks idempotent hain).
5. Backup: `BACKUP_DIR=./backups ./scripts/backup.sh` (shift ke pehle + daily cron).

## Backup / restore

```bash
BACKUP_DIR=./backups ./scripts/backup.sh
./scripts/restore.sh ./backups/noor-20261024-030000.dump
```

RPO 24h, RTO 2h. Neon/Supabase use karein to PITR built-in hota hai — usi ko primary rakhein.
