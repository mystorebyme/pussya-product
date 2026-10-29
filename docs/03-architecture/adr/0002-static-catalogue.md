# ADR 0002 — Build-time static catalogue

**Status:** Accepted

## Context

287 products aur 9 collections read-heavy hain, write almost zero (owner admin se override karta hai).
Har request par DB/API call se TTFB badhta hai aur uptime dependency banti hai.

## Decision

`catalog.json` build artifact ke roop me ship hota hai; server components build ke waqt 287 PDPs prerender karte hain.
Admin ke price/stock overrides `.data/overrides.json` me alag layer hain.

## Consequences

- Positive: PDP TTFB ~50ms, images ke alawa zero runtime dependency, SEO ke liye poori HTML.
- Negative: naya product add karne par rebuild chahiye (Phase 1 me acceptable: 287 fixed SKUs).
- Revisit: Phase 2 me DB + ISR/webhook revalidation.
