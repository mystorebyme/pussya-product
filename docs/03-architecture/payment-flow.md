# Payment flow

## Prepaid (Razorpay hosted)

```
Customer            Web/API                  Razorpay              Order store
   │  place order ────►│                        │                     │
   │                  │ validate + recompute    │                     │
   │                  │ ─── create order ──────────────────────────────►│ (status placed, paymentStatus pending)
   │                  │ ─── payment link ─────►│                     │
   │◄── redirect ─────│◄── short_url ─────────│                     │
   │  pays on Razorpay│                        │                     │
   │                  │◄── webhook payment_link.paid ────────────────│
   │                  │  verify HMAC + dedupe   │                     │
   │                  │ ─── mark paid ───────────────────────────────►│ (confirmed, paid)
   │                  │ ─── queue email ────────│                     │
   │◄── order page shows Paid ─────────────────────────────────────────│
```

## COD

Order placed → `paymentStatus: cod` → dispatch → on delivery `paid` (admin status `delivered`).

## Rules

1. **Browser redirect par bharosa nahi** — payment sirf webhook / server verify se confirm hota hai.
2. Webhook: signature verify (HMAC-SHA256, timing-safe), event-id dedupe, turant 2xx.
3. Har attempt ka apna record (`PaymentAttempt`) — amount mismatch debugging ke liye.
4. Refund provider API se; `paymentStatus: refunded` + audit entry + note.
5. Timeout: 30 min me payment na aaye to order hold; 24h baad support call.
6. Amount kabhi client se nahi — server catalogue price se compute.

## States

`pending → paid | failed`, `pending → expired (24h)`, `paid → refunded`, `cod → paid`.
