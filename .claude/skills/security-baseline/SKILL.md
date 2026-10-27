---
name: security-baseline
description: Security non-negotiables for this store — auth, secrets, headers, input validation, rate limits, PII, and the pre-release checklist.
---

# Security baseline

## Never

1. Secret client bundle me (`NEXT_PUBLIC_*` = public).
2. Client price/qty trust (server recompute).
3. Raw HTML render for user input (React escaping; only catalogue HTML).
4. Admin route without session (middleware + `requireSession()` in actions).
5. Webhook accept without HMAC verify.
6. PII in logs (mask phone/email).
7. `eval`/`new Function` on user input.
8. Path from user input (`policy slug` whitelist regex).

## Always

- zod validation server-side (same schema client + server).
- Rate limit: `POST /orders` 10/min/IP, login 5/15min, search 60/min.
- Atomic writes for money data.
- `idempotency` on order creation.
- Error responses without stack traces.
- Admin `noindex` + `X-Frame-Options: DENY`.

## Headers (target)

`HSTS`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`,
`Permissions-Policy` minimal, CSP (report-only first) allowing only Shopify CDN + Razorpay.

## Session

`noor_admin` cookie: HMAC-SHA256, 8h, `httpOnly`, `sameSite=lax`, `secure` prod.
Secret rotate = logout everywhere.

## Secrets checklist

```
[ ] .env gitignored; only .env.example committed
[ ] prod secrets random (32B+)
[ ] dev defaults prod me fail karein (boot check)
[ ] rotate plan documented (docs/07-security/secrets.md)
```

## Pre-release sweep

```bash
grep -rn "sk_live\|rzp_live\|BEGIN PRIVATE KEY" --exclude-dir=node_modules . | head
npm audit --omit=dev
curl -sI https://noorethnicwear.in | grep -iE "strict-transport|x-content-type|content-security"
```

Details: `docs/07-security/*`.
