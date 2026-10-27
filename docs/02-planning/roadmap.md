# Roadmap

| Phase | Timeline | Scope | Exit criteria |
| --- | --- | --- | --- |
| **0. Setup** | Week 1 | Monorepo, docs, skills, catalogue import | `npm run dev` chal raha, 287 products live |
| **1. Storefront** | Week 2–3 | Home, PLP, PDP, search, cart, checkout, policies | Customer order place kar sake, mobile par fast |
| **2. Admin + API** | Week 4 | Login, orders, products, settings, audit, REST API | Owner status/price badal sake |
| **3. Payments** | Week 5 | Razorpay link + webhook + COD rules | Webhook verified, order paid state correct |
| **4. QA + launch** | Week 6 | UAT, SEO, performance, DNS, monitoring | Go-live checklist pass |
| **5. Post-launch** | Month 2–3 | Accounts, wishlist, reviews, size-wise stock, GST PDF | Weekly iteration cadence |

## Milestones

- M1: Catalogue parity (title/price/sizes/collections) — done; full galleries pending `catalog:sync-live`
- M2: Checkout live with COD — done
- M3: Admin live — done
- M4: Payment gateway live (keys pending)
- M5: Public launch with SEO + analytics

## Ab kya pending hai

1. Razorpay keys + webhook registration (business KYC).
2. Product gallery images (Shopify Admin API token).
3. Image mirroring to R2/public (CDN dependency kam karne ke liye).
4. Analytics (privacy-friendly) + Search Console.
