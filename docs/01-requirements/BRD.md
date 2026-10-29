# Business Requirements Document (BRD)

## 1. Business context

Noor Ethnic Wear (Jaipur) — designer ethnic wear label. Sales mainly Instagram DMs aur WhatsApp par.
Problems: repeated questions (price, size availability, COD), order tracking manual, stock
out-of-sync, koi single source of truth nahi.

## 2. Objectives

1. 287 live products ek hi catalogue me, exact prices ke saath.
2. Customer khud browse + checkout kar sake, WhatsApp sirf exception handle kare.
3. Owner mobile se order status badal sake.
4. Payment third-party se, reconciliation webhook se (manual "paid/unpaid" notes nahi).
5. India compliance basics: GST invoice details, DPDP consent/privacy, clear policies.

## 3. Stakeholders

| Role | Zaroorat |
| --- | --- |
| Owner (Tannu) | Sales visibility, price/stock control, zero downtime |
| Catalog manager | Product add/edit, image, price |
| Dispatch | Order list, address, status update |
| Customer | Browse, size clarity, COD/prepaid, tracking |
| CA | GST-compliant invoices, monthly sales report |

## 4. Business rules (locked)

| Rule | Value |
| --- | --- |
| Free shipping | Sabhi orders, pan-India |
| COD limit | Rs. 3,500 se kam; Rs. 50 fee |
| Multiple items | Rs. 3,500+ par advance payment required |
| Replacement window | 7 days (unused, tags intact) |
| Dispatch SLA | 1–2 working days |
| Coupons | Koi percentage coupon nahi — festive sale final price ₹499–₹699 |
| Payment modes | UPI, card, netbanking (gateway), COD |

## 5. Success metrics

Conversion ≥ 1.5%, AOV ≥ Rs. 2,700, COD share 40–50%, admin response time < 24h, page load < 2.5s.

## 6. Assumptions & constraints

- Payment gateway account Razorpay (third-party hosted checkout) — keys launch ke waqt milengi.
- Ek hi owner login Phase 1; multi-staff Phase 2.
- Courier: Shiprocket (Phase 2 automation; abhi manual AWB).
- Budget: managed hosting (Vercel/Render) — DB cost Phase 2 tak zero.

## 7. Out of scope

Marketplace, international, native app, apna payment gateway, loyalty program.
