# MVP scope (Phase 1)

## MVP me hai

- 287 products, 9 collections, exact prices
- Search, filters, PDP, cart, checkout (COD + prepaid intent)
- Order confirmation + tracking by order number
- Policies + contact + WhatsApp
- Admin: login, orders, products, inventory, customers, reports, settings, audit
- API: products, orders, payments, webhook, health

## MVP me nahi hai (par UI me jagah bani hai)

| Item | Kyun nahi | Kab |
| --- | --- | --- |
| Customer login | Guest checkout kaafi hai launch ke liye; auth ka cost/risk | Phase 2 |
| Wishlist | Account ke bina value kam | Phase 2 |
| Reviews | Moderation effort; ratings catalogue se dikh rahe hain | Phase 2 |
| Size-wise stock | Phase 1 me product-level stock (manual) | Phase 2 |
| GST invoice PDF | CA ke saath format finalize karna hai | Phase 2 |
| Shiprocket auto-AWB | Manual AWB se launch ho sakta hai | Phase 2 |
| Coupon engine (DB) | 2 static codes kaafi hain | Phase 2 |

## MVP success test

1. Naya customer Instagram se aata hai → anarkali collection → PDP → cart → COD order → order page.
2. Owner 30 second me order dekh kar status `confirmed` karta hai.
3. Customer order number se status dekhta hai.
4. Sab kuch mobile par 3G/4G par usable.
