# Work Breakdown Structure

```
1. Discovery & docs
   1.1 Reference site analysis (catalogue, collections, rules)
   1.2 Requirements (BRD, SRS, stories)
   1.3 Architecture + ADRs
   1.4 Data model + policies
2. Foundations
   2.1 Monorepo (apps/web, apps/admin, apps/api, packages/*)
   2.2 Shared types + validation (zod)
   2.3 Design tokens + brand
   2.4 CI (lint, typecheck, build)
3. Catalogue
   3.1 Sitemap se images map
   3.2 build-catalog script (287 products, sizes normalize)
   3.3 Collections + category mapping
   3.4 Storefront data layer (static JSON)
4. Storefront
   4.1 Layout: header, footer, drawer, mobile menu
   4.2 Home sections
   4.3 PLP: sort, price filter, load more
   4.4 PDP: gallery, sizes, details, related
   4.5 Search (instant + page)
   4.6 Cart + coupons
   4.7 Checkout + validation
   4.8 Order confirmation + tracking
   4.9 Policies, about, contact, 404
   4.10 SEO (sitemap, robots, OG, JSON-LD)
5. Admin
   5.1 Auth + session middleware
   5.2 Dashboard
   5.3 Orders + status + audit
   5.4 Products + price/stock overrides
   5.5 Inventory, customers, reports, settings
6. API
   6.1 Products/collections
   6.2 Orders (idempotent, validated)
   6.3 Payments + webhook
   6.4 Middlewares (request-id, rate limit, errors)
7. Payments & notifications
   7.1 Razorpay payment link
   7.2 Webhook verify + dedupe
   7.3 Email queue + templates (log mode)
8. QA & launch
   8.1 Unit + integration tests
   8.2 Performance pass
   8.3 Security review
   8.4 Deploy + monitoring
   8.5 Runbook + go-live checklist
```
