# Logo fix + website audit — report

**Date:** 27 Oct 2026 · **Branch:** `arena/f2c07741-pussya-product` · **Live:** https://mystorebyme.github.io/pussya-product/

---

## 1. Root cause — logo "invisible"

Do alag-alag defects the, dono asli source me fix hue:

| # | Defect | Kahan | Asar |
| --- | --- | --- | --- |
| 1 | Wordmark crop `top: H * 0.55` se shuru hota tha | `scripts/brand/build-responsive-assets.mjs` | NOOR ke N/O ke upar ka curve **kat jaata tha** — header me adhoora (kata hua) logo |
| 2 | Logo ka koi fallback nahi tha | `brand-lockup.tsx` | asset/network fail = khaali white box; user ko "logo invisible" |

Aur do supporting defects (audit me mile):

| # | Defect | Asar |
| --- | --- | --- |
| 3 | Apple touch icon `sizes="180x180"` declare karta tha par file **192×192** thi | iOS icon galat scale |
| 4 | Account page ka "contact page" link `/contact` par jaata tha — **wo route exist nahi karta** | 404 link |

---

## 2. Fixes (files + why)

| File | Change | Why |
| --- | --- | --- |
| `scripts/brand/build-responsive-assets.mjs` | wordmark band **image ke ink-profile se detect** hota hai (side-edges se top, gap-detect se bottom) + upar **soft fade** | letters kabhi kut-te nahi, emblem ka upar ka hissa ek design-fade jaisa lagta hai |
| `apps/web/public/images/brand/logo-{desktop,tablet,mobile}.png` | naye crop: 427×190, 369×164, 310×138 (ratio 2.25:1, koi stretch/upscale nahi) | poora `NOOR` + `ETHNIC WEAR` + dono gold ornaments |
| `apps/web/public/images/brand/logo-mark-180.png` | **naya** real 180×180 apple icon | iOS declared size = asli size |
| `apps/web/src/components/brand-mark.tsx` | **naya** client component: `onError` → text lockup (NOOR / ETHNIC WEAR), `fetchPriority="high"` | logo **kabhi invisible nahi** — asset fail ho to bhi brand dikhta hai |
| `apps/web/src/components/brand-lockup.tsx` | `<picture>` markup `BrandMark` me shift; ek hi source of truth (header + footer + drawer) | duplicate markup hata, fallback sab jagah |
| `apps/web/src/app/globals.css` | logo heights `44 → 52 → 58px`, fallback `min-height`, `object-fit: contain` | bada + sharp logo, kabhi stretch/crop nahi |
| `apps/web/src/components/site-header.tsx` | header bar `66 / 74 / 74px` | 58px logo saans le, nav overlap na ho |
| `apps/web/src/config/site.ts` | `BRAND_V = "?v=3"` cache-bust | browser/CDN purana kata hua logo cache se na dikhaye |
| `apps/web/src/app/layout.tsx` | apple icon `mark180`, manifest/icons wahi | favicon/PWA/tab identity |
| `apps/web/src/app/account/page.tsx` | `/contact` → `/pages/contact` | 404 gaya |

### Logo paths (as deployed)

- Header: `/pussya-product/images/brand/logo-{desktop,tablet,mobile}.png?v=3` (`<picture>` — desktop ≥1024, tablet 768–1023, mobile <768)
- Footer / drawer: `/pussya-product/images/brand/logo-fluid.png?v=3`
- Favicon: `logo-mark-128.png`, `logo-mark-192.png`, `logo-mark-512.png`
- Apple touch icon: `logo-mark-180.png`
- PWA manifest: `manifest.webmanifest` → 192 + 512

---

## 3. Audit — jo check hua aur jo mila

### Static audit (exact `dist/` jo deploy hota hai)
`node scripts/audit/static-audit.mjs dist`

```
pages 486 · internal refs 34397 · brand assets 10 · alt-missing 0 · decorative alt="" 5422
✔ saare internal links/assets resolve ho rahe hain
```
- 486 prerendered pages, ~34k internal refs (href/src/srcSet) — **ek bhi missing file nahi**
- `<img>` alt: **0 missing** (`alt=""` 5422 = jaan-boojh kar decorative hover/detail images)
- title / meta description / canonical / favicon link — har page par maujood

### Live audit (deployed GitHub Pages URL, asli HTTP)
`Actions → Live site check` → report: [`docs/09-devops/live-check.md`](./live-check.md)

| Section | Result |
| --- | --- |
| Page (brand, header, brand-lockup, hero) | ✅ saare |
| Logo `<picture>` + base path + alt + koi `hidden/opacity-0` nahi | ✅ |
| Assets (3 logo + footer logo + 4 favicon + manifest + 3 hero banner) | ✅ sab HTTP 200, `image/png` / `image/webp` |
| **Logo per viewport 320 / 375 / 390 / 430 / 768 / 1024 / 1366 / 1440** | ✅ 8/8 (file width ≥ 2× display height) |
| CSS: heights 44→52→58, `object-fit: contain`, koi `display:none`, hero contain | ✅ |
| Copy: no "Liksha", no "Free shipping", Diwali offer present | ✅ |
| SEO: title / description / canonical / lang / favicons | ✅ |
| Key pages: collections, cart, checkout, track-order, contact, shipping + returns policy, search | ✅ 8/8 HTTP 200 |
| Internal links sample (40 links) | ✅ 0 broken |

### Responsive (markup + asset-level, koi browser nahi)
- `tests/e2e/breakpoints.mjs`: **50 passed / 0 failed** — 320, 360, 375, 390, 430, 480, 640, 767, 768, 820, 900, 1023, 1024, 1100, 1280, 1366, 1440, 1600, 1920 — har width par sahi file + crop-free ratio
- `tests/e2e/responsive.mjs`: **44 passed / 0 failed** — logo heights, hero ratios, cart/nav/UPI copy, container widths

### Functional (localhost production-ish build)
- `tests/e2e/smoke.mjs`: **106 passed / 5 failed** — sab 5 **environment** ke hain: local me Google Sheet / support number configured nahi (`/api/settings` khaali) → "home has support number", "live announcement", contact WhatsApp channel, sheet-health. Sheet connect hone par ye apne aap pass ho jaate hain (yahi checks live site par sheet ke saath chalte hain).
- `tests/e2e/links.mjs`: **40 pages, 0 failed**
- Order flow verified end-to-end: order create → order page 200 → `public?fresh=1` 200 → invoice `403` without phone → `200` with last-4 digits (GST PDF) → admin verify 200
- `tests/e2e/round16.mjs`: **39 passed / 0 failed** (2 purane expectations aaj ke sach par update: offer 75%, dead `wa.me/91` link allowed nahi)

### Unit / build
- `npm run test:unit`: **316 passed / 0 failed** (naye `round43` 6 + `round44` 9)
- `npm run lint --workspace @noor/web`: **0 errors** (34 pre-existing warnings, CI gate 40)
- `npm run typecheck`: clean
- `npm run catalog:verify`: ok (446 products, 2898 unique images)
- `npm run build --workspace @noor/web` + `scripts/pages/build-preview.mjs`: ok

---

## 4. Deploy status

| Run | Result |
| --- | --- |
| GitHub Pages preview (`build → deploy → smoke`) — commit `61e65b7` | ✅ build 52s · deploy 8s · smoke 4s |
| Live site check (`61e65b7`) | ✅ "Saare live checks pass" |
| Live URL | https://mystorebyme.github.io/pussya-product/ |

Har push par: static build → Pages deploy → **live smoke** (WAIT: site par Noor content, banner, no Liksha, no free-shipping) → **live-check** (logo, favicons, CSS, key pages, links) → report commit.

---

## 5. Jo verify nahi kar saka (honest list)

- **Screenshot-based visual diff** — is sandbox me Chromium/Playwright available nahi (download blocked). Iske badle: markup + compiled CSS + asli asset pixel sizes + live HTTP checks. Header logo ka real-size render `docs/09-devops/header-logo-preview.png` me hai (sharp se, browser ke bina).
- **Console errors / JS runtime** — browser nahi hai. Static export me hydration errors ka risk kam hai; live-check me JS/CSS assets 200 hain. Browser me DevTools check aap kar sakte hain.
- **Vercel deployment** — aapke Vercel account me deploy mere paas nahi (token nahi maangta). Button: `docs/09-devops/vercel-deploy.md`.
- **Sheet me live data** — Apps Script deploy ho gaya, par token set + Vercel env aapke browser/account se hone hain (`docs/09-devops/owner-setup-checklist.md`, Kaam 1–3). Uske baad `Actions → Sheet self-check` chala kar proof milta hai ki data sheet me ja raha hai.

---

## 6. Manual steps (aapke liye, 2 min)

1. Repo → Settings → Pages → source **GitHub Actions** (pehle se set hai) — aur Actions me pichhle template workflows *"Deploy Jekyll with GitHub Pages dependencies preinstalled"* + *"Deploy static content to Pages"* ko **Disable** kar dein (mere token ke paas permission nahi; ye `main` par chalte hain aur deploy ke upar chadh sakte hain).
2. Sheet token ek baar browser me kholiye: `<exec URL>?action=set_token&token=…` (checklist Kaam 2b/3).
3. Sheet `Settings` me asli `upi_id` + `whatsapp` daaliye.
