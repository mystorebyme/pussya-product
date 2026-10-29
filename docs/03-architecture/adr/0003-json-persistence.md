# ADR 0003 — JSON file persistence for Phase 1

**Status:** Accepted

## Context

Launch ke waqt order volume low hai (din ke 5-30 orders). Postgres ka operational cost (migrations,
backups, connection limits) abhi justify nahi hota.

## Decision

Orders, messages, settings, overrides, audit `.data/*.json` me. Writes atomic (tmp file + rename),
reads cached with mtime check. Sab IO `lib/*.ts` service layer me — routes kabhi `fs` touch nahi karte.

## Consequences

- Positive: zero infra, backup = file copy (`database/scripts/backup.sh`), debuggable.
- Negative: single instance only; concurrent multi-writer nahi; query/filter in-memory.
- Revisit: DB migration trigger — 100+ orders/day, multi-instance, ya analytics queries.
