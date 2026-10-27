# Phone OTP (Firebase) — checkout verification

> Setup (Firebase project, env vars, SMS quota): [`docs/09-devops/firebase-otp.md`](../09-devops/firebase-otp.md).

Har order se pehle customer ka mobile number verify hota hai. SMS Firebase
Authentication (Phone provider) bhejta hai, verification server par hoti hai, aur
order ek short-lived signed token ke saath hi banta hai.

## Kyun Firebase

- India me SMS delivery, retry aur rate-limit Firebase ka kaam hai — humein DLT
  template, sender ID ya telco integration maintain nahi karna padta.
- Client SDK invisible reCAPTCHA handle karta hai (spam/abuse se bachav).
- Hum sirf do cheezein karte hain: **ID token verify** aur **phoneToken issue**.

## Flow

```
customer                storefront (browser)              server (Next route)            Firebase
   │  phone daala              │                                  │                          │
   │──────────────────────────>│ POST /api/otp/start              │                          │
   │                           │─────────────────────────────────>│ mode = firebase          │
   │                           │ signInWithPhoneNumber(+91…)       │                          │
   │                           │─────────────────────────────────────────────────────────────>│
   │   SMS OTP                 │                                  │                          │
   │<────────────────────────────────────────────────────────────────────────────────────────│
   │  OTP type kiya            │ confirmation.confirm(code) → idToken                        │
   │                           │ POST /api/otp/verify {phone, idToken}                       │
   │                           │─────────────────────────────────>│ accounts:lookup (API key)│
   │                           │                                  │─────────────────────────>│
   │                           │      { phoneToken } (HMAC, 15 min)│                          │
   │                           │<─────────────────────────────────│                          │
   │  Place order              │ POST /api/orders { ..., phoneToken }                        │
   │──────────────────────────>│─────────────────────────────────>│ token verify + phone match│
```

`phoneToken` = `base64url({phone, exp}).HMAC-SHA256` — server ke paas secret hai,
customer badal nahi sakta. Order API token ka phone aur form ke phone match karta hai.

## Setup (one-time, ~10 minute)

1. [Firebase console](https://console.firebase.google.com) → **Add project** → naam
   `noor-clothing`.
2. **Build → Authentication → Get started → Sign-in method → Phone → Enable.**
3. **Project settings → General → Your apps → Web app add karein** → config milta hai.
4. **Authentication → Settings → Authorized domains** me `noorethnicwear.in`,
   `noorethnicwear.in` aur preview domain add karein (localhost pehle se hota hai).
5. Env set karein (hosting dashboard + local `.env.local`):

```bash
NEXT_PUBLIC_FIREBASE_API_KEY=AIza…
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=noor-clothing.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=noor-clothing
NEXT_PUBLIC_FIREBASE_APP_ID=1:1234567890:web:abc123
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1234567890
FIREBASE_API_KEY=AIza…            # server-side token verification ke liye
FIREBASE_PROJECT_ID=noor-clothing
OTP_TOKEN_SECRET=$(openssl rand -hex 32)
REQUIRE_PHONE_OTP=1
OTP_DEV_MODE=off                  # production me dev codes kabhi nahi
```

6. Deploy ke baad ek test number se checkout karke OTP verify karein.

> **Cost:** Firebase phone auth ka free tier 10 SMS/day/project deta hai; uske baad
> Blaze plan (pay-as-you-go) chahiye. India ke SMS ~₹0.30–0.60 per verification.

> **Abuse control:** ek phone number par 5 attempts (dev mode), Firebase khud
> per-number/per-IP throttle karta hai. `phoneToken` 15 minute me expire hota hai.

## Bina Firebase ke (dev / sandbox)

- Firebase config na ho to `OTP_DEV_MODE` (default `on`) dev mode chalta hai:
  server 6-digit code banata hai, response me `devCode` deta hai aur UI usko
  dikha deta hai. **Ye sirf non-production ke liye hai** — production me
  `OTP_DEV_MODE=off` rakhein, warna koi bhi OTP bypass kar sakta hai.
- `REQUIRE_PHONE_OTP=0` karne par order bina verification ke chal jaayega
  (default: Firebase configured ho to `1`, warna `0`).

## Files

| File | Kaam |
| --- | --- |
| `apps/web/src/lib/firebase-client.ts` | browser Firebase init (public config) |
| `apps/web/src/lib/otp.ts` | mode decide, Firebase ID token verify, phone token, dev codes |
| `apps/web/src/lib/phone-token.ts` | pure HMAC token logic (unit tested) |
| `apps/web/src/app/api/otp/{start,verify,status}/route.ts` | API endpoints |
| `apps/web/src/components/phone-otp.tsx` | checkout ka OTP widget |
| `apps/web/src/app/api/orders/route.ts` | order par phoneToken enforce |

## Tests

- `tests/unit/otp.test.ts` — token round-trip, tampering, expiry.
- `tests/e2e/smoke.mjs` — dev OTP flow, wrong-OTP rejection, order without token blocked.

## Troubleshooting

| Symptom | Wajah / fix |
| --- | --- |
| `auth/unauthorized-domain` | Authorized domains me current host add nahi hai |
| `auth/billing-not-enabled` | Blaze plan + SMS quota chahiye |
| OTP aaya hi nahi | DND/Truecaller, ya Firebase SMS region quota |
| `phone_verification_required` | Checkout se token nahi gaya — widget verify hua ya nahi dekhein |
| `phone_mismatch` | Form ka number badal diya lekin dobara verify nahi kiya |
