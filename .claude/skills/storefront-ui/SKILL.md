---
name: storefront-ui
description: Build or modify Noor storefront screens (home, collection, PDP, cart, checkout, content pages) using the existing Tailwind tokens and component set. Use for any UI change in apps/web.
---

# Storefront UI

## Read first

- `apps/web/src/app/globals.css` — tokens (`--color-maroon #862222`, `--color-cream #faf6f1`,
  `--color-sand #e9dfd4`, `--font-display` serif, `--font-body` sans).
- `apps/web/src/components/product-card.tsx` — card anatomy (3:4 image, price + MRP + discount pill).
- `docs/05-design/page-specs.md` — section order per page.

## Rules

1. **Server by default.** `"use client"` sirf jab state/event chahiye (cart, search, filters, forms).
2. **Catalogue server-side.** `@/lib/store` sirf server components me import karo (410KB JSON).
3. **Images**: `<img>` + `imageUrl(src, 600)`; hero par `fetchpriority="high"`, baaki `loading="lazy"`.
   `next/image` nahi (remote CDN + restricted builds).
4. **Money** always `formatPrice(paise)`; calculation kabhi component me nahi.
5. **Spacing**: section `py-16 md:py-24`, container `mx-auto max-w-7xl px-4 md:px-6`.
6. **Colour**: sirf tokens — koi hex JSX me nahi. Primary CTA `bg-[--color-maroon]` style classes
   already defined as `bg-maroon` in Tailwind theme.
7. **Mobile first**: 360px par test, tap targets ≥44px, sticky add-to-bag PDP par.
8. **States**: loading skeleton, empty, error — teeno banao.
9. **A11y**: `<label>` per input, `aria-label` icon buttons, `aria-live` for cart add, focus ring visible.
10. **No new dependency** for UI (no carousel/slider/animation libs).

## New page checklist

```
[ ] app/<route>/page.tsx server component
[ ] metadata export (title, description, canonical)
[ ] loading.tsx / not-found.tsx jahan zaroori
[ ] mobile 360 + desktop 1280 par dekha
[ ] npm run typecheck && npm run build --workspace @noor/web
```

## New component checklist

```
[ ] props typed, `type Props = { ... }` inline
[ ] Tailwind classes only; tokens use
[ ] client component? justify
[ ] testid only if e2e needs it (docs/08-testing/e2e.md)
```

## Verify

```bash
npm run dev:web            # :3000
npm run typecheck
npm run build --workspace @noor/web   # route sizes dekho
```

## Common mistakes

- Client component me `@/lib/store` import → build fail / huge bundle.
- Price ko rupees me convert karke store karna → paise hi rakho.
- `next/image` with remote Shopify URL → config error.
- Hardcoded `#862222` instead of token.
