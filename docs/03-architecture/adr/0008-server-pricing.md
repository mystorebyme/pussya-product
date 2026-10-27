# ADR 0008 — Server-side price computation

**Status:** Accepted

## Context

Client cart localStorage me hai — price tamper karna trivial hai.

## Decision

`POST /api/orders` sirf `handle + size + qty` leta hai; price server catalogue se aata hai. Client ka bheja
price ignore hota hai. Discount + COD fee bhi server par.

## Consequences

- Positive: financial safety, coupon rules ek jagah.
- Negative: client ko server total dikhana padta hai (order page par authoritative total).
