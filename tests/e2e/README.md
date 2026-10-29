# E2E

Two layers:

1. **`smoke.mjs`** — zero dependency, HTTP only. Runs against a production build.
   ```bash
   npm run build:web && npm run start --workspace @noor/web &
   npm run test:smoke                       # or BASE_URL=https://noorethnicwear.in npm run test:smoke
   ```
   Checks: health, home, collection, PDP (price/sizes/add-to-bag), search, order create + order page,
   unknown order 404, sitemap.

2. **`storefront.spec.ts`** — Playwright (mobile + desktop projects, config at repo root).
   ```bash
   npx playwright install --with-deps chromium
   npm run test:e2e
   ```
   Uses `data-testid` hooks: `header-search`, `search-input`, `product-card`, `size-option`,
   `add-to-bag`, `cart-drawer`, `cart-count`, `checkout-submit`, `order-number`.

`test:e2e` needs a built app (`webServer` block runs `npm run start`).
