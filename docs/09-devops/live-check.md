# Live site check — https://mystorebyme.github.io/pussya-product/

Ran: 2026-10-29T05:50:24.908Z

## Page

| result | check |
| --- | --- |
| ❌ | home page 200 — HTTP 403 · 5314 bytes · 198ms |
| ❌ | brand name page par hai |
| ❌ | header render hua hai |
| ❌ | header me brand-lockup hai |
| ❌ | hero banner section hai |
| ✅ | no payment UI on the storefront (no 'Pay on UPI', no UPI deep link) |
| ❌ | home par WhatsApp flow ka zikr hai (koi payment claim nahi) |
| ❌ | WhatsApp FAB home par (bottom-right) |
| ❌ | WhatsApp FAB product page par bhi |
| ❌ | Daily Special ribbon ya maroon announcement strip hai |
| ❌ | WhatsApp number sheet se live aaya (wa.me/<10+ digits>) — wa.me par number nahi mila (chat picker = sheet se number nahi aaya) |
| ✅ | number ek hi hai (header/footer/FAB me mismatch nahi) |
| ❌ | number 10 digit ka valid Indian mobile hai — — |
| ❌ | checkout page 200 — HTTP 403 |
| ❌ | checkout page par WhatsApp hand-off copy hai |
| ✅ | checkout par koi payment step / UPI nahi |
| ✅ | checkout copy English hai (koi Hinglish marker nahi) |
| ❌ | header logo <picture> mila |
| ❌ | logo srcset base path ke saath hai (/pussya-product/...) |
| ❌ | logo img par alt text hai |
| ❌ | logo img par `hidden` / `opacity-0` jaisi class nahi |

<details><summary>header markup (proof)</summary>

```html

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
| ❌ | manifest (`manifest.webmanifest`) | 403 | text | 5396 B |
| ✅ | hero desktop (`images/banners/banner-desktop.webp`) | 200 | image/webp | 279 KB |
| ✅ | hero tablet (`images/banners/banner-tablet.webp`) | 200 | image/webp | 279 KB |
| ✅ | hero mobile (`images/banners/banner-mobile.webp`) | 200 | image/webp | 149 KB |
| ✅ | hero fluid (`images/banners/banner-fluid.webp`) | 200 | image/webp | 279 KB |
| ✅ | favicon.ico (`favicon.ico`) | 200 | image/vnd.microsoft.icon | 2 KB |

## Logo per viewport (browser ka `<source>` selection)

| result | viewport | file | display height | file width | required |
| --- | --- | --- | --- | --- | --- |
| ❌ | 320px | `` | 46px | ?px | ≥ 92px |
| ❌ | 375px | `` | 46px | ?px | ≥ 92px |
| ❌ | 390px | `` | 46px | ?px | ≥ 92px |
| ❌ | 430px | `` | 46px | ?px | ≥ 92px |
| ❌ | 768px | `` | 54px | ?px | ≥ 108px |
| ❌ | 1024px | `` | 60px | ?px | ≥ 120px |
| ❌ | 1366px | `` | 60px | ?px | ≥ 120px |
| ❌ | 1440px | `` | 60px | ?px | ≥ 120px |

## CSS (logo visibility)

| result | rule |
| --- | --- |
| ❌ | stylesheet load hui — koi css link nahi |
| ❌ | `.brand-lockup img` heights (46 → 54 → 60) |
| ❌ | `.brand-lockup img` object-fit: contain |
| ✅ | logo par koi display:none / visibility:hidden nahi |
| ❌ | hero `object-fit: contain` (crop nahi) |
| ❌ | category icon animation CSS live hai |
| ❌ | smooth page transition CSS live hai |
| ❌ | R48 palette + CTA sheen CSS live hai |
| ❌ | R49 button feel CSS live hai (hover lift + press) |
| ❌ | R49 maroon CTA par gradient + gold sheen live hai |
| ❌ | R49 footer maroon gradient + gold hairline live hai |
| ❌ | R48 PDP hover zoom CSS live hai (base image hat jaye) |
| ❌ | hero ratio har breakpoint par ek hi (1672/941, koi portrait nahi) |

## Copy

| result | check |
| --- | --- |
| ✅ | purana brand (Liksha) nahi |
| ✅ | 'free shipping' claim nahi |
| ❌ | Diwali offer copy hai |

## SEO / meta

| result | check |
| --- | --- |
| ✅ | title — Just a moment... |
| ❌ | meta description |
| ❌ | canonical |
| ❌ | lang attribute |
| ❌ | favicon links |
| ✅ | root `/favicon.ico` 200 hai (browser ka default request) — HTTP 200 · image/vnd.microsoft.icon · 2054 bytes |
| ✅ | `/favicon.ico` asli ICO file hai (00 00 01 00 magic) — 2054 bytes · 2 icons |
| ❌ | favicon page par declare hai |
| ✅ | brand mark PNGs (128/180/192/512) square + maujood — 128×128 · 180×180 · 192×192 · 512×512 |
| ❌ | header menu (bars) icon |
| ❌ | header Size guide (panel button) |
| ❌ | header Our story link |
| ❌ | category icons page par hain (unique) |
| ❌ | 7 category circles, har ek ki alag image — 0 circles · 0 unique |
| ❌ | size guide: 3 tabs (Measurements Chart / Find My Size / How to Measure) |
| ❌ | size guide: inches/centimeters toggle |
| ❌ | size guide: chart XS se XXL (front length column ke saath) |
| ❌ | size guide: unstitched suit note (2.5 m + 2.25 m + XS to 5XL) |
| ❌ | size guide: front length value 46 (inches) chart me |

## Key pages

| result | page | HTTP |
| --- | --- | --- |
| ❌ | collections index (`collections/`) | 403 |
| ❌ | cart (`cart/`) | 403 |
| ❌ | checkout (`checkout/`) | 403 |
| ❌ | track order (`track-order/`) | 403 |
| ❌ | contact (`pages/contact/`) | 403 |
| ❌ | shipping policy (`policies/shipping-policy/`) | 403 |
| ❌ | returns policy (`policies/refund-and-return-policy/`) | 403 |
| ❌ | search (`search/`) | 403 |
| ❌ | size guide (`pages/size-guide/`) | 403 |
| ❌ | our story (`pages/about-us/`) | 403 |

## Internal links (sample)

| result | link | HTTP |
| --- | --- | --- |

## Summary

❌ 64 problem mili:

- home page 200 — HTTP 403 · 5314 bytes · 198ms
- brand name page par hai
- header render hua hai
- header me brand-lockup hai
- hero banner section hai
- home par WhatsApp flow ka zikr hai (koi payment claim nahi)
- WhatsApp FAB home par (bottom-right)
- WhatsApp FAB product page par bhi
- Daily Special ribbon ya maroon announcement strip hai
- WhatsApp number sheet se live aaya (wa.me/<10+ digits>) — wa.me par number nahi mila (chat picker = sheet se number nahi aaya)
- number 10 digit ka valid Indian mobile hai — —
- checkout page 200 — HTTP 403
- checkout page par WhatsApp hand-off copy hai
- header logo <picture> mila
- logo srcset base path ke saath hai (/pussya-product/...)
- logo img par alt text hai
- logo img par `hidden` / `opacity-0` jaisi class nahi
- manifest → HTTP 403 (manifest.webmanifest)
- logo @320px →  (HTTP 403, width 0)
- logo @375px →  (HTTP 403, width 0)
- logo @390px →  (HTTP 403, width 0)
- logo @430px →  (HTTP 403, width 0)
- logo @768px →  (HTTP 403, width 0)
- logo @1024px →  (HTTP 403, width 0)
- logo @1366px →  (HTTP 403, width 0)
- logo @1440px →  (HTTP 403, width 0)
- stylesheet load hui — koi css link nahi
- `.brand-lockup img` heights (46 → 54 → 60)
- `.brand-lockup img` object-fit: contain
- hero `object-fit: contain` (crop nahi)
- category icon animation CSS live hai
- smooth page transition CSS live hai
- R48 palette + CTA sheen CSS live hai
- R49 button feel CSS live hai (hover lift + press)
- R49 maroon CTA par gradient + gold sheen live hai
- R49 footer maroon gradient + gold hairline live hai
- R48 PDP hover zoom CSS live hai (base image hat jaye)
- hero ratio har breakpoint par ek hi (1672/941, koi portrait nahi)
- Diwali offer copy hai
- meta description
- canonical
- lang attribute
- favicon links
- favicon page par declare hai
- header menu (bars) icon
- header Size guide (panel button)
- header Our story link
- category icons page par hain (unique)
- 7 category circles, har ek ki alag image — 0 circles · 0 unique
- size guide: 3 tabs (Measurements Chart / Find My Size / How to Measure)
- size guide: inches/centimeters toggle
- size guide: chart XS se XXL (front length column ke saath)
- size guide: unstitched suit note (2.5 m + 2.25 m + XS to 5XL)
- size guide: front length value 46 (inches) chart me
- collections index → HTTP 403
- cart → HTTP 403
- checkout → HTTP 403
- track order → HTTP 403
- contact → HTTP 403
- shipping policy → HTTP 403
- returns policy → HTTP 403
- search → HTTP 403
- size guide → HTTP 403
- our story → HTTP 403
