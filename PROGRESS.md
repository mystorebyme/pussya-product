# Progress — Noor Ethnic Wear

**Last updated:** 2026-10-27 (R45: owner ka naya gold logo + naya Diwali banner + favicon/manifest bugs)

## Kya ready hai

| Area | State | Kaise check karein |
| --- | --- | --- |
| Storefront (home, collections, product pages, gallery, cart, checkout, order tracking, invoices, policies) | ✅ chalta hai | `npm run dev` → http://localhost:3000 |
| Owner panel (login, orders + timeline, stock, price, invoices, tracking, reviews, messages, coupons, settings, Sheet status) | ✅ chalta hai | `npm run dev:admin` → http://localhost:3001 |
| REST API | ✅ chalta hai | `npm run dev:api` → http://localhost:4000 |
| **Google Sheet = owner ka control panel** | ✅ **sheet ban gayi** — 16 tabs + headers + Settings keys ([link](https://docs.google.com/spreadsheets/d/1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo/edit)); Apps Script `/exec` URL + token env me daalne hain | `docs/09-devops/google-sheets.md` |
| Sheet tabs ke ready CSV (16) | ✅ saari **16 tabs me header row likh di gayi** (Settings/Payments pehle hi thi, aaj baaki 14 bhi) | `docs/09-devops/sheet-tabs/` |
| Vercel deploy (button + GitHub Actions) | ✅ config + steps ready — bas Vercel secrets | `docs/09-devops/vercel-deploy.md` |
| Payment page copy | ✅ koi technical "refresh kariye" line customer ko nahi dikhti | `apps/web/src/components/upi-payment.tsx` |
| Header + logo | ✅ ek hi announcement strip, per-device logo size, nav child pages par active | `site-header.tsx`, `globals.css` |
| **Diwali hero banners** (desktop / tablet / mobile) | ✅ owner ke teen posters — har device ki apni file, `object-fit: contain` + exact aspect-ratio, koi crop/stretch nahi; desktop full width | `assets/source/banners/`, `node scripts/brand/build-hero-banners.mjs` |
| **"Free Shipping" claim** | ✅ poori site se hataya (header, strip, cart, PDP, policies, meta; admin toggle bhi) | `tests/unit/round41.test.ts` |
| **R42 — header/footer contact** | ✅ ek hi WhatsApp number (`whatsapp` → warna `support_phone`), number na ho to button hi nahi (pehle `wa.me/` dead link), duplicate footer row gaya, announcement sirf English | `site-header.tsx`, `site-footer.tsx`, `floating-help.tsx` |
| **R42 — sheet Settings parser** | ✅ **asli bug**: Settings tab me teesra `note` column hone se value `9876543211,,"DEMO…` ban jaati thi → ab sirf A=key, B=value padhe jaate hain | `lib/sheet-format.ts`, `tests/unit/round42.test.ts` |
| **R42 — purana brand saaf** | ✅ catalogue ka `meta.store`, 9 product handles, 240 vendor, reviews — sab se purana naam hata (catalog rebuild + verify pass) | `scripts/verify-catalog.mjs`, `database/seeds/live/*` |
| **R42 — GitHub Pages preview** | ✅ branch se deploy ho raha hai; ab **post-deploy smoke job** live URL khol kar Noor content/banner check karta hai | `.github/workflows/pages.yml` |
| **R43 — header logo** | ✅ asli bug: crop script image ki 55% height se kaat raha tha (N/O ke curve kat rahe the) → ab top row image se detect hoti hai; logo 44 → 52 → 58px, `?v=3` cache-bust | `scripts/brand/build-responsive-assets.mjs`, `globals.css` |
| **R44 — logo kabhi invisible nahi** | ✅ `BrandMark` (onError → NOOR/ETHNIC WEAR text lockup, eager+high priority), apple icon 180×180 asli, `/contact` 404 fix | `brand-mark.tsx`, `layout.tsx`, `account/page.tsx` |
| **R44 — site audit pipeline** | ✅ static audit (486 pages / 34k refs, 0 broken) + **live** audit har push par (`docs/09-devops/live-check.md`), report: `docs/09-devops/logo-and-site-audit.md` | `scripts/audit/*`, `.github/workflows/live-check.yml` |
| **R45 — naya logo (owner ka gold emblem)** | ✅ poora lockup trim hota hai (koi crop nahi) → 514×190 / 444×164 / 374×138 (2.70:1), header me 46 → 54 → 60px, `?v=4` cache-bust | `assets/source/logo-gold.png`, `scripts/brand/build-responsive-assets.mjs`, `globals.css`, `brand-mark.tsx` |
| **R45 — naya Diwali banner** | ✅ desktop + tablet wahi 1672×941 frame, mobile 941×1672 portrait; hero CSS/config ratios update; 3-up mockup sheet (1983×793) use **nahi** hoti | `scripts/brand/build-hero-banners.mjs`, `config/site.ts`, `globals.css` |
| **R45 — favicon + PWA** | ✅ root `/favicon.ico` asli ICO (32+48, pehle 404 tha), crown mark tile ki 92% width bharta hai (16px par dikhta hai), manifest splash cream (pehle kaala) | `app/favicon.ico`, `build-responsive-assets.mjs`, `manifest.ts` |
| **R45 — live verify** | ✅ Pages deploy (build/deploy/smoke) + live-check report (`docs/09-devops/live-check.md`) — naya logo, banner ratio, favicon ICO sab live URL par check hote hain | `gh run list` |
| **R45 — chhote bugs** | ✅ footer ka saal hydration-safe (`suppressHydrationWarning`), manifest icons base path ke saath, live-check me favicon/ICO/mark checks | `site-footer.tsx`, `manifest.ts`, `scripts/audit/live-check.mjs` |
| Scam-proofing | ✅ rate limit (orders/contact/newsletter/payment claim) + server-side price recompute | `apps/web/src/lib/rate-limit.ts` |
| Unit tests | ✅ 323 pass | `npm run test:unit` |
| Build | ✅ web + admin + api | `npm run build:all` |
| Brand assets (logo ke saare sizes + banners + favicon) | ✅ aapke logo se bane | `node scripts/brand/build-responsive-assets.mjs` |

## Kya baaki hai (aage ke steps)

| Kaam | Kiske paas | Note |
| --- | --- | --- |
| Sheet ki `Settings` tab me asli values (abhi **demo** bhari hain) | owner | demo: `upi_id = noor.ethnicwear@upi`, phone `9876543210` — asli daalna zaroori |
| Apps Script deploy (`/exec` URL) | owner ka Google account | 3-kaam checklist: `docs/09-devops/owner-setup-checklist.md` |
| `GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_TOKEN`, `ADMIN_PASSWORD`, `DATABASE_URL` env set | hosting dashboard | `.env.example` me poora list |
| Asli products (photos, price, stock) catalogue me daalna | owner ka data | abhi 287 **sample** products hain (design/flow test ke liye) |
| Domain lagana | owner | domain final hone par sirf `NEXT_PUBLIC_SITE_URL` badalna hai |
| UPI ID / GSTIN / announcement | owner, Sheet me | khaali = site par dikhta hi nahi |

## Rules (inhe todna nahi)

1. **Koi contact value code me hardcoded nahi** — phone, WhatsApp, UPI ID, email, address: sab Sheet/owner settings se.
2. Sheet ka cell khaali = site par wo cheez nahi dikhti (koi purana fallback nahi).
3. Sheet down ho to site **last good** value par chalti hai — order fail nahi hota.
4. Order number `NE-…` system banata hai; customer ko invoice + tracking milti hai.
5. Payment = sirf UPI (QR + UPI ID); koi card data codebase me nahi aata.
