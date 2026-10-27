# Scope

## Phase 1 — Launch (yeh repo)

**Storefront (apps/web)**
- Home, collection listing (sort + price filter + load more), product detail, search
- Cart (localStorage), checkout (COD + prepaid), order confirmation + tracking page
- Policy pages (privacy, terms, refund, shipping), about, contact, size guide
- SEO: sitemap, robots, JSON-LD, OG tags

**Admin (apps/admin)**
- Password login (8 hour session), dashboard, orders + status workflow, audit trail
- Products list, price edit, stock toggle, inventory view
- Collections view, customers (orders se derived), reports, coupons view, settings

**API (apps/api)**
- Products, collections, orders (idempotent create), payments link, webhook, health

**Payments**: third-party (Razorpay payment link / hosted checkout) + COD. Card data hamare server se
guzarta hi nahi.

## Phase 2 — Post launch

Customer accounts (login, saved addresses, order history), wishlist, reviews with moderation,
size-wise stock with atomic reservation, GST invoice PDF, coupons in DB, CMS pages, staff roles +
2FA, BullMQ jobs (email, abandoned cart, reconciliation), Postgres shift.

## Out of scope (deliberately)

- Apna payment gateway / card vault (PCI DSS ki zaroorat nahi)
- Marketplace / multi-vendor
- International shipping + multi-currency
- Native mobile app (PWA-responsive web kaafi hai)
