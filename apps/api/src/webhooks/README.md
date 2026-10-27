# Webhooks rules

1. **Raw body** — webhook routes `express.raw({ type: "application/json" })` se mount hote hain
   aur `express.json()` se **pehle** register hote hain (`app.ts`), warna signature verify nahi hota.
2. **Signature verify** — `x-razorpay-signature` ka HMAC-SHA256 shared secret se compare,
   `timingSafeEqual` use karke. Verify fail = 401, koi processing nahi.
3. **Event-id dedupe** — `x-razorpay-event-id` ko store me daal kar dobara aane par sirf ack.
4. **Turant 2xx** — provider ko 5-10 second me response chahiye, warna woh retry karta rehta hai.
   Isliye heavy kaam (email, invoice, stock) queue me jaata hai.
5. **Idempotent handler** — "paid" do baar aaya to bhi order ek hi baar paid hoga.
6. **Log every failure** — request-id ke saath, taaki support trace kar sake.
