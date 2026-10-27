# Incidents log

Template:

```
## INC-YYYYMMDD-01 — <title>
- Severity: P0/P1/P2
- Detected: <time, how>
- Impact: <orders/users/duration>
- Cause: <root cause>
- Fix: <what we did>
- Prevention: <test/doc/alert>
```

## Known open

- **INC-20261024-01** — Storefront product images block hoti hain jab CDN SSL restricted network par fail hota hai
  (preview sandbox). Severity P2. Mitigation: placeholder SVG + Phase 2 self-host images on R2.
- **INC-20261024-02** — `.data` persistence single-instance only. Severity P2 (design limit).
  Mitigation: Postgres migration scheduled.

## Closed

- **INC-20261024-00** — Production build failed on `@/db` (drizzle) import in order page during migration.
  Fixed by porting to `@/lib/orders`; prevention: typecheck gate.
- **INC-20261023-01** — Admin `next build` root se fail (workspace resolution).
  Fixed by building from `apps/admin`.

## Postmortem rule

P0 → 48h ke andar written postmortem + one preventive action shipped.
P1 → action item next sprint. P2 → backlog.
