---
name: storefront-quality
description: Quality bar for customer-facing pages — performance budgets, SEO, accessibility, copy and trust signals. Use before shipping any storefront change.
---

# Storefront quality bar

## Performance budget

| Page | HTML | JS | LCP (4G) |
| --- | --- | --- | --- |
| Home | < 160KB | < 120KB | < 2.5s |
| PLP | < 120KB | < 110KB | < 2.5s |
| PDP | < 80KB | < 90KB | < 2.0s |

Rules: static render, server-side catalogue, lazy images (`imageUrl(src, 600)`), no UI libs,
`fetchpriority=high` sirf hero.

## SEO

- Unique `title` + `description` har page; canonical.
- 287 PDP prerendered; `sitemap.xml` + `robots.txt` (admin disallowed).
- JSON-LD: `Product` (price, availability, image, brand), `BreadcrumbList`, `Organization`.
- OG/Twitter image (1200×630), `lang="en-IN"`.
- Slug = store handle (jo already SEO-friendly hai).
- `noindex` on cart/checkout/order pages.

## Accessibility (WCAG 2.1 AA)

Contrast ≥ 4.5:1, labels on inputs, focus visible, `aria-label` icon buttons, tap ≥ 44px,
`aria-live` for cart, Esc closes drawer, ordered headings.

## Trust (conversion)

- Price + MRP + % off visible on card (no click needed).
- Size chart link near size selector.
- Delivery estimate + COD availability on PDP.
- Policies in footer (shipping/returns/privacy/terms).
- WhatsApp CTA with real number `9909790455`.
- Reviews/ratings only if real.

## Content

- Description = store HTML (no rewriting, no fake claims).
- Empty states me next action.
- Images: alt = product title.

## Pre-ship checklist

```
[ ] mobile 360px + desktop 1280px
[ ] Lighthouse mobile ≥ 85 perf / ≥ 95 SEO / ≥ 90 a11y
[ ] keyboard-only pass
[ ] metadata + JSON-LD valid (Rich Results test)
[ ] no console errors
[ ] CDN image fallback works (broken image → placeholder)
```
