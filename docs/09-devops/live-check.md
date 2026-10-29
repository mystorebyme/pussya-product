# Live site check — https://mystorebyme.github.io/pussya-product/

Ran: 2026-10-29T05:18:50.380Z

## Page

| result | check |
| --- | --- |
| ✅ | home page 200 — HTTP 200 · 447880 bytes · 206ms |
| ✅ | brand name page par hai |
| ✅ | header render hua hai |
| ✅ | header me brand-lockup hai |
| ✅ | hero banner section hai |
| ✅ | no payment UI on the storefront (no 'Pay on UPI', no UPI deep link) |
| ✅ | home par WhatsApp flow ka zikr hai (koi payment claim nahi) |
| ✅ | WhatsApp FAB home par (bottom-right) |
| ✅ | WhatsApp FAB product page par bhi |
| ✅ | Daily Special ribbon ya maroon announcement strip hai |
| ❌ | build ne sheet se number liya (bake hua) — nahi — apps-script: empty · published-csv: empty · sheet-gviz: HTTP 401 · live-store: HTTP 404 |
| ❌ | WhatsApp number sheet se live aaya (wa.me/<10+ digits>) — wa.me par number nahi mila (chat picker = sheet se number nahi aaya) |
| ✅ | number ek hi hai (header/footer/FAB me mismatch nahi) |
| ❌ | number 10 digit ka valid Indian mobile hai — — |
| ✅ | checkout page 200 — HTTP 200 |
| ✅ | checkout page par WhatsApp hand-off copy hai |
| ✅ | checkout par koi payment step / UPI nahi |
| ✅ | checkout copy English hai (koi Hinglish marker nahi) |
| ✅ | header logo <picture> mila |
| ✅ | logo srcset base path ke saath hai (/pussya-product/...) — /pussya-product/images/brand/logo-desktop.png?v=4 · /pussya-product/images/brand/logo-tablet.png?v=4 · /pussya-product/images/brand/logo-mobile.png?v=4 |
| ✅ | logo img par alt text hai |
| ✅ | logo img par `hidden` / `opacity-0` jaisi class nahi |

<details><summary>header markup (proof)</summary>

```html
<a aria-label="Noor Ethnic Wear home" class="col-start-2 row-start-1 flex min-w-0 shrink-0 items-center justify-center lg:col-start-2 lg:justify-center" href="/pussya-product/"><span data-size="header" data-variant="header" class="brand-lockup inline-flex items-center  "><picture data-tone="dark"><source media="(min-width:1024px)" srcSet="/pussya-product/images/brand/logo-desktop.png?v=4"/><source media="(min-width:768px)" srcSet="/pussya-product/images/brand/logo-tablet.png?v=4"/><img src="/pussya-product/images/brand/logo-mobile.png?v=4" alt="Noor Ethnic Wear" width="374" height="138" decoding="async" fetchPriority="high" class="block w-auto max-w-full object-contain"/></picture></span></a>
```

</details>

## Assets

| result | asset | HTTP | type | size |
| --- | --- | --- | --- | --- |
| ✅ | header logo (desktop) (`images/brand/logo-desktop.png`) | 200 | image/png | 103 KB |
| ✅ | header logo (tablet) (`images/brand/logo-tablet.png`) | 200 | image/png | 83 KB |
| ✅ | header logo (mobile) (`images/brand/logo-mobile.png`) | 200 | image/png | 63 KB |
| ✅ | footer logo (`images/brand/logo-fluid.png`) | 200 | image/png | 196 KB |
| ✅ | favicon 128 (`images/brand/logo-mark-128.png`) | 200 | image/png | 6 KB |
| ✅ | apple touch 180 (`images/brand/logo-mark-180.png`) | 200 | image/png | 11 KB |
| ✅ | PWA 192 (`images/brand/logo-mark-192.png`) | 200 | image/png | 13 KB |
| ✅ | PWA 512 (`images/brand/logo-mark-512.png`) | 200 | image/png | 77 KB |
| ✅ | manifest (`manifest.webmanifest`) | 200 | text | 572 B |
| ✅ | hero desktop (`images/banners/banner-desktop.webp`) | 200 | image/webp | 279 KB |
| ✅ | hero tablet (`images/banners/banner-tablet.webp`) | 200 | image/webp | 279 KB |
| ✅ | hero mobile (`images/banners/banner-mobile.webp`) | 200 | image/webp | 149 KB |
| ✅ | hero fluid (`images/banners/banner-fluid.webp`) | 200 | image/webp | 279 KB |
| ✅ | favicon.ico (`favicon.ico`) | 200 | image/vnd.microsoft.icon | 2 KB |

## Logo per viewport (browser ka `<source>` selection)

| result | viewport | file | display height | file width | required |
| --- | --- | --- | --- | --- | --- |
| ✅ | 320px | `logo-mobile.png` | 46px | 374px | ≥ 92px |
| ✅ | 375px | `logo-mobile.png` | 46px | 374px | ≥ 92px |
| ✅ | 390px | `logo-mobile.png` | 46px | 374px | ≥ 92px |
| ✅ | 430px | `logo-mobile.png` | 46px | 374px | ≥ 92px |
| ✅ | 768px | `logo-tablet.png` | 54px | 444px | ≥ 108px |
| ✅ | 1024px | `logo-desktop.png` | 60px | 514px | ≥ 120px |
| ✅ | 1366px | `logo-desktop.png` | 60px | 514px | ≥ 120px |
| ✅ | 1440px | `logo-desktop.png` | 60px | 514px | ≥ 120px |

## CSS (logo visibility)

| result | rule |
| --- | --- |
| ✅ | stylesheet load hui — /_next/static/chunks/08s~r_fpivrn3.css |
| ✅ | `.brand-lockup img` heights (46 → 54 → 60) |
| ✅ | `.brand-lockup img` object-fit: contain |
| ✅ | logo par koi display:none / visibility:hidden nahi |
| ✅ | hero `object-fit: contain` (crop nahi) |
| ✅ | category icon animation CSS live hai |
| ✅ | smooth page transition CSS live hai |
| ✅ | R48 palette + CTA sheen CSS live hai |
| ✅ | R49 button feel CSS live hai (hover lift + press) |
| ✅ | R49 maroon CTA par gradient + gold sheen live hai |
| ✅ | R49 footer maroon gradient + gold hairline live hai |
| ✅ | R48 PDP hover zoom CSS live hai (base image hat jaye) |
| ✅ | hero ratio har breakpoint par ek hi (1672/941, koi portrait nahi) |

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
| ✅ | root `/favicon.ico` 200 hai (browser ka default request) — HTTP 200 · image/vnd.microsoft.icon · 2054 bytes |
| ✅ | `/favicon.ico` asli ICO file hai (00 00 01 00 magic) — 2054 bytes · 2 icons |
| ✅ | favicon page par declare hai |
| ✅ | brand mark PNGs (128/180/192/512) square + maujood — 128×128 · 180×180 · 192×192 · 512×512 |
| ✅ | header menu (bars) icon |
| ✅ | header Size guide (panel button) |
| ✅ | header Our story link |
| ✅ | category icons page par hain (unique) |
| ✅ | 7 category circles, har ek ki alag image — 7 circles · 7 unique |
| ✅ | size guide: 3 tabs (Measurements Chart / Find My Size / How to Measure) |
| ✅ | size guide: inches/centimeters toggle |
| ✅ | size guide: chart XS se XXL (front length column ke saath) |
| ✅ | size guide: unstitched suit note (2.5 m + 2.25 m + XS to 5XL) |
| ✅ | size guide: front length value 46 (inches) chart me |

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
| ✅ | size guide (`pages/size-guide/`) | 200 |
| ✅ | our story (`pages/about-us/`) | 200 |

## Internal links (sample)

| result | link | HTTP |
| --- | --- | --- |
| ✅ | `/pussya-product/images/brand/logo-fluid.png` | 200 |
| ✅ | `/pussya-product/_next/static/chunks/08s~r_fpivrn3.css` | 200 |
| ✅ | `/pussya-product/_next/static/chunks/14-dwd6q-0nhb.js` | 200 |
| ✅ | `/pussya-product/manifest.webmanifest` | 200 |
| ✅ | `/pussya-product/favicon.ico` | 200 |
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
| ✅ | `/pussya-product/pages/about-us/` | 200 |
| ✅ | `/pussya-product/collections/noors-choice/` | 200 |
| ✅ | `/pussya-product/collections/wedding-collection/` | 200 |
| ✅ | `/pussya-product/products/kaumya-neon-elegant-sharara-suit-set/` | 200 |
| ✅ | `/pussya-product/products/pink-flared-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/adeena-black-faux-blooming-anarkali-style-sarara-suit-set-copy/` | 200 |
| ✅ | `/pussya-product/products/poshaako-pink-suit/` | 200 |
| ✅ | `/pussya-product/products/premium-maroon-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/premium-pink-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/copy-of-night-star-chocolate-colorembroidered-georgette-suit-set-td-120/` | 200 |
| ✅ | `/pussya-product/products/gulabo-trendy-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/rukmanis-red-coloured-anarkali-suit-set-td09/` | 200 |
| ✅ | `/pussya-product/collections/trending/` | 200 |
| ✅ | `/pussya-product/products/classic-red-karva-chauth-special-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/red-chilli-slit-anarkali-premium-suit-set/` | 200 |
| ✅ | `/pussya-product/products/designer-anarkali-suit-is-luxury-clothing-considered-to-be-high-quality-made-by-thread-sequins-embroidery-this-is-made-for-desirable-womens-who-deserve-it/` | 200 |
| ✅ | `/pussya-product/products/presenting-new-crunchy-silk-fabric-with-embroidery-sequence-dori-and-jari-work-top-with-dupatta-set-bell-bottom-pent-ready-to-wear/` | 200 |
| ✅ | `/pussya-product/products/kaumya-neon-elegant-sharara-suit-set-6061-sky/` | 200 |
| ✅ | `/pussya-product/products/neha-heavy-pure-vichitra-anarkali-suit-set/` | 200 |
| ✅ | `/pussya-product/products/nehas-premium-anarkali-suit-set/` | 200 |

## Summary

❌ 3 problem mili:

- build ne sheet se number liya (bake hua) — nahi — apps-script: empty · published-csv: empty · sheet-gviz: HTTP 401 · live-store: HTTP 404
- WhatsApp number sheet se live aaya (wa.me/<10+ digits>) — wa.me par number nahi mila (chat picker = sheet se number nahi aaya)
- number 10 digit ka valid Indian mobile hai — —

> build settings: apps-script: empty · published-csv: empty · sheet-gviz: HTTP 401 · live-store: HTTP 404
