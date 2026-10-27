# ADR 0005 — Tailwind (storefront) + plain CSS (admin)

**Status:** Accepted

## Context

Storefront ka design frequently iterate hota hai; admin internal tool hai jahan 15 screens hain
aur bundle size matter nahi karta utna.

## Decision

Storefront: Tailwind 4 utilities + CSS tokens. Admin: ek `globals.css` (~300 lines) with `.card`, `.table`, `.badge` classes.

## Consequences

- Positive: storefront me fast iteration, admin me zero build plugins aur chhota mental overhead.
- Negative: do styling approaches maintain karni padti hain.
