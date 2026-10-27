# Page specs

## `/` Home

1. Announcement bar (free shipping / offer).
2. Hero — single image + headline + "Shop new arrivals"; mobile 4:5, desktop 16:9ish.
3. Category tiles — 6–8 (Anarkali, Saree, Lehenga, Printed suit, Wedding, Sale).
4. New arrivals rail (8 products, horizontal scroll mobile).
5. Bestsellers grid (8).
6. Editorial band (brand story + 1 CTA "Our story").
7. Reviews strip (3 quotes).
8. Newsletter + WhatsApp.
9. Footer.

Perf budget: **HTML < 160KB, LCP < 2.5s on 4G**, images lazy except hero.

## `/collections/[handle]` PLP

- Breadcrumb, H1, product count, sort (featured / price low-high / price high-low / discount / newest / A-Z),
  price band filter, "Load more" (24 per page).
- Grid 2/3/4. Page static hai; filter/sort client-side (`CollectionBrowser`) aur URL `?sort=price-low&price=under-2500`
  `replaceState` se sync hota hai taaki link share ho sake.
- Empty state + "View all".

## `/products/[handle]` PDP

- Gallery (5 thumbs + main), title, price/MRP/%, rating, size buttons + size chart, Add to bag, WhatsApp enquiry, pincode/COD note.
- Accordions: Description (HTML), Fabric & care, Shipping & returns.
- "You may also like" (4 same collection).
- JSON-LD `Product` + `BreadcrumbList`.
- 287 pages prerendered at build (`generateStaticParams`).

## `/cart`

Lines, qty, remove, coupon field, subtotal, "Continue to checkout". Empty state with "Shop collections".

## `/checkout`

Contact (name, email, phone) → address (line, city, state, pincode) → payment (COD / prepaid) → notes.
Summary sticky on desktop. Submit → `POST /api/orders` with Idempotency-Key → `/orders/[orderNumber]`.

## `/orders/[orderNumber]`

Status timeline, items, totals, address, payment status, "Pay now" (agar pending + link), support CTA.
Not found → friendly message + form.

## `/search?q=`

Results count, grid, "no results" + suggestions (collections).

## `/policies/[slug]`, `/pages/[slug]`

Markdown rendered; TOC on desktop; last-updated date. `about-us`, `contact`, `size-guide`, `faq`.

## `/account`

Phase 1: track order + support links (no login). Login Phase 2 me.

## Errors

`not-found.tsx` (branded 404), `error.tsx` (retry), `loading.tsx` skeleton grid.
