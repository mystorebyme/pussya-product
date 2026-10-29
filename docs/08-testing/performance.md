# Performance

## Budget

| Page | HTML (raw / gzip) | LCP target | Status |
| --- | --- | --- | --- |
| Home | 129KB / 19KB | < 2.5s | ✅ |
| PLP (`/collections/[handle]`) | 101KB / 15KB | < 2.5s | ✅ |
| PDP | 48KB / 9KB | < 2.0s | ✅ |
| Checkout | 28KB / 6KB | < 2.0s | ✅ |

Measured on the production build (`next start`, 2026-10-24).

## Techniques in use

1. **Static rendering** — home, **all 9 collection pages**, 287 PDPs and policies are prerendered.
   Collection sort/price filtering runs client-side (small JSON fetch), so the HTML never waits on
   `searchParams`.
2. **Server-only catalogue** — 410KB JSON client bundle me nahi jaata.
3. **Short JSON for client** — `product-grid-client` ko sirf minimal fields.
4. **`<img loading="lazy" decoding="async">`** non-hero images; hero `fetchpriority=high`.
5. **Zero UI deps** — koi carousel/slider library nahi.
6. **CSS-first animations** — JS animation libs nahi.
7. **Route handlers cached** — `/api/products` 60s.
8. **Preconnect** CDN + fonts.

## Measurement

```bash
npm run build   # route table me size dekho
npx lighthouse https://noorethnicwear.in --preset=desktop --only-categories=performance
```

## Known issues

- Shopify CDN images bade hain (`width=1000` master). Solution: `?width=600` param CDN par supported hai —
  Phase 2 me har product ke liye 3 sizes generate karke `srcset` dena.
- Sandbox/restricted networks me CDN images load nahi hoti (SSL). Isliye har customer-facing image
  `SafeImage` component se render hoti hai: ek `onError` par brand placeholder SVG dikhta hai, layout
  nahi tootta (9 `<img>` jahan fallback matter nahi karta, wahan plain `<img>` hai).

## Regressions

CI me build output size diff check; 10% se zyada badhe to PR me justify karo.
