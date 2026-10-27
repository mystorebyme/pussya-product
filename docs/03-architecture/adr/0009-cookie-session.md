# ADR 0009 — HMAC cookie session (no JWT library)

**Status:** Accepted

## Context

Admin ke liye sirf ek user (owner) hai. JWT lib ka dependency aur algorithm-confusion risk avoid karna tha.

## Decision

`noor_admin` cookie = `base64url(payload).HMAC-SHA256(payload, secret)`. Payload me `sub`, `role`, `exp` (8h).
Verify `timingSafeEqual` se. httpOnly + sameSite=lax + secure in prod.

## Consequences

- Positive: ~40 lines, dependency-free, secret rotate = sab logout.
- Negative: server-side revocation nahi (session store Phase 2 me).
