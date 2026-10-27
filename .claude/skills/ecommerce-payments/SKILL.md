---
name: ecommerce-payments
description: Integrate and operate third-party payments (Razorpay) — payment links, webhook verification, idempotent state changes, refunds, and COD fallback.
---

# Payments (third party)

Policy: **provider pays ka kaam kare** — hum card data nahi dekhte, sirf link + webhook.

## Flow

```
POST /orders ──► order (paymentStatus pending)
      │
      ├─ POST /api/v1/payments/link ──► provider short_url
      │
      └─ user pays ──► webhook payment_link.paid ──► verify ──► markPaid ──► email
```

## Hard rules

1. **Webhook raw body** par HMAC verify — `express.json()` se pehle mount (`/webhooks` raw router).
2. `crypto.timingSafeEqual` use karo, `===` nahi.
3. `event.id` dedupe (`.data/webhook-events.json`) — duplicate par `200 {duplicate:true}`.
4. Amount provider vs order cross-check; mismatch = alert + 400.
5. Status change idempotent: already paid → no-op.
6. Browser redirect success **proof nahi** hai — sirf webhook/server verify.
7. Refund provider dashboard/API se; order note + `paymentStatus=refunded` + audit.
8. Keys: `RAZORPAY_*` server-only. `NEXT_PUBLIC_` me kabhi secret nahi.
9. Provider down? UI me manual UPI fallback (`settings.upiId`) + COD.
10. Koi card/CVV/UPI PIN store nahi.

## COD

- `subtotal <= 350000` paise; fee `5000`.
- Above limit → `cod_not_allowed` error copy: "COD sirf Rs. 3,500 se kam orders par available hai."
- Delivery par `paymentStatus` `paid`.

## Test

```bash
# signature
node -e "const c=require('crypto');console.log(c.createHmac('sha256',process.env.S).update(body).digest('hex'))"
curl -X POST localhost:4000/api/v1/webhooks/razorpay -H "x-razorpay-signature: $SIG" --data-binary @event.json
```

## Files

`apps/api/src/modules/payments/*`, `apps/api/src/webhooks/razorpay.webhook.ts`,
`apps/web/src/app/api/webhooks/razorpay/route.ts`, `apps/web/src/lib/payments.ts`,
`apps/web/src/app/api/payments/route.ts`.
