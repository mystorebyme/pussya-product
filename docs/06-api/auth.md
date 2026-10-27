# API authentication

## Public

`GET /health`, `/products*`, `/collections`, `/catalog/meta`, `GET /orders/:orderNumber` — no auth.
Order number high-entropy (8 chars from 34-symbol alphabet ≈ 1.7e12) hai, enumeration impractical;
rate limit 30 req/min/IP anyway.

## Admin (Bearer)

```
Authorization: Bearer <ADMIN_API_TOKEN>
```

- Token ≥ 32 random bytes, env me, kabhi client bundle me nahi.
- Mismatch → `401 UNAUTHORIZED`. Missing → `401`.
- Production me per-user tokens Phase 2 (users table + hashed token).

## Webhook

`POST /webhooks/razorpay` — `x-razorpay-signature: <hex HMAC-SHA256(rawBody, RAZORPAY_WEBHOOK_SECRET)>`.
Verify raw body par (json parse se pehle), `crypto.timingSafeEqual`. Fail → `401`.

## Storefront route handlers

`apps/web/src/app/api/*` — internal. `GET /api/orders` (list) Bearer `ADMIN_API_TOKEN` maangta hai.
`POST /api/orders` public hai par rate-limited + idempotent.

## Session (admin app)

Cookie `noor_admin` (HMAC, 8h, httpOnly, sameSite=lax). Middleware sab `(admin)` routes par check karta hai;
missing/invalid → `307 /login?next=…`.

## Rotation

| Secret | Kab | Kaise |
| --- | --- | --- |
| `ADMIN_API_TOKEN` | 90 din | naya env, restart api, purana revoke |
| `ADMIN_SESSION_SECRET` | leak par turant | rotate → sab admin logout |
| `RAZORPAY_KEY_SECRET` | 180 din / leak | dashboard se regenerate |
| `RAZORPAY_WEBHOOK_SECRET` | webhook endpoint change par | dashboard me naya secret |
