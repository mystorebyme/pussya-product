# Payments — backend verified, prepaid only

## Kya hota hai jab customer pay karta hai

1. **Order** banta hai → `paymentStatus: pending`, `status: placed`.
   Price server par dobara calculate hoti hai (client ka bheja amount kabhi trust nahi hota).
2. **Payment intent** (`POST /api/payments/intent`) — order ka phone OTP token verify hone ke
   baad hi banti hai. Gateway se server-side order banta hai aur customer ko UPI QR/intent
   dikhta hai.
3. **Webhook** (`POST /api/payments/webhook/[gateway]`) —
   - raw body ka HMAC-SHA256 signature verify,
   - phir gateway API se payment **dobara fetch** (replay se bachne ke liye),
   - amount order ke total se match,
   - tabhi `payment.verified` + order `confirmed`.
4. **Status** (`GET /api/payments/status?order=…&phoneToken=…`) — customer poll karta hai.
   `paid` sirf backend likh sakta hai; frontend se "paid" bhejne ka koi raasta nahi.

Koi bhi client-side flag, localStorage ya URL se order confirm nahi hota.

## 3 gateway accounts (failover)

Env me 3 tak accounts:

```
RAZORPAY_KEY_ID_1 / RAZORPAY_KEY_SECRET_1 / RAZORPAY_WEBHOOK_SECRET_1
RAZORPAY_KEY_ID_2 / RAZORPAY_KEY_SECRET_2 / RAZORPAY_WEBHOOK_SECRET_2
RAZORPAY_KEY_ID_3 / RAZORPAY_KEY_SECRET_3 / RAZORPAY_WEBHOOK_SECRET_3
```

- Ek account fail hote hi agla try hota hai; do consecutive failures par 10 minute cooldown
  (`.data/payment-gateway-health.json`). Customer ko kuch pata nahi chalta.
- Teeno fail hon → store UPI QR (`STORE_UPI_ID`) dikhta hai, order pending rehta hai, aur
  admin **Payments** page se UTR verify karke confirm karta hai. Customer WhatsApp par
  screenshot bhi bhej sakta hai.

## Jo jaan-boojh kar nahi banaya

Kisi third-party wallet/merchant website me **saved cookies se auto-login** ya 3 accounts
ke credentials automate karke chalana nahi banaya gaya:

- wo us provider ki terms todta hai aur account block/criminal risk banata hai,
- credentials/cookies leak hone par poora paisa aur data risk me aata hai,
- hamare paas gateway ka official API + webhook hai, jo isi kaam ko legally aur safely karta hai.

Iske bajaye wahi business outcome (QR + auto status + 3-account failover + backend confirm)
official gateway API se implement kiya gaya hai.

## Secrets

- Gateway secrets sirf server env me (repo me kabhi nahi).
- DB me `payment_gateways.secret_enc` (encrypted) — plaintext/cookie nahi.
- Admin session httpOnly + signed; password timing-safe compare.
- CI logs me keys kabhi print nahi hote.
