# Payments security & PCI

## Scope

Hum card data kabhi touch nahi karte — Razorpay hosted page/checkout par user pay karta hai.
Isliye **SAQ A** (lowest PCI burden) applicable; koi card field humare UI me nahi.

## Webhook hardening

1. Raw body (json parse se pehle) par HMAC-SHA256 verify.
2. `crypto.timingSafeEqual` — length mismatch bhi handle.
3. `event.id` dedupe (`.data/webhook-events.json`), repeat event par 200 + `duplicate: true`.
4. Amount + `orderNumber` cross-check order se; mismatch → 400 + alert.
5. Replay window: event timestamp 10 min se purana ho to bhi process (delivery retry legit hai),
   par dedupe mandatory.
6. Idempotent processing: paid already → no-op.

## Refunds

Admin provider dashboard se refund kare (Phase 1) → order note + `paymentStatus=refunded` + audit.
Phase 2: API se refund + webhook `refund.processed`.

## Fraud controls

- COD cap Rs. 3,500; above prepaid only.
- Same phone 3+ COD orders in 24h → manual review flag.
- Pincode/phone format validation server-side.
- Rate limits per IP on order creation.

## What we never store

Card number, CVV, expiry, UPI PIN, bank credentials, full payment tokens.
Provider ids only (`pay_xxx`, `plink_xxx`) — useful for support.
