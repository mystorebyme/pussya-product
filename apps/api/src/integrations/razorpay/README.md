# Razorpay integration

- **Payment link / hosted checkout** hi use karte hain. Card data hamare server se guzarta hi nahi.
- Keys: `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET` (kabhi repo me nahi).
- Payment confirm sirf **server-side** hota hai: webhook signature verify + order status check.
  Browser ke "payment success" redirect par bharosa nahi karte.
- Refund provider API se hota hai, `paymentStatus: refunded` + audit entry ke saath.
- Har payment attempt ka apna record rakho (order number + provider reference) — reconciliation ke liye.
