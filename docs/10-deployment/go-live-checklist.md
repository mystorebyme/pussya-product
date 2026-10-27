# Go-live checklist

## Content & data

- [ ] 287 products exact title/price/MRP/sizes/images (5 random spot-check vs store)
- [ ] 9 collections correct products
- [ ] Policies live: shipping, returns, privacy, terms, FAQ
- [ ] Contact details: phone , email owner ka apna Google account
- [ ] Footer social links (Instagram, WhatsApp)
- [ ] Size chart page

## Functional

- [ ] COD order ≤ Rs. 3,500 → order page
- [ ] COD > Rs. 3,500 blocked
- [ ] Coupon NOOR10 / WELCOME15
- [ ] Order tracking by number
- [ ] Admin login + status change + audit
- [ ] Admin stock 0 → sold out
- [ ] Contact form + newsletter save
- [ ] 404 + search empty states

## Payments

- [ ] Razorpay live keys set, KYC approved
- [ ] Webhook URL registered + secret matched
- [ ] Test payment Rs. 1 → paid status + email
- [ ] Refund flow tested (dashboard)

## SEO

- [ ] `sitemap.xml` me 287 products + collections + pages
- [ ] `robots.txt` — admin disallowed
- [ ] Canonical URLs, OG images
- [ ] JSON-LD Product + Organization + Breadcrumb
- [ ] Search Console verified, sitemap submitted

## Performance & security

- [ ] Lighthouse mobile ≥ 85 perf, ≥ 95 SEO
- [ ] Headers: HSTS, nosniff, CSP report-only
- [ ] Admin noindex
- [ ] `npm audit` high = 0
- [ ] Prod secrets random (dev defaults absent)

## Ops

- [ ] Uptime monitor + alert recipient
- [ ] Backup cron + one restore rehearsal
- [ ] Rollback procedure documented & tested
- [ ] WhatsApp support SOP shared with family/staff
- [ ] Analytics installed, test event visible

## Launch day

1. Freeze code (tag `v1.0.0`).
2. Final backup.
3. Deploy web → verify 5 pages.
4. Deploy admin + api → verify health.
5. Razorpay test transaction then refund.
6. Instagram/WhatsApp announcement.
7. Monitor 2 hours: orders, errors, LCP.
