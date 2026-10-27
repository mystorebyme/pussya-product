# ADR 0006 — Separate admin application

**Status:** Accepted

## Context

Pehle admin components storefront ke andar the (`apps/web/src/components/admin/*`) jisse customer bundle
me admin code jaata tha aur auth logic public app me rehti thi.

## Decision

`apps/admin` alag Next.js app, apna deploy, apna domain (`admin.noorethnicwear.in`), `noindex`, cookie session.

## Consequences

- Positive: customer bundle clean, admin rollback independent, security boundary clear.
- Negative: do deploy units; shared UI code `packages/ui` se aana chahiye (Phase 2 me migrate).
