# Performance

Budgets (mobile, 4G):

| Page | HTML (gz) | LCP | Notes |
| --- | --- | --- | --- |
| Home | < 160KB | < 2.5s | hero `fetchpriority=high`, baaki lazy |
| Collection | < 120KB | < 2.5s | 24 products per page |
| Product | < 80KB | < 2.0s | 1 hero image + thumbs |
| Checkout | ~20KB | < 2.0s | no catalogue JSON in the bundle |

Run:

```bash
npm run build:web
npm run start --workspace @noor/web &
URL=http://localhost:3000 bash tests/performance/lighthouse.sh
```

Rules that keep it fast (do not regress):

1. Catalogue stays server-side (`@/lib/store` never imported by a client component).
2. No UI/carousel/animation libraries.
3. `imageUrl(src, 600)` for grids; never ship the full-size CDN master to a card.
4. `generateStaticParams` on PDPs — no runtime catalogue render.
5. Any new page: check the route table in `npm run build:web` output for size regressions.
