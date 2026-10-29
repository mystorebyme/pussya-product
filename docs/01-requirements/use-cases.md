# Use cases

## UC-01 Place an order (prepaid)

**Actor**: Customer
**Precondition**: Cart me 1+ item
**Flow**
1. `/checkout` par form bhara (name, phone, email, address, city, state, pincode).
2. Client validation (shared zod) → phone/pincode format.
3. `POST /api/orders` with `Idempotency-Key`.
4. Server: zod validate → product lookup → price recompute → discount → COD rule → order save.
5. Response `{orderNumber}` → `/orders/NE-XXXX` par redirect.
6. Page: payment pending block + WhatsApp link; admin dashboard me order visible.

**Alternate**: price mismatch (client stale) → server value use hota hai, UI me screenshot na ho to bhi sahi.
**Failure**: network → error message + retry (same idempotency key se duplicate nahi).

## UC-02 COD order above limit

**Flow**: subtotal > Rs. 3,500 → COD radio disabled with reason; API bhi 400 `COD_NOT_ALLOWED`.
**Why**: high-value COD returns ka risk.

## UC-03 Admin status update

**Actor**: Owner
1. `/orders` → order search → detail.
2. Allowed next statuses only (`placed: confirmed|cancelled`).
3. Submit → audit entry `order.status.shipped` + note.
4. Customer page timeline update.

## UC-04 Payment webhook

1. Razorpay `payment_link.paid` bhejta hai `x-razorpay-signature` ke saath.
2. HMAC verify fail → 401, kuch nahi hota.
3. Event id dedupe → duplicate par `{duplicate:true}`.
4. Order → paymentStatus `paid`, status `confirmed`, audit entry `payment.paid`.
5. 2xx turant; email queue me.

## UC-05 Restock

Product out of stock → admin `Restock` → override file me `inStock: true` → storefront revalidate.

## UC-06 Customer asks for return

WhatsApp par order number + photo → support policy ke hisaab se decide karta hai → admin me status
`returned` + note. Refund manual (UPI) / gateway se, audit me note.
