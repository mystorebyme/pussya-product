# Catalogue schema

Source of truth: `noorethnicwear.in` (Shopify product JSON). Local: `database/seeds/catalog.json`.

```ts
type Product = {
  handle: string;          // "luxury-mustard-embroidered-georgette-anarkali-suit"
  title: string;           // exact store title
  description: string;     // HTML (h3 / p / ul-li)
  vendor: string;          // "Noor Ethnic Wear"
  productType: string;     // "Anarkali suit", "Lehenga", ...
  price: number;           // paise, 349900 = Rs. 3,499
  compareAtPrice: number | null;  // paise, 799900
  sizes: string[];         // ["XS [34]", ..., "3XL [46]"] normalized
  tags: string[];
  collections: string[];   // ["new-arrivals", "party-wear-gown", ...]
  images: { src: string; alt: string }[];  // primary first
  rating?: number;
  seoTitle?: string;       // jab store title se different ho
  publishedAt?: string;    // ISO
  createdAt?: string;
};

type Collection = {
  handle: string;          // "lehnga-choli"
  title: string;           // "Lehnga Choli"
  productHandles: string[];
};
```

## Import rules (`scripts/build-catalog.mjs`)

1. Saare handles sitemap se (`sitemap_products_1.xml` → 10 chunks).
2. Per product `/products/<handle>.js` → exact `price`, `compare_at_price`, `option1` sizes, `images`, `body_html`.
3. `sizes` map: `XS [34]` → `XS [34]` as-is (display me `[..]` hataya jaata hai).
4. `price` Shopify cents as-is = paise (Shopify INR store cents = paise, verify).
5. Product jisme variant nahi → `sizes: ["Free Size"]`.
6. Image: pehli CDN image `images[0].src`, alt = title.

## Verification

- Count 287, zero duplicate handles, zero `price <= 0`.
- Price range 149900–499900 paise.
- 9 collections; `saree`/`trending` are tag-based (no explicit product list on store).


## Live snapshot se aane wale extra fields

| Field | Type | Notes |
| --- | --- | --- |
| `images` | `string[]` | poori live gallery (avg 6.8 images/product), `?v=` strip karke |
| `descriptionHtml` | `string` | live `body_html`, sanitized (script/iframe/img/on* hataye) |
| `sizePricing` | `Record<size, {price, compareAtPrice, available}>` | per-size price/MRP/stock |
| `productType` | `string \| null` | Shopify product_type (reference only) |
| `publishedAt` | ISO string | "New Arrivals" ordering ke liye |

## Review photos (Round 13 rule)

- Review me **sirf customer ki asli photo** dikhti hai (Trustoo uploads, `img.trustoo.io`).
- Wo image kabhi nahi jo product ki gallery me pehle se hai — `scripts/reviews-sync/attach-review-photos.mjs`
  har sync ke baad catalogue images ko review photos se hata deta hai.
- Ek photo sirf ek review me (duplicate zero). Sample/seed reviews me koi photo nahi.
- Numbers (24 Oct 2026): 1,690 live reviews · 147 with a customer photo · 252 unique photos · 38 products.
