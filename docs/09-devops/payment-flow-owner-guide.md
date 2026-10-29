# Payment gateway — kaise kaam karega (owner ke liye, simple bhasha)

Aap poochha: *"gateway karwa ke kaise kaam karega, payment kaise hoga, sab ok?"*
Ye poora flow hai — customer ko kya dikhega, peeche kya hota hai, aur aapko
kahan farak padega.

> Aaj ki sthiti: gateway **code me ready hai**, par aapke gateway ke 3 values
> (`youpi_pay_url`, `youpi_merchant_id`, `youpi_merchant_key`, `youpi_webhook_secret`)
> Sheet me bharne
> tak button **chhupta** rehta hai — customer ko sirf wahi purana UPI QR dikhta
> hai jo abhi dikh raha hai. Yaani kuch tootta nahi, sirf naya rasta late hai.

---

## 1. Poore flow ka naksha

```
Customer checkout (step 3)
        │
        │  "Pay ₹599 securely" dabaya
        ▼
Hamari site ka server  ──►  YouPI gateway  POST /api/v1/payments
   (amount order se)         (X-Merchant-Id + Idempotency-Key)
        │                          │
        │                          └─► { paymentId, checkoutUrl }
        ▼
youpi.js checkout modal (gateway ka apna page, iframe me)
        │
        │  customer UPI app chunta hai → UPI app khulti hai
        │  (amount + order note pehle se bhare hue)
        ▼
Bank/UPI se paisa katta hai  ──►  paisa seedha aapke merchant UPI account me
        │
        ├─ Gateway webhook bhejta hai (HMAC signed)  ──►  hamari site
        └─ Customer ke browser ko success event        ──►  hamari site
                                   │
                                   ▼
                    Server gateway se DOBARA poochhta hai:
                    "is payment ka status SUCCESS hai? amount ₹599 hi hai?"
                                   │
                  ┌────────────────┴────────────────┐
                  │ haan                            │ nahi / mismatch
                  ▼                                 ▼
        Order = CONFIRMED + PAID            Order pending/failed
        (Sheet + panel me turant)           (team ko dikhega, customer se
                                             WhatsApp par baat)
```

**Zaroori baat:** customer ke browser ka "success" akela kaafi nahi. Server
gateway se status + amount dobara verify karta hai — tab hi order confirm hota
hai. Isliye koi browser me khel kar order "paid" nahi bana sakta.

---

## 2. Customer ko step-by-step kya dikhega

| # | Customer karta hai | Screen par kya dikhta hai |
| --- | --- | --- |
| 1 | cart → checkout | delivery details form (jaisa abhi hai) |
| 2 | details bhar kar "Place order" | order number banta hai (NE-XXXXXXXX) |
| 3 | step 3 — payment | do raste: **"Pay ₹599 securely"** (gateway) aur neeche **UPI QR / UPI ID** (purana) |
| 4 | gateway button dabata hai | gateway ka checkout modal khulta hai (UPI app / card / net banking) |
| 5 | UPI app se pay karta hai | "Payment verified — aapka order confirm ho gaya" + order details |
| 6 | WhatsApp | order confirm hone par aapke Sheet me row + panel me status `confirmed` |

Agar customer modal band kar de, payment fail ho jaye, ya gateway down ho — page
wahi UPI QR / UPI ID wala rasta dikhata rehta hai. **Payment ka koi rasta kabhi
band nahi hota.**

---

## 3. Aapko (owner) kya dikhega

- **Sheet → Orders** tab: naya row — payment status `paid`, reference UTR, gateway
  `youpi`, order status `confirmed`.
- **Owner panel**: order timeline me "payment verified" + aap aage badha sakte
  hain — placed → confirmed → packed → shipped → delivered (jaisa abhi chalta hai).
- Paisa **seedha aapke merchant UPI account** me jaata hai (YouPI self-hosted hai,
  koi third-party hold nahi) — gateway sirf verify aur track karta hai.

---

## 4. Failure cases — kya hota hai

| Halaat | System kya karta hai |
| --- | --- |
| Gateway down / slow | button me "gateway available nahi" line, customer UPI QR se pay karta hai |
| Customer payment fail | order pending rehta hai, dobara try kar sakta hai |
| Customer modal band kar deta hai | order pending, UPI QR ka rasta khula |
| Webhook der se aaya | browser ke success par bhi server verify karta hai — order confirm ho jaata hai |
| Galat amount (tampering) | order **confirm nahi** hota, `ORDER_AMOUNT_MISMATCH` log hota hai, order `failed` |
| Webhook dobara aaya (retry) | duplicate delivery-id ignore — double confirm nahi hota |
| Gateway me session pehle se zinda | wahi purana checkout khulta hai (naya session nahi banta) |

---

## 5. Ab bas ye 5 values aapki taraf se

Sab value **gateway ke Merchant Admin panel** se milti hai — Settings →
**"🔑 Merchant API Keys, Webhook Endpoints & Cryptographic Secrets"** card
(`https://<gateway-host>/admin`, self-hosted par port `6001`).

| Sheet key | Kya hai | Kahan se |
| --- | --- | --- |
| `youpi_pay_url` | Gateway ka public https address | Aapka gateway deployment (jis domain par `youpi.js` khulta hai) |
| `youpi_merchant_id` | Publishable Merchant ID (UUID) | Panel → "Merchant ID / Publishable Key" → Copy |
| `youpi_merchant_key` | Secret Merchant API Key (server only) | Same card → "Secret Merchant API Key" → Copy (khali ho to **Generate / Rotate Key**) |
| `youpi_webhook_secret` | Webhook signing secret (64 hex) | Same card → "Webhook Secret" → Copy |
| `youpi_enabled` | On/off | Aapka faisla — `true` |

1. Ye 5 values **Sheet → Settings** tab me `key | value` rows me daal dein.
   Bas — 3 second me site par gateway button aa jaayega, koi redeploy nahi.
2. Panel ke **"Webhook Destination URL"** me daalein:
   `https://<aapka-domain>/api/payments/webhook/youpi` → **💾 Save Webhook Settings**.
3. **Webhook ke liye server hosting** (Vercel/Render — guide:
   `docs/09-devops/vercel-deploy.md`). GitHub Pages static hai, wahan webhook
   receive nahi ho sakta. Server ke bina payment chalega par order apne aap
   confirm nahi hoga.

Poori detail (kya galat ho sakta hai, error → fix, verify commands):
`docs/09-devops/youpi-payment-gateway.md` → section 3.

Sabse aasan rasta (har command + har button, word to word, shuru se pehle
payment tak): **`docs/09-devops/youpi-setup-word-to-word.md`**.

### Pehla test (recommended)

1. Ek chhota order khud place karein (₹499 wala product).
2. Gateway se pay karein.
3. Sheet → Orders me `paid` row aur panel me `confirmed` status dekh lein.
4. Payment fail / cancel bhi ek baar try karein — order pending rehna chahiye.

---

## 6. Dhyan rakhne wali baatein (YouPI ke apne README se)

- YouPI ek **experimental, self-hosted** gateway hai — NPCI/bank certified nahi,
  aur unka guide **≤20 transactions/day** kehta hai. Volume badhne par proper
  certified gateway (Razorpay/Cashfree/PhonePe PG) par shift karna behtar hoga —
  hamara code gateway-agnostic hai (Razorpay ka rasta pehle se maujood hai).
- Har din **bank statement se reconcile** karein; YouPI khud bhi yahi kehta hai.
- Aapka UPI QR rasta hamesha backup rahega — isliye ek gateway fail hone par
  sales nahi rukti.

---

## 7. Kya pehle se test ho chuka hai (proof)

Mock YouPI gateway ke saath poora flow chalaya gaya:

| Test | Result |
| --- | --- |
| server se session create (amount order se) | ✅ `paymentId` + `checkoutUrl` mile |
| duplicate session (409) | ✅ wahi purana checkout khula |
| HMAC webhook (V1 + V2) | ✅ signature verify, order `confirmed` + `paid` |
| galat signature | ✅ 401 reject |
| webhook dobara (retry) | ✅ duplicate ignore |
| amount mismatch | ✅ `409 ORDER_AMOUNT_MISMATCH`, order `failed` |
| browser-confirm endpoint | ✅ server se verify hokar order confirm |
| galat payment id | ✅ reject |

Aur: unit tests **339/0**, typecheck clean, lint 0 errors, live site check
**113 ✅ / 0 ❌**.
