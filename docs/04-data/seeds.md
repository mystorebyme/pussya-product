# Seeds

## Live snapshot (catalogue ka source)

```
database/seeds/live/
├── products.json      # Shopify /products.json — 287 products, 1,971 images, body_html, variants
├── collections.json   # Shopify /collections.json — 10 collections (frontpage included)
├── membership.json    # har collection ke andar ke handles (paginated, exact)
└── html/              # home + ek PDP ka snapshot (design/copy parity ke liye reference)
```

Refresh:

```bash
npm run catalog:sync    # fetch-live.mjs (internet chahiye) + build-catalog.mjs
npm run catalog:verify  # snapshot ke against parity check (CI gate)
```

Sandbox/CI me outbound network na ho to GitHub Actions → **Catalog sync** (`catalog-sync.yml`)
chalayein — wahi snapshot commit kar deta hai (`.catalog-sync-trigger` touch karke push).

## Catalogue seed

`database/seeds/seed.ts`:

1. `catalog.json` parse.
2. Collections upsert (handle, title).
3. Products upsert by `handle` — title, description, productType, vendor, price, compareAt, tags, publishedAt.
4. Variants: size + sku + `stock: 10` default (owner admin se adjust kare).
5. Images: sort order 0..n, alt default.
6. Product↔collection links.

Idempotent: dobara chalane par duplicate nahi banta (upsert on unique `handle`).

## Demo/test seed

`database/seeds/seed.dev.ts` — 3 orders (placed, packed, delivered), 5 coupons, 2 messages,
1 settings row. Sirf local/preview me.

## Inventory policy

- Default stock 10/size (COD cancellation buffer).
- Out-of-stock size UI me disabled + "Notify me" (Phase 2).
- Admin `updateStockAction` → override file; catalogue rebuild stock ko overwrite nahi kare
  (overrides loader ke through merge hota hai).

## Commands

```bash
npm run catalog:build                 # json regenerate
npx tsx database/seeds/seed.ts        # DB/override seed
npx tsx database/seeds/seed.dev.ts    # demo data (dev only)
```
