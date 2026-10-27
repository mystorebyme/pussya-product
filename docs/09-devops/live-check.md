# Live site check — https://mystorebyme.github.io/pussya-product/

Ran: 2026-10-27T05:53:30.600Z

## Page

| result | check |
| --- | --- |
| ✅ | home page 200 — HTTP 200 · 415955 bytes · 179ms |
| ✅ | brand name page par hai |
| ✅ | header render hua hai |
| ✅ | header me brand-lockup hai |
| ✅ | hero banner section hai |
| ✅ | header logo <picture> mila |
| ✅ | logo srcset base path ke saath hai (/pussya-product/...) — /pussya-product/images/brand/logo-desktop.png?v=3 · /pussya-product/images/brand/logo-tablet.png?v=3 · /pussya-product/images/brand/logo-mobile.png?v=3 |
| ✅ | logo img par alt text hai |
| ✅ | logo img par `hidden` / `opacity-0` jaisi class nahi |

<details><summary>header markup (proof)</summary>

```html
<a aria-label="Noor Ethnic Wear home" class="col-start-2 row-start-1 flex min-w-0 shrink-0 items-center justify-center lg:col-start-2 lg:justify-center" href="/pussya-product/"><span data-size="header" data-variant="header" class="brand-lockup inline-flex items-center  "><picture data-tone="dark"><source media="(min-width:1024px)" srcSet="/pussya-product/images/brand/logo-desktop.png?v=3"/><source media="(min-width:768px)" srcSet="/pussya-product/images/brand/logo-tablet.png?v=3"/><img src="/pussya-product/images/brand/logo-mobile.png?v=3" alt="Noor Ethnic Wear" width="310" height="138" decoding="async" fetchPriority="high" class="block w-auto max-w-full object-contain"/></picture></span></a>
```

</details>

## Assets

| result | asset | HTTP | type | size |
| --- | --- | --- | --- | --- |
| ✅ | header logo (desktop) (`images/brand/logo-desktop.png`) | 200 | image/png | 123 KB |
| ✅ | header logo (tablet) (`images/brand/logo-tablet.png`) | 200 | image/png | 93 KB |
| ✅ | header logo (mobile) (`images/brand/logo-mobile.png`) | 200 | image/png | 67 KB |
| ✅ | footer logo (`images/brand/logo-fluid.png`) | 200 | image/png | 219 KB |
| ✅ | favicon 128 (`images/brand/logo-mark-128.png`) | 200 | image/png | 19 KB |
| ✅ | apple touch 180 (`images/brand/logo-mark-180.png`) | 200 | image/png | 35 KB |
| ✅ | PWA 192 (`images/brand/logo-mark-192.png`) | 200 | image/png | 39 KB |
| ✅ | PWA 512 (`images/brand/logo-mark-512.png`) | 200 | image/png | 227 KB |
| ✅ | manifest (`manifest.webmanifest`) | 200 | text | 568 B |
| ✅ | hero desktop (`images/banners/banner-desktop.webp`) | 200 | image/webp | 284 KB |
| ✅ | hero tablet (`images/banners/banner-tablet.webp`) | 200 | image/webp | 272 KB |
| ✅ | hero mobile (`images/banners/banner-mobile.webp`) | 200 | image/webp | 283 KB |

## Logo per viewport (browser ka `<source>` selection)

| result | viewport | file | display height | file width | required |
| --- | --- | --- | --- | --- | --- |
| ✅ | 320px | `logo-mobile.png` | 44px | 310px | ≥ 88px |
| ✅ | 375px | `logo-mobile.png` | 44px | 310px | ≥ 88px |
| ✅ | 390px | `logo-mobile.png` | 44px | 310px | ≥ 88px |
| ✅ | 430px | `logo-mobile.png` | 44px | 310px | ≥ 88px |
| ✅ | 768px | `logo-tablet.png` | 52px | 369px | ≥ 104px |
| ✅ | 1024px | `logo-desktop.png` | 58px | 427px | ≥ 116px |
| ✅ | 1366px | `logo-desktop.png` | 58px | 427px | ≥ 116px |
| ✅ | 1440px | `logo-desktop.png` | 58px | 427px | ≥ 116px |

## CSS (logo visibility)

| result | rule |
| --- | --- |
| ✅ | stylesheet load hui — /_next/static/chunks/0dptp36scokt4.css |
| ✅ | `.brand-lockup img` heights (44 → 52 → 58) |
| ✅ | `.brand-lockup img` object-fit: contain |
| ✅ | logo par koi display:none / visibility:hidden nahi |
| ✅ | hero `object-fit: contain` (crop nahi) |

## Copy

| result | check |
| --- | --- |
| ✅ | purana brand (Liksha) nahi |
| ✅ | 'free shipping' claim nahi |
| ✅ | Diwali offer copy hai |

## SEO / meta

| result | check |
| --- | --- |
| ✅ | title — Noor Ethnic Wear | Designer Anarkali Suits, Lehenga Choli &amp; Suit S |
| ✅ | meta description — Shop designer Anarkali suits, lehanga choli and printed suit |
| ✅ | canonical — https://mystorebyme.github.io/pussya-product/ |
| ✅ | lang attribute |
| ✅ | favicon links |

## Key pages

| result | page | HTTP |
| --- | --- | --- |
| ✅ | collections index (`collections/`) | 200 |
| ✅ | cart (`cart/`) | 200 |
| ✅ | checkout (`checkout/`) | 200 |
| ✅ | track order (`track-order/`) | 200 |
| ✅ | contact (`pages/contact/`) | 200 |
| ✅ | shipping policy (`policies/shipping-policy/`) | 200 |
| ✅ | returns policy (`policies/refund-and-return-policy/`) | 200 |
| ✅ | search (`search/`) | 200 |

## Internal links (sample)

| result | link | HTTP |
| --- | --- | --- |
| ✅ | `/pussya-product/images/brand/logo-fluid.png` | 200 |
| ✅ | `/pussya-product/_next/static/chunks/0dptp36scokt4.css` | 200 |
| ✅ | `/pussya-product/_next/static/chunks/14-dwd6q-0nhb.js` | 200 |
| ✅ | `/pussya-product/manifest.webmanifest` | 200 |
| ✅ | `/pussya-product/images/brand/logo-mark-512.png` | 200 |
| ✅ | `/pussya-product/images/brand/logo-mark-128.png` | 200 |
| ✅ | `/pussya-product/images/brand/logo-mark-192.png` | 200 |
| ✅ | `/pussya-product/images/brand/logo-mark-180.png` | 200 |
| ✅ | `/pussya-product/` | 200 |
| ✅ | `/pussya-product/account/` | 200 |
| ✅ | `/pussya-product/wishlist/` | 200 |
| ✅ | `/pussya-product/collections/` | 200 |
| ✅ | `/pussya-product/collections/party-wear-gown/` | 200 |
| ✅ | `/pussya-product/collections/lehnga-choli/` | 200 |
| ✅ | `/pussya-product/collections/printed-suit-set/` | 200 |
| ✅ | `/pussya-product/collections/best-seller/` | 200 |
| ✅ | `/pussya-product/collections/new-arrivals/` | 200 |
| ✅ | `/pussya-product/collections/sale/` | 200 |
| ✅ | `/pussya-product/pages/contact/` | 200 |
| ✅ | `/pussya-product/collections/noors-choice/` | 200 |
| ✅ | `/pussya-product/collections/wedding-collection/` | 200 |
| ✅ | `/pussya-product/products/pranavi-anarkali-dupatta-set/` | 200 |
| ✅ | `/pussya-product/products/tridha-fendy-silk-blush-pink-anarkali-premium-suit-set/` | 200 |
| ✅ | `/pussya-product/products/aditis-white-coloured-anarkali-suit-set-td04/` | 200 |
| ✅ | `/pussya-product/products/yellow-trendy-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/black-lucknowi-sequins-work-v-neck-gown-pent-and-duptta-suit-set/` | 200 |
| ✅ | `/pussya-product/products/copy-of-aniska-white-embroidered-georgette-anarkali-fully-stitched-suit-set/` | 200 |
| ✅ | `/pussya-product/products/western-style-sleeve-premium-readymade-kalamkari-designer-gown/` | 200 |
| ✅ | `/pussya-product/products/real-modeling-pure-soft-organza-silk-fabric-fully-flair-kali-pattern-and-canvas-patta-with-dupatta-set-pant-ready-to-wear-1/` | 200 |
| ✅ | `/pussya-product/collections/trending/` | 200 |
| ✅ | `/pussya-product/products/classic-red-karva-chauth-special-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/red-chilli-slit-anarkali-premium-suit-set/` | 200 |
| ✅ | `/pussya-product/products/designer-anarkali-suit-is-luxury-clothing-considered-to-be-high-quality-made-by-thread-sequins-embroidery-this-is-made-for-desirable-womens-who-deserve-it/` | 200 |
| ✅ | `/pussya-product/products/presenting-new-crunchy-silk-fabric-with-embroidery-sequence-dori-and-jari-work-top-with-dupatta-set-bell-bottom-pent-ready-to-wear/` | 200 |
| ✅ | `/pussya-product/products/kaumya-neon-elegant-sharara-suit-set-6061-sky/` | 200 |
| ✅ | `/pussya-product/products/neha-heavy-pure-vichitra-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/nehas-premium-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/premium-anarkali-suit-set-3-piece/` | 200 |
| ✅ | `/pussya-product/products/trending-anarkali-suit-set-3-pis/` | 200 |
| ✅ | `/pussya-product/products/premium-readymade-anarkali-suit-set-3-pis/` | 200 |

## Summary

✔ Saare live checks pass.
