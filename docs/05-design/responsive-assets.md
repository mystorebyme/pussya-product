# Responsive UI — logo, hero aur header (har screen size)

Ye doc batata hai ki **kaunsa asset kis screen par** aata hai, assets kaise bante hain
aur kaise verify karein. Sab kuch owner ke original files se — koi logo/banner redraw
nahi hua.

## 1. Asset pipeline (ek command)

```bash
node scripts/brand/build-responsive-assets.mjs     # assets banao
node scripts/brand/render-proof.mjs                # proof sheet (docs/assets/responsive-proof.png)
```

Inputs (repo me committed, owner ke uploads):

| File | Kya hai |
| --- | --- |
| `assets/source/logo-original.png` | official 3D gold logo, transparent (1322×1190) |
| `assets/source/hero-wide-original.png` | wide Diwali banner (2043×770, header baked) |
| `assets/source/hero-portrait-original.png` | portrait Diwali poster (1024×1536) |

Script sirf `crop / trim / resize / WebP` karta hai. Header logo unki hi wide banner ke
header se crop hota hai (wahi flat version jo mockup me dikhta hai), taaki screen par
bilkul wahi logo dikhe — letters ke shapes badle nahi.

## 2. Logo assets

| File | Size | Kahan | Kab |
| --- | --- | --- | --- |
| `images/brand/logo-mobile.png` | 403×112 | header | < 768px |
| `images/brand/logo-tablet.png` | 545×130 | header | 768–1023px |
| `images/brand/logo-desktop.png` | 629×150 | header, invoice masthead | ≥ 1024px |
| `images/brand/logo-fluid.png` | 660×397 (stacked) | footer, drawer-friendly, invoice | koi bhi |
| `images/brand/logo-mark-128.png` | 128×128 | favicon | — |
| `images/brand/logo-mark-192.png` | 192×192 | Apple touch icon, PWA 192 | — |
| `images/brand/logo-mark-512.png` | 512×512 | PWA 512, invoice PDF mark | — |

Display heights (`apps/web/src/app/globals.css` → `.brand-lockup`):

| Breakpoint | Height | File |
| --- | --- | --- |
| < 768px | 40px | `logo-mobile.png` |
| 768–1023px | 50px | `logo-tablet.png` |
| ≥ 1024px | 46px (horizontal, lamba) | `logo-desktop.png` |
| footer (stacked) | 92 / 108px | `logo-fluid.png` |
| drawer (`size="compact"`) | 34px | mobile variant |

Logo `<picture>` se aata hai — browser **sirf ek** file download karta hai.

## 3. Hero banners

| File | Size | Kahan | CSS box |
| --- | --- | --- | --- |
| `images/banners/banner-mobile.webp` | 860×1290 (~221 KB) | < 768px | `aspect-[860/1290]` |
| `images/banners/banner-tablet.webp` | 1200×900 (~150 KB) | 768–1023px | `md:aspect-[4/3]` |
| `images/banners/banner-desktop.webp` | 1779×594 (~156 KB) | ≥ 1024px | `lg:aspect-[1779/594]` |
| `images/banners/banner-fluid.webp` | 1600×534 (~117 KB) | flexible/embed use | `object-fit: cover` |

- **Desktop** banner wide source ka header-strip-free crop hai; source me baked do
  carousel arrows (jo clickable lagte hain par sirf tasveer hain) side trim se hata diye.
- **Tablet** = portrait poster 4:3 canvas ke centre me + usi poster ka blurred backdrop.
  Isliye koi chehra/kapda/text crop nahi hota (models kinaron par nahi kat-te) aur
  4:3 box bhi bhara rehta hai.
- **Mobile** = portrait poster, halka side crop (0.68 ratio) taaki phone par bada dikhe.
- Har `aspect-ratio` file ke asli ratio ke barabar hai → **koi stretch/crop nahi**, aur
  `width/height` attributes se layout shift (CLS) zero.

## 4. Breakpoints

| Range | Header | Logo | Hero |
| --- | --- | --- | --- |
| 320–767px | hamburger + centred logo + search/cart (wishlist `sm` se, account `md` se) | mobile | portrait |
| 768–1023px | hamburger + centred logo + 4 icons | tablet | 4:3 |
| 1024–1439px | logo + poori nav + 4 icons | desktop | wide |
| ≥ 1440px | same, extra spacing, cart par `count / ₹` | desktop | wide |

Guard rails: header mobile par CSS grid `auto 1fr auto` (logo kabhi icons ke neeche nahi
jaata), `html/body { overflow-x: clip }`, `min-w-0` nav, aur `clamp()`-free fixed heights
jo har breakpoint par explicitly set hain.

## 5. Verify (bina browser)

```bash
BASE_URL=http://127.0.0.1:3100 node tests/e2e/breakpoints.mjs   # 18 viewports + asset sizes
BASE_URL=http://127.0.0.1:3100 node tests/e2e/responsive.mjs    # markup + CSS rules
BASE_URL=http://127.0.0.1:3100 node tests/e2e/smoke.mjs         # poora storefront smoke
```

`breakpoints.mjs` har viewport (320×568, 360×800, 390×844, 430×932, 768×1024, 820×1180,
1024×768, 1280×800, 1366×768, 1440×900, 1920×1080 + intermediate 480/640/767/900/1023/1100/1600)
ke liye decide karta hai ki kaunsa `<source media>` match hoga, aur us asset ka asli pixel
size + ratio check karta hai.

> Sandbox me Chromium nahi chalta (Playwright download blocked), isliye real screenshot
> diff yahan nahi hota. Uske badle `scripts/brand/render-proof.mjs` **asli assets + asli CSS
> heights** se ek proof sheet banata hai: `docs/assets/responsive-proof.png` (har device ka
> header + hero, geometry exactly CSS jaisi).

## 6. Footer / socials

- Instagram abhi **sirf URL text** hai (clickable nahi): `https://www.instagram.com/noorethnicwear`
  (`siteConfig.socials.instagram`). Link chalu karna ho to footer me `<span>` ko `<a href>` kar dena.
- WhatsApp hi working link hai (`https://wa.me/`).
- Facebook/Pinterest ke dummy links hata diye gaye (accounts nahi hain).

## 7. Checkout UPI

Checkout par GPay/PhonePe/Paytm/BHIM/Amazon Pay ke alag buttons **hata diye** —
sirf QR + UPI ID + "Open UPI app" + "Copy UPI ID". `upi://pay` kholne par phone khud
saare installed UPI apps dikhata hai. Order page par per-app chips abhi bhi available hain
(`UpiApps` ka `showAppButtons` default `true`, checkout par `false`).
