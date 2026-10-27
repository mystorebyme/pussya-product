# UPI payments — seedha owner ke account me

Koi Razorpay/third-party gateway nahi. Customer order place karta hai (order **turant** ban
jaata hai, `paymentStatus: pending`), order page par **UPI QR + UPI ID + exact amount** milta
hai, aur pay karne ke baad **UPI app se wapas aate hi order auto-confirm** ho jaata hai.
Agar app callback support na kare to UTR daal kar bhi confirm kar sakta hai; owner bank me
credit na dekhe to ek tap me undo kar sakta hai.

## Flow

1. **Checkout** — address + OTP (Firebase) → `POST /api/orders` → order `paymentStatus: "pending"`.
2. **Payment page** (`/orders/NE-…`) — QR (`qrcode`, browser me banta hai) + `upi://pay` deep link,
   amount pehle se bhara hua. GitHub Pages par bhi QR chalta hai (koi API nahi chahiye).
3. **Auto-confirm (default)** — UPI deep link me signed callback hota hai:
   `url=<site>/orders/NE-…?upi=return&t=<token>` (token = `HMAC(UPI_RETURN_SECRET, order)`).
   Payment ke baad customer wapas aata hai → `POST /api/payments/return` → token verify →
   `paymentStatus: paid`, status `placed → confirmed`, sheet me `payment.auto_confirmed` row,
   reference UPI app ke `txnId`/`approvalRefNo` se (na mile to `UPI<order>`).
4. **Manual reference (fallback)** — app ne reference bheja hi nahi ya confirm nahi hua to
   `POST /api/payments/manual {orderNumber, reference, phoneLast4}` → `payment.reference_submitted`.
5. **Admin verify** — admin panel → order → *Mark payment verified* → `payment.paid`.
6. **Undo** — admin panel → order → *Payment not received* → payment wapas `pending`, order
   (confirm tha to) `placed`, sheet me `payment.reversed`.
7. Customer ko order page par "Payment verified" card + WhatsApp confirmation.

## Security

- Reference submit ke liye order ka **phone last 4** (ya OTP token) match hona zaroori hai —
  koi order number guess karke kisi aur ke order me UTR nahi daal sakta.
- Auto-confirm token se bandha hai: `HMAC(secret, order)` — sirf usi order ke UPI link me hota hai,
  kisi doosre order par reuse nahi hota (`apps/web/src/lib/upi-return.ts`, unit tested).
  Secret: `UPI_RETURN_SECRET` (recommended) warna `ADMIN_API_TOKEN`; rotate karne par purane
  links invalid ho jaate hain (customer UTR path use kar sakta hai).
- Token customer ke apne UPI link me hota hai, isliye auto-confirm **owner ke undo** par depend
  karta hai: bank statement check karke "payment not received" ek tap me kar sakta hai.
- UPI app `txnStatus` failure bheje (`FAILURE`/`DECLINED`/`PENDING`) to auto-confirm **nahi** hota.
- UPI ID config: Google Sheet `upi_id` > admin settings > `STORE_UPI_ID` env > default.

## Static preview (GitHub Pages)

Pages par server nahi hai, isliye:

- Checkout **WhatsApp order** banata hai (poora item list + total + address) — network error nahi.
- Order page / UTR form ki jagah **WhatsApp screenshot** button.
- Repo → Settings → Variables → Actions me `STORE_API_URL` set ho to Pages seedha
  Render API par jaata hai aur poora flow chalta hai (`NEXT_PUBLIC_API_BASE_URL`). Cross-origin
  calls ke liye Render par allowlist CORS already hai (`apps/web/src/lib/cors.ts`) —
  `/api/orders`, `/api/payments/manual`, `/api/payments/failed`, `/api/payments/return`,
  `/api/settings`.
- Pages par auto-confirm callback site ke Pages URL par aata hai (`window.location.origin`).
