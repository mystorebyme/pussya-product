# Non-functional requirements

## Performance

| Metric | Target | Kaise |
| --- | --- | --- |
| Home LCP (mobile 4G) | < 2.5s | static HTML, CDN images `?width=`, no font blocking |
| PDP TTFB | < 200ms | prerendered (287 pages) |
| Collection first paint | < 2s | 24 products server, baaki on demand |
| Client JS (home) | < 200KB gzip | catalog client bundle me nahi (search API) |
| Image weight | card 40–90KB | Shopify CDN width param |

## Reliability

- Uptime target 99.5% (Phase 1: managed hosting).
- Order write atomic (tmp file + rename) — partial JSON nahi.
- Idempotency: duplicate submit se ek hi order.
- Webhook: signature + dedupe; failure par retry safe.

## Security

- Secrets sirf env me; repo me `.env.example`.
- Admin cookie: httpOnly, sameSite=lax, secure in prod, 8h expiry, HMAC signed.
- Rate limit: orders 10/min/IP, contact 5/min.
- Webhook HMAC timing-safe compare.
- Uploads: presigned URL (file API se nahi guzarti) — Phase 2 activation.

## Usability / Accessibility

- Mobile-first 360px; touch targets ≥ 40px.
- Contrast ≥ 4.5:1 body text; focus ring visible.
- Sabhi images par alt; form fields par label.
- Empty/loading/error state har list par.

## Compliance (India)

- DPDP: consent notice, privacy page, erasure request process.
- GST: prices inclusive, GSTIN + HSN invoice par (Phase 2 PDF).
- Consumer Protection (E-Commerce) Rules: seller identity, contact, grievance timeline (48h ack, 15 days resolve).

## Maintainability

- 5-file module pattern (api), shared validation package, docs-first changes.
- Har decision `DECISIONS.md`/ADR me; har galti `agent-guides/mistakes-log.md` me.
