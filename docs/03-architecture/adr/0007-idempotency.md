# ADR 0007 — Idempotency-Key on order creation

**Status:** Accepted

## Context

Checkout form double-submit, mobile network retry, aur user ka browser back-forward — teeno se duplicate
order aur double COD risk tha.

## Decision

Client har checkout attempt par UUID bhejta hai (`Idempotency-Key`). Server key → order number map karta hai;
same key dobara aane par wahi order 200 ke saath return hota hai.

## Consequences

- Positive: retry-safe, inventory consistent.
- Negative: key store karna padta hai (`.data/idempotency.json`, TTL 7 din).
