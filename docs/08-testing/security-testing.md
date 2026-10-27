# Security testing

## Automated

| Check | Tool | Frequency |
| --- | --- | --- |
| Dependency CVEs | `npm audit --omit=dev` | CI + weekly |
| Secret scan | `grep -rE 'sk_live|rzp_live'` + gitleaks | pre-commit |
| Type safety | `tsc --noEmit` | CI |
| Header check | curl assertions in CI | deploy |
| Open redirect | manual (login `next` param whitelist) | release |

## Manual checklist (release)

1. `POST /api/orders` with `price: 1` → server total ignore karta hai.
2. `POST /api/orders` with `qty: 999` → 400.
3. `GET /api/orders` without token → 401.
4. `PATCH /orders/:n/status` with `delivered` from `placed` → 409.
5. Cookie `noor_admin` tamper (payload badlo, signature same) → redirected to login.
6. Webhook without signature / wrong secret → 401, order not paid.
7. `/api/search?q=<script>` → plain text, no reflection.
8. Admin `/` without cookie → 307 login; with expired cookie → 307.
9. `curl` admin pages with `?next=https://evil.com` → local path only.
10. `/orders/NE-FAKE123` → 404 friendly (no stack trace).
11. Rate limit: 11 order POSTs in a minute → 429.
12. Response headers contain HSTS, nosniff, CSP.

## Logging verification

- 5xx responses me stack client ko nahi.
- PII masked in logs.

## Pre-launch

Basic external scan (OWASP ZAP baseline) staging par; findings triage `PROGRESS.md` me.
