# Tasks

Priority: **P0** = launch blocker · **P1** = first week after launch · **P2** = later.

## P0 — before going live

- [ ] **Live Razorpay keys** in Vercel + Render (`RAZORPAY_KEY_ID`, `_KEY_SECRET`, `_WEBHOOK_SECRET`)
      and register `https://api.noorethnicwear.in/api/v1/webhooks/razorpay`.
- [x] **Full catalogue media** — live snapshot committed (`database/seeds/live/`): 287 products,
      1,971 images (avg 6.8/product), real `body_html` descriptions, size-wise pricing. Refresh anytime
      with `npm run catalog:sync` (or GitHub Actions → *Catalog sync*).
- [ ] **Price parity spot-check** — 10 random products vs noorethnicwear.in (title, price, MRP, sizes).
      (`npm run catalog:verify` already checks snapshot parity; manual check is for eyes-on confidence.)
- [ ] **Production secrets** — rotate `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_TOKEN`
      (dev defaults exist in the repo on purpose; prod boot check should fail on them).
- [ ] **Domain + DNS** — apex → web, `admin.` → admin app, `api.` → Render (`docs/10-deployment/dns.md`).
- [ ] **Uptime monitor** on `/api/health` + `/api/v1/health` (`infra/monitoring/uptime.sh` or a hosted one).
- [ ] **Backup cron** — `database/scripts/backup.sh` daily + weekly off-server copy.
- [ ] **Mobile pass on a real phone** — home → PLP → PDP → cart → prepaid order.
- [ ] **Policies reviewed** by the owner (returns window, refund timeline, grievance officer).
- [ ] **Firebase project** — enable Phone provider, add authorized domains, paste the 6 Firebase envs
      (`docs/07-security/phone-otp.md`). Until then checkout uses dev OTP (code on screen).
- [ ] **`SELLER_GSTIN`** — set before the first real invoice; without it the PDF prints "GSTIN pending".

## P1 — week one

- [ ] Diwali/November 2026 hero + occasion strip copy.
- [ ] WhatsApp payment-link + order-confirmation template (prepaid link goes out within minutes).
- [ ] Replace hotlinked CDN images with mirrored storage (R2/S3) + `srcset` sizes.
- [ ] Shiprocket AWB automation (currently manual AWB in the order note).
- [ ] Invoice PDF (GSTIN, HSN, CGST/SGST) attached to the order email.
- [ ] Coupon management in admin (currently codes live in `@noor/validation`).

## P2 — Phase 2 (needs Postgres)

- [ ] Prisma migration `json → postgres` (`docs/04-data/migrations.md` cutover plan).
- [ ] Customer accounts + order history (`users`, session, OTP login).
- [ ] Size-wise stock + reservation (15 min TTL) and low-stock alerts.
- [ ] Reviews with photo upload + moderation queue.
- [ ] Wishlist + shareable wishlists.
- [ ] Search upgrade (Meilisearch) when catalogue > 2,000 SKUs.
- [ ] Analytics dashboard (funnel: PDP → bag → checkout → paid).

## P3 — nice to have

- [ ] Hindi/Hinglish locale toggle.
- [ ] Pincode-wise delivery estimate + serviceability check.
- [ ] Abandoned-cart WhatsApp nudge.
- [ ] Referral codes and loyalty points.
- [ ] Blog/editorial CMS (`docs/00-overview/reference-sites-analysis.md` has the sitemap for it).

## Done (round 2 — owner feedback)

- [x] Colour merge: same design ke colours ek PDP me (10 designs / 20 colourways, 277 listing cards).
- [x] Size-wise pricing (XL +Rs 100 … 5XL +Rs 500) PDP/cart/checkout/invoice par.
- [x] Add-to-cart item list ke **upar** + "Just added" + drawer scroll-to-top.
- [x] Home ka "287 styles, one wardrobe" band + "Shop new arrivals" CTA hataya.
- [x] Payment badges hataye; **prepaid only** (COD radio/fee/copy sab hataye, policies bhi).
- [x] Cart, checkout summary aur order review me item remove control.
- [x] Amazon-style GST invoice (PDF + HTML): HSN, rate-wise CGST/SGST, amount in words, signatory.
- [x] Emoji + NOTE/copyright + `*markers*` descriptions se hataye (bold me convert).
- [x] Search suggestions + recommendations (typeahead, idle grid, zero-result fallback).
- [x] Responsive pass: mobile/tablet/laptop (16px inputs, touch CTA, overflow guard).

## Done (round 1)

- [x] Live home page clone: announcement bar, poster hero, category tiles with live counts,
      "Trendy Anarkali Sets" + "New Arrivals" rails, brand logo from the store.
- [x] Product galleries (thumbs, cross-fade, hover zoom, swipe, keyboard), hover image swap on cards,
      scroll-reveal animations.
- [x] Service-tile strip ("FREE SHIPPING / SUPPORT 24/7 / 7 DAYS REPLACEMENT / 100% SECURE PAYMENT")
      removed from every page, as requested.
- [x] Firebase phone OTP at checkout + `phoneToken` enforcement on order creation.
- [x] Courier/AWB tracking (admin → storefront timeline) and GST invoice (HTML + PDF, phone-gated).

## Housekeeping

- [ ] Monthly `npm audit` + dependency bumps (Dependabot PRs).
- [ ] Monthly restore rehearsal from backup.
- [x] Removed `clone-noor-clothing-website/`, `scripts/sync-live-products.mjs`, `scripts/data/*`
      (bootstrap-only inputs) — catalogue ab seedha live snapshot se banta hai.
