# Live site check — https://mystorebyme.github.io/pussya-product/

> URLs tried (first live one wins): https://mystorebyme.github.io/pussya-product/ · https://noorethnicwear.store/

Ran: 2026-10-29T06:49:21.837Z

## Page

| result | check |
| --- | --- |
| ❌ | home page 200 — HTTP 404 · 9115 bytes · 10ms |
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
| ❌ | checkout page 200 — HTTP 404 |
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
| ❌ | header logo (desktop) (`images/brand/logo-desktop.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | header logo (tablet) (`images/brand/logo-tablet.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | header logo (mobile) (`images/brand/logo-mobile.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | footer logo (`images/brand/logo-fluid.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | favicon 128 (`images/brand/logo-mark-128.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | apple touch 180 (`images/brand/logo-mark-180.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | PWA 192 (`images/brand/logo-mark-192.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | PWA 512 (`images/brand/logo-mark-512.png`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | manifest (`manifest.webmanifest`) | 404 | text | 9379 B |
| ❌ | hero desktop (`images/banners/banner-desktop.webp`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | hero tablet (`images/banners/banner-tablet.webp`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | hero mobile (`images/banners/banner-mobile.webp`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | hero fluid (`images/banners/banner-fluid.webp`) | 404 | text/html; charset=utf-8 | 9 KB |
| ❌ | favicon.ico (`favicon.ico`) | 404 | text/html; charset=utf-8 | 9 KB |

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
| ✅ | title — Site not found &middot; GitHub Pages |
| ❌ | meta description |
| ❌ | canonical |
| ❌ | lang attribute |
| ❌ | favicon links |
| ❌ | root `/favicon.ico` 200 hai (browser ka default request) — HTTP 404 · text/html; charset=utf-8 · 9379 bytes |
| ❌ | `/favicon.ico` asli ICO file hai (00 00 01 00 magic) — nahi mila |
| ❌ | favicon page par declare hai |
| ❌ | brand mark PNGs (128/180/192/512) square + maujood — null×null · null×null · null×null · null×null |
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
| ❌ | collections index (`collections/`) | 404 |
| ❌ | cart (`cart/`) | 404 |
| ❌ | checkout (`checkout/`) | 404 |
| ❌ | track order (`track-order/`) | 404 |
| ❌ | contact (`pages/contact/`) | 404 |
| ❌ | shipping policy (`policies/shipping-policy/`) | 404 |
| ❌ | returns policy (`policies/refund-and-return-policy/`) | 404 |
| ❌ | search (`search/`) | 404 |
| ❌ | size guide (`pages/size-guide/`) | 404 |
| ❌ | our story (`pages/about-us/`) | 404 |

## Internal links (sample)

| result | link | HTTP |
| --- | --- | --- |

## Summary

❌ 80 problem mili:

- home page 200 — HTTP 404 · 9115 bytes · 10ms
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
- checkout page 200 — HTTP 404
- checkout page par WhatsApp hand-off copy hai
- header logo <picture> mila
- logo srcset base path ke saath hai (/pussya-product/...)
- logo img par alt text hai
- logo img par `hidden` / `opacity-0` jaisi class nahi
- header logo (desktop) → HTTP 404 (images/brand/logo-desktop.png)
- header logo (tablet) → HTTP 404 (images/brand/logo-tablet.png)
- header logo (mobile) → HTTP 404 (images/brand/logo-mobile.png)
- footer logo → HTTP 404 (images/brand/logo-fluid.png)
- favicon 128 → HTTP 404 (images/brand/logo-mark-128.png)
- apple touch 180 → HTTP 404 (images/brand/logo-mark-180.png)
- PWA 192 → HTTP 404 (images/brand/logo-mark-192.png)
- PWA 512 → HTTP 404 (images/brand/logo-mark-512.png)
- manifest → HTTP 404 (manifest.webmanifest)
- hero desktop → HTTP 404 (images/banners/banner-desktop.webp)
- hero tablet → HTTP 404 (images/banners/banner-tablet.webp)
- hero mobile → HTTP 404 (images/banners/banner-mobile.webp)
- hero fluid → HTTP 404 (images/banners/banner-fluid.webp)
- favicon.ico → HTTP 404 (favicon.ico)
- logo @320px →  (HTTP 200, width 0)
- logo @375px →  (HTTP 200, width 0)
- logo @390px →  (HTTP 200, width 0)
- logo @430px →  (HTTP 200, width 0)
- logo @768px →  (HTTP 200, width 0)
- logo @1024px →  (HTTP 200, width 0)
- logo @1366px →  (HTTP 200, width 0)
- logo @1440px →  (HTTP 200, width 0)
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
- root `/favicon.ico` 200 hai (browser ka default request) — HTTP 404 · text/html; charset=utf-8 · 9379 bytes
- `/favicon.ico` asli ICO file hai (00 00 01 00 magic) — nahi mila
- favicon page par declare hai
- brand mark PNGs (128/180/192/512) square + maujood — null×null · null×null · null×null · null×null
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
- collections index → HTTP 404
- cart → HTTP 404
- checkout → HTTP 404
- track order → HTTP 404
- contact → HTTP 404
- shipping policy → HTTP 404
- returns policy → HTTP 404
- search → HTTP 404
- size guide → HTTP 404
- our story → HTTP 404

## URLs probed (DNS + HTTP)

| URL | DNS | HTTP | redirect |
| --- | --- | --- | --- |
| https://mystorebyme.github.io/pussya-product/ | 2606:50c0:8001::153,2606:50c0:8002::153,2606:50c0:8000::153,2606:50c0:8003::153 | 301 | http://noorethnicwear.store/ |
| https://noorethnicwear.store/ | 185.199.111.153,185.199.110.153,185.199.108.153,185.199.109.153 | 000 | 000 - |
