# R47 — reference-inspired polish (sirf kuch cheezein, copy nahi)

**Date:** 27 Oct 2026 · **Branch:** `arena/f2c07741-pussya-product` · **Live:** https://mystorebyme.github.io/pussya-product/

Owner: *"ye website ko pura copy nahi karna, only kuch kuch cheezein copy karni hai —
header ka bar icon, size guide, our story header me, size guide kholne par uski saari
cheezein check kar lein, category icon unique + animated, aur website ki smoothness."*

Reference site (sagafabrics.in) sirf **ideas/patterns** ke liye dekhi gayi:

| Liya (idea) | Nahi liya (jaan-boojh kar) |
| --- | --- |
| header me bars (menu) icon har screen par | unka text/copy, product descriptions |
| "Size guide" header me, kholne par ek panel | unki photos, logo, brand assets |
| "Our story" header me | unke prices, offers, bundle claims |
| category circles par pehchan | unka page layout poora-poora |
| chart me inches/cm toggle + measure steps | unke customer reviews/ratings |

**Koi bhi text, image, product, review ya policy unki site se copy nahi hui.** Numbers
(size chart) wahi hain jo hamari site par pehle se publish the.

---

## 1. Header

| Cheez | Kahan | Kya |
| --- | --- | --- |
| Bars (menu) icon | har screen | Pehle sirf phone par tha (`lg:hidden`). Ab desktop par bhi — chhota "Menu" label ke saath. Wahi drawer khulta hai. |
| Size guide | desktop nav + drawer | Page change **nahi** hota — slide-over panel khulta hai (shopping flow tootta nahi). |
| Our story | desktop nav + drawer | `/pages/about-us` (pehle se maujood page; naya duplicate nahi banaya). |
| HOME | desktop nav se hataya | Logo hi home ka link hai, jagah bachi. |

## 2. Size guide — kholne par "saari cheezein"

`components/size-guide-dialog.tsx` (layout me ek hi instance, har page par available):

- **Inches / Cm toggle** — chart turant convert hota hai (1 inch = 2.54 cm).
- **Poori chart** — S, M, L, XL, XXL × bust, waist, hip, bottom length.
- **How to measure** — 4 steps (bust, waist, hip, bottom) + har step ka practical tip.
- **Fit tips** — 4 lines (do size ke beech, bust sabse pehle, product page par size confirm, WhatsApp help).
- **Help** — "Ask on WhatsApp" (number sheet se, hardcode nahi) + "Full size guide" page link.
- **Behaviour** — Escape se band, background scroll lock, `aria-modal`, close button par focus.
- Number **ek hi jagah** se aate hain: `lib/size-chart.ts`. Panel, `/pages/size-guide` page
  aur product page — teeno wahi data use karte hain, isliye kabhi alag nahi honge.

Product page (PDP) ka "Size guide" link bhi ab panel kholta hai (pehle page par le jaata tha).

## 3. Category icons — unique + animated

`components/category-icon.tsx` — **7 hand-drawn gold line-art icons**, ek family:

| Category | Icon |
| --- | --- |
| Anarkali Suit | chhota bodice + bada flare |
| Lehenga Choli | choli + pleated skirt |
| Printed Suit Set | kurta + lehraya dupatta |
| New Arrivals / Trending | sparkle (do size ke stars) |
| Noor's Choice | crown emblem (brand ka apna motif) |
| Sale | price tag + % |
| Wedding Collection | mandap arch + marigold dots |
| (default) | hanger |

Animation (sab CSS, koi library nahi):

1. **draw** — stroke `dashoffset` 1 → 0, har path thoda delay se (line "likhti" hai),
2. **pop** — gold dots scale 0 → 1,
3. **float** — poora icon 1.4px upar-neeche (3.6s, gentle),
4. **shimmer** — hover par badge me gold chamak (sirf `hover: hover` devices).

`prefers-reduced-motion: reduce` par chaaron band (icons turant poori tarah dikhte hain).
Preview: `docs/09-devops/category-icons.png`.

Kahan dikhte hain: home ke category circles (badge me), `/collections` cards (corner badge).

## 4. Smoothness ("website ki smoothness")

| Fix | Asar |
| --- | --- |
| `PageTransition` (fade + 8px slide, 0.34s) | page change par hard-cut nahi |
| Drawer/panel slide (`motion-drawer-left`, `motion-panel-right`) + backdrop fade | menu aur cart "khulte" dikhte hain |
| `-webkit-tap-highlight-color: transparent` | mobile par tap flash nahi |
| `:focus-visible` ring (2px maroon) | keyboard user ko dikhta hai, mouse user ko box nahi |
| `html { scroll-padding-top }` (118px / 84px) | sticky header anchor ke upar nahi aata |
| `smooth-lift` (sirf pointer devices) | collection card hover par halka uthna + soft shadow |
| `prefers-reduced-motion` | upar wale sab effects off |

## 5. Verification

| Suite | Result |
| --- | --- |
| `npm run test:unit` | **330 pass / 0 fail** (R47 ke 7 naye guards) |
| `npm run test:responsive` | 44 pass / 0 fail |
| `breakpoints` (320 → 1440) | 50 pass / 0 fail |
| `links` / `round16` | 40 pages 0 fail / 35 pass 0 fail |
| `smoke` | 106 pass / 5 fail (wahi 5 = sandbox me sheet/UPI env nahi) |
| static audit (`dist`) | 486 pages · 34,924 refs · 0 broken |
| lint / typecheck | 0 errors / clean |
| **Live check** (run `40556832158`) | **105 ✅ / 0 ❌ — "Saare live checks pass"** |

Live proof me naye checks: header menu icon, header Size guide, header Our story,
"category icons page par hain (unique)" (7 unique), "category icon animation CSS live",
"smooth page transition CSS live", aur key pages me `pages/size-guide` + `pages/about-us` = 200.

## 6. Jo verify nahi kar saka

- **Asli browser me animation dekhna** — sandbox me Chromium nahi. CSS keyframes +
  compiled CSS + markup se verify kiya; icons ka render `docs/09-devops/category-icons.png`.
- **Aapki taste** — icon ka style (gold line-art) aur panel ki width aap dekh kar bataayein;
  badalna ek file ka kaam hai.
