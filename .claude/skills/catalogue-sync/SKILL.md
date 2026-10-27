---
name: catalogue-sync
description: Import and verify the product catalogue from noorethnicwear.in so titles, prices, MRP, sizes, images and collections match exactly. Use when products change, prices update, or parity is questioned.
---

# Catalogue sync (exact match)

## Source of truth

`https://noorethnicwear.in` (Shopify). Local artifact: `database/seeds/catalog.json`
(copied to `apps/web/src/data/` and `apps/admin/src/data/`).

## Pipeline

```bash
node scripts/build-catalog.mjs        # catalog.ts / live data -> catalog.json
node scripts/verify-catalog.mjs       # counts, duplicates, price sanity
cp database/seeds/catalog.json apps/web/src/data/catalog.json
cp database/seeds/catalog.json apps/admin/src/data/catalog.json
```

## Where the data comes from

| Field | Source |
| --- | --- |
| `handle` | `sitemap_products_1.xml` (10 chunks) |
| `title`, `description` | `/products/<handle>.js` → `title`, `body_html` |
| `price`, `compareAtPrice` | `.js` → `price` (paise), `compare_at_price` |
| `sizes` | `.js` → variant `option1` (`XS [34]` … `3XL [46]`) |
| `images` | `.js` → `images[].src`, primary first |
| `collections` | sitemap collections + tags |
| `productType` | `.js` → `product_type` |

## Exactness rules

1. Price = store price in **paise** (Rs. 3,499 → `349900`). No rounding, no "approx".
2. MRP = `compare_at_price`; null agar store par nahi.
3. Title exactly as store (SEO title alag ho to `seoTitle`).
4. Sizes exactly as store options — order same rakho.
5. Description HTML as-is (h3/p/ul-li); styling humare CSS se.
6. Image URL as-is (CDN), width param sirf display ke waqt.

## Verification checklist

```
[ ] products count matches sitemap count (287)
[ ] zero duplicate handles
[ ] every product: price > 0, ≥1 image, ≥1 size
[ ] collections: new-arrivals, party-wear-gown, saree, noors-choice,
    lehnga-choli, printed-suit-set, weddin-collection, trending, sale
[ ] spot check 5 random products against live PDP (price + MRP + sizes)
[ ] npm run build --workspace @noor/web  (287 PDPs prerender)
```

## Pitfalls

- Sitemap par 10 chunks hain; ek chunk chhoot gaya to products missing.
- Shopify `price` **paise** me hai (INR), dollars nahi — 100 se divide mat karo.
- Products with no variants → `sizes: ["Free Size"]`.
- Kabhi placeholder/fake product mat add karo — sirf store ka data.
