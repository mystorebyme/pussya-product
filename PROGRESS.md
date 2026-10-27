# Progress — Noor Ethnic Wear

**Last updated:** 2026-10-27 (owner ke Diwali posters — desktop/tablet/mobile, no crop; Free Shipping hataya)

## Kya ready hai

| Area | State | Kaise check karein |
| --- | --- | --- |
| Storefront (home, collections, product pages, gallery, cart, checkout, order tracking, invoices, policies) | ✅ chalta hai | `npm run dev` → http://localhost:3000 |
| Owner panel (login, orders + timeline, stock, price, invoices, tracking, reviews, messages, coupons, settings, Sheet status) | ✅ chalta hai | `npm run dev:admin` → http://localhost:3001 |
| REST API | ✅ chalta hai | `npm run dev:api` → http://localhost:4000 |
| **Google Sheet = owner ka control panel** | ✅ **sheet ban gayi** — 16 tabs + headers + Settings keys ([link](https://docs.google.com/spreadsheets/d/1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo/edit)); Apps Script `/exec` URL + token env me daalne hain | `docs/09-devops/google-sheets.md` |
| Sheet tabs ke ready CSV (16) | ✅ | `docs/09-devops/sheet-tabs/` |
| Vercel deploy (button + GitHub Actions) | ✅ config + steps ready — bas Vercel secrets | `docs/09-devops/vercel-deploy.md` |
| Payment page copy | ✅ koi technical "refresh kariye" line customer ko nahi dikhti | `apps/web/src/components/upi-payment.tsx` |
| Header + logo | ✅ ek hi announcement strip, per-device logo size, nav child pages par active | `site-header.tsx`, `globals.css` |
| **Diwali hero banners** (desktop / tablet / mobile) | ✅ owner ke teen posters — har device ki apni file, `object-fit: contain` + exact aspect-ratio, koi crop/stretch nahi; desktop full width | `assets/source/banners/`, `node scripts/brand/build-hero-banners.mjs` |
| **"Free Shipping" claim** | ✅ poori site se hataya (header, strip, cart, PDP, policies, meta; admin toggle bhi) | `tests/unit/round41.test.ts` |
| Scam-proofing | ✅ rate limit (orders/contact/newsletter/payment claim) + server-side price recompute | `apps/web/src/lib/rate-limit.ts` |
| Unit tests | ✅ 287 pass | `npm run test:unit` |
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
