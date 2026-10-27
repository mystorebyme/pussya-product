# Progress — Noor Ethnic Wear

**Last updated:** 2026-10-27 (repo copy + rebrand, Google Sheet = control panel)

## Kya ready hai

| Area | State | Kaise check karein |
| --- | --- | --- |
| Storefront (home, collections, product pages, gallery, cart, checkout, order tracking, invoices, policies) | ✅ chalta hai | `npm run dev` → http://localhost:3000 |
| Owner panel (login, orders + timeline, stock, price, invoices, tracking, reviews, messages, coupons, settings, Sheet status) | ✅ chalta hai | `npm run dev:admin` → http://localhost:3001 |
| REST API | ✅ chalta hai | `npm run dev:api` → http://localhost:4000 |
| **Google Sheet = owner ka control panel** (phone, WhatsApp, UPI, announcement, GSTIN live) | ✅ code ready — bas `/exec` URL + token env me daalne hain | `docs/09-devops/google-sheets.md` |
| Sheet tabs ke ready CSV (16) | ✅ | `docs/09-devops/sheet-tabs/` |
| Unit tests | ✅ 279 pass | `npm run test:unit` |
| Build | ✅ web + admin + api | `npm run build:all` |
| Brand assets (logo ke saare sizes + banners + favicon) | ✅ aapke logo se bane | `node scripts/brand/build-responsive-assets.mjs` |

## Kya baaki hai (aage ke steps)

| Kaam | Kiske paas | Note |
| --- | --- | --- |
| Google Sheet banana + Apps Script deploy | owner ka Google account | steps: `docs/09-devops/google-sheets.md` |
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
