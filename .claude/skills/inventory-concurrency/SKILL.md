---
name: inventory-concurrency
description: Handle stock safely — atomic writes, oversell prevention, COD holds, sold-out UI, and the Phase 2 DB locking plan.
---

# Inventory & concurrency

## Phase 1 model

- Stock per product (size-wise Phase 2). `.data/overrides.json` me owner set karta hai.
- Default 10 per size on seed.
- Orders price/stock dono server par check hote hain, par **stock decrement Phase 1 me manual**
  (owner packing ke waqt dekhta hai) — oversell risk documented (`docs/02-planning/risk-register.md` R7).

## Atomic write pattern (mandatory)

```ts
const tmp = `${file}.${process.pid}.tmp`;
fs.writeFileSync(tmp, JSON.stringify(rows, null, 2));
fs.renameSync(tmp, file);      // rename atomic on same fs
```

Never `fs.writeFileSync(file, …)` directly — crash par half file.

## Read-modify-write (single instance)

```ts
const rows = readRows("orders.json");
rows.unshift(order);
writeRows("orders.json", rows);
```

Multi-instance pe yeh unsafe hai — isliye Phase 1 single instance
(`docs/03-architecture/system-architecture.md`).

## Phase 2 (Postgres)

```sql
UPDATE variants SET stock = stock - $1
WHERE id = $2 AND stock >= $1
RETURNING stock;         -- 0 rows = oversold
```
+ `SELECT … FOR UPDATE` in transaction; reservation TTL 15 min (`stock_reservations`).

## UI rules

- `stock === 0` → size button disabled + "Sold out".
- Whole product sold out → card badge + PDP CTA disabled.
- Cart me item sold out ho jaye → line par warning, checkout block.
- Kabhi "-1 left!" fake urgency nahi.

## Admin

`/inventory` par size-wise stock, bulk update, low-stock (<3) highlight, audit entry per change.
