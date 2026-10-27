# Owner report — Round 22 (checkout & payment fix)

**Date:** 25 October 2026 · **Live site:** https://noor-ethnic-wear.vercel.app · **Admin:** https://noor-admin.vercel.app
**Live commit:** `b83b07b` (health API me `commit` dikhta hai)

---

## 1. Aapne jo bataya, uska status

| Aapki baat | Status |
| --- | --- |
| "Address wale par place order karte hi QR code aa jata hai" | ✅ **Theek** — checkout par UPI/QR/UTI ID/WhatsApp-confirm kuch nahi. Place order → seedha **payment step 3**. |
| "Order summary me 'Pay Rs. 499 to UPI ' aana hi nahi chahiye" | ✅ **Theek** — wo block poora hata diya (code me bhi nahi bacha, test bhi check karta hai). |
| "Kabhi kabhi 3-step khulta hi nahi" | ✅ **Asli wajah mil gayi** — server ka database connection pool full ho raha tha, isliye order/payment page **500** de raha tha. Ab fix hai (neeche point 3). |
| "Payment page se direct UPI app se pay ho" | ✅ Ek button **"Open UPI app to pay ₹499"** — phone khud apne saare UPI apps dikhata hai (GPay/PhonePe/Paytm jo bhi phone me ho). Amount + order note pehle se bhara. Saath me QR aur "Copy UPI ID" bhi hai. |
| "Direct detect ho success / failed / pending" | ✅ Payment page par **"Payment ho gaya? Status check kariye"** + har 5–6 second me khud check hota hai; tab wapas laane par turant. |
| "Sab kuch DB + Google Sheet me store ho" | ✅ Har event (checkout khula → review → order placed → failed) **DB** me `checkout_events` table me, aur **Google Sheet** me naya **`Checkout`** tab. Payment events pehle se `Payments` tab me. |
| "Order number Track order me kaam kare" | ✅ Order number payment page par banta hai, uppercase/small dono chalte hain, galat number par saaf "**Order nahi mila**" page (500 error nahi). |

---

## 2. Do asli bugs jo live testing me pakde gaye (aur fix hue)

### (a) UTR daalte hi "Could not save the payment reference"
- **Wajah:** database me ek hi UPI reference (UTR) ko poore system me ek hi baar allowed kiya gaya tha. Doosre order me wahi UTR daalte hi error aata tha — chahe paisa kat chuka ho.
- **Ab:** UTR **apne order** ke andar unique hai. Doosre order par wahi UTR daalne par saaf message aata hai
  ("Ye UPI reference pehle se doosre order par use ho chuka hai…"), 500 error nahi. Wahi order dobara try kare to chal jata hai.

### (b) Order / payment page kabhi kabhi 500 (yahi "3-step khulta hi nahi")
- **Wajah:** serverless par har instance 5 database connections khol raha tha, Supabase ka pooler sirf ~15 deta hai → `max clients reached`. Us waqt order page aur UTR save dono fail hote the.
- **Ab:** serverless par 1 connection + jaldi release + temporary error par chhota retry. Health API `db: up` dikha raha hai.

---

## 3. Live proof (aaj, production par)

| Check | Result |
| --- | --- |
| `/api/health` | `status: ok`, `db: up`, `commit: b83b07b`, products 446 |
| `/checkout` | koi UPI ID / QR / "Send on WhatsApp" nahi |
| Payment page (asli order) | alag page, order number, **ek hi "Open UPI app" button**, UPI deep link, koi app brand naam nahi |
| UTR submit → processing | ✅ pass (pehle fail hota tha) |
| Galat order number | **404** + "Order nahi mila" (pehle 500) |
| Live payment + tracking smoke | **28 passed / 0 failed** (admin steps token ke bina skip — wo local par verify hote hain) |
| Local suites | unit 100/0 · integration 40/0 · db 9/0 · payments 35/0 · smoke 87/0 · links 40 pages/0 · responsive 43/0 · round16 37/0 · breakpoints 48/0 |

---

## 4. Aapko kya karna hai (2 kaam, 5 minute)

1. **Google Sheet:** naya **`Checkout`** tab dikhane ke liye Apps Script ka **naya version deploy** karna hoga
   (Extensions → Apps Script → Deploy → Manage deployments → Edit → Version: **New version** → Deploy).
   Uske baad har checkout/order event apne aap Sheet me aayega.
2. **Domain + mail ID:** `noorethnicwear.in` aur official mail ID abhi bhi pending hai.
   Jo mile, bhej dijiye — DNS + settings main set kar dunga (code ready hai, sirf value daalni hai).

**Ek cheez chahiye aapse:** "kabhi kabhi 3-step khulta hi nahi" ke jo 3 case aapke paas the — unke
screenshot ya order number bhej dijiye. Abhi root cause (DB pool) mil gaya aur fix ho gaya hai, par
agar koi alag case bacha hai to usi ka pata chalega.

---

## 5. Yaad rahe (standing rules jo ab bhi lagu hain)

- Checkout par UPI bilkul nahi — sirf payment step 3 par.
- Payment page par **koi app ka naam nahi** (GPay/PhonePe/Paytm) — sirf ek generic "Open UPI app". Ye jaan-boojh kar hai.
- Tel/call button nahi — sirf WhatsApp ****.
- Prices ₹499 / ₹549 / ₹599 / ₹649 / ₹699 — owner-approved, change nahi.
- Razorpay/koi gateway nahi — payment seedha aapke UPI par.

Technical detail: `docs/08-testing/round22-audit.md`.
