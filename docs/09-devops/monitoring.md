# Monitoring & alerting

## Signals

| Signal | Source | Threshold | Alert |
| --- | --- | --- | --- |
| Uptime | external ping (`/api/health`, `/api/v1/health`) | 2 fails | email/WhatsApp |
| 5xx rate | host logs | > 1% in 5 min | email |
| Order failures | API logs `code` | > 3 in 10 min | email |
| Webhook failures | logs `INVALID_SIGNATURE` / 5xx | any | email |
| Payment success rate | Razorpay dashboard | < 85%/day | daily review |
| LCP | Vercel Speed Insights / Lighthouse CI | > 2.5s | weekly report |
| Disk (`.data`) | Render metrics | > 70% | email |
| Build failures | CI | any on main | email |

## Logs

- API: JSON lines `{ ts, level, requestId, route, status, ms, msg }`.
- Retention: host default (7–30 din). Phase 2: Better Stack / Axiom.
- Sensitive fields masked before log.

## Dashboards

1. **Ops** — orders today, revenue, COD vs prepaid, pending payments, failed webhooks.
2. **Admin dashboard** (`/`) — same KPIs owner ke liye.
3. **Health** — `/api/health` returns `{ status, catalogueCount, uptime, version }`.

## Error tracking (Phase 2)

Sentry (web + api), sample 20%, source maps uploaded at build, PII scrub on.

## Review cadence

Daily 2-min check (orders, payments, errors). Weekly: perf + error trend. Monthly: capacity + cost.
