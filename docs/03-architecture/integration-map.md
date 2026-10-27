# Integration map

| System | Direction | Auth | Used for | Failure mode |
| --- | --- | --- | --- | --- |
| Razorpay | out + inbound webhook | key id/secret + webhook secret HMAC | prepaid payments, refunds | order `pending`, UI par "pay via UPI" fallback |
| Shopify CDN | out (image URLs) | none (public URLs) | product images | placeholder SVG |
| Resend | out | API key | order emails | queue + retry, log mode me drop |
| WhatsApp (wa.me) | out (link only) | none | support, COD confirm | user manually message kare |
| Shiprocket | out (Phase 2) | token | AWB + tracking | manual AWB entry |
| Google Analytics / Plausible | out | site id | traffic | non-blocking script |
| Search Console | out | DNS/HTML verify | indexing | sitemap manual submit |

## Webhook endpoints

| Provider | Path | Verify | Idempotency |
| --- | --- | --- | --- |
| Razorpay | `POST /api/v1/webhooks/razorpay` | `x-razorpay-signature` HMAC-SHA256(raw body) | `event.id` → `webhook_events` |

## Env vars (summary)

`NEXT_PUBLIC_SITE_URL`, `ORDERS_API_URL`, `ADMIN_API_TOKEN`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `WHATSAPP_NUMBER`. Poori list root `.env.example` me.
