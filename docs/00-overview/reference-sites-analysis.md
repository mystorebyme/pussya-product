# Reference sites analysis

Kaam ka source: **noorethnicwear.in** (existing Shopify store) — yahi asli data source hai.
Catalogue, prices, sizes, images aur collection naming wahan se liye gaye hain taaki customer ko
same product mile.

## Kya copy kiya (data only)

- Product titles, handles, prices, MRP, fabric, colour, size options, detail points
- Collection handles aur unke titles (party-wear-gown → "Anarkali Suit", etc.)
- Product images (Shopify CDN URLs — hotlinked, mirror karna pending)

## Kya copy NAHI kiya (design)

- Layout, typography, colour system, spacing — sab naya likha gaya hai
- Policy text — apne business ke hisaab se naya likha gaya (legal copy copy-paste nahi)

## Reference se seekhe patterns

| Pattern | Kahan se | Humne kya kiya |
| --- | --- | --- |
| Collection-first navigation | Shopify stores | 9 collections, sitemap-consistent handles |
| Size options with brackets (`M [38]`) | Noor product pages | Same format rakha, sizes normalize kiye |
| COD under Rs. 3,500 | Store announcement | Business rule `packages/validation` me enforce |
| Discount % + MRP strike-through | Product cards | Same logic, but integer paise me |
| "Same day dispatch" messaging | WhatsApp/announcement | Checkout + PDP par consistent copy |

## Data quality notes

- Sitemap se primary image li gayi (1 image/product). Extra gallery images Shopify Admin API token se
  aayenge — `scripts/build-catalog.mjs` me jagah bani hui hai.
- `partial-payment` naam ka ek dummy product purane scrape me tha — hata diya gaya.
- Prices live `.js` endpoint se verify kiye gaye (sample check: 349900/799900 match).
