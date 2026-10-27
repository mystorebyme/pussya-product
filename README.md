# Noor Ethnic Wear — storefront, owner panel & API

Production-grade ecommerce monorepo for **Noor Ethnic Wear** (designer anarkali suits, lehenga choli
and printed suit sets). Customer storefront + owner (admin) panel + REST API — teen apps, ek hi repo.

```
web app   →  apna domain (customer storefront)
admin app →  admin.<apna-domain>        (owner panel: orders, stock, prices, settings)
api       →  api.<apna-domain>          (REST /api/v1 for partners, mobile, webhooks)
```

> **Payment policy:** sirf UPI (QR + UPI ID), koi third-party gateway/card data nahi.
> UPI ID **Google Sheet** se aata hai — sheet me badla, site par turant.

---

## Kasr ki baat: kuch bhi hardcoded nahi

| Cheez | Source | Site par kab |
| --- | --- | --- |
| Phone, WhatsApp, UPI ID, payee name, announcement, GSTIN, free shipping | **Google Sheet → `Settings` tab** | ≤ 3 second (browser poll) / turant payment page par |
| Orders + har status change (placed → confirmed → packed → shipped → delivered) | Sheet → `Orders` tab (append-only timeline) | order/status change par turant |
| Products, price, stock, photos | catalogue + admin panel | admin save par |
| Order number prefix | `NE-` (`packages/validation`) | — |

Sheet ka cell **khaali** = site par wo cheez dikhti hi nahi (koi purana number/stale UPI
fallback nahi) — galat payee par paisa jaane se behtar hai payment pause ho jaaye.

## 1. Google Sheet setup (ek baar, 5 minute)

1. [sheets.new](https://sheets.new) → naam `Noor Ethnic Wear — Store`.
2. Repo me `docs/09-devops/sheet-tabs/` ke **16 CSV** import kariye
   (File → Import → *Insert new sheet(s)*). Column ke naam script se hi bante hain —
   dobara banane ho to: `node scripts/sheets/export-tab-headers.mjs`.
3. **Extensions → Apps Script** → `scripts/google-apps-script/noor-sheets.gs` ka poora code paste →
   save → function `setup` **Run** (permission maange to Allow).
4. **Deploy → New deployment → Web app** — *Execute as: Me*, *Who has access: Anyone* → `/exec` URL copy.
5. Us URL par env set kariye (niche `.env` table) aur redeploy:
   `GOOGLE_SHEETS_WEBAPP_URL=<exec URL>` · `GOOGLE_SHEETS_TOKEN=<lamba random token>`
6. `Settings` tab me apni values bhariye:
   `support_phone`, `whatsapp`, `upi_id`, `upi_name`, `announcement`, `gstin`, `free_shipping`.
7. Check: `GET /api/settings` → `"meta":{"sheetSource":"apps-script"}` aur wahi number jo sheet me hai.

Poora detail: [`docs/09-devops/google-sheets.md`](docs/09-devops/google-sheets.md).

## 2. Local run

```bash
npm install
cp .env.example .env.local        # keys yahan, git me kabhi nahi
npm run dev                       # storefront  → http://localhost:3000
npm run dev:admin                 # owner panel → http://localhost:3001
npm run dev:api                   # REST API    → http://localhost:4000
```

Bina `DATABASE_URL` bhi chalta hai (data `.data/*.json` me) — production me Postgres/Supabase lagaiye.

```bash
npm run test:unit        # 279 tests
npm run build:all        # web + admin + api
npm run catalog:verify   # catalogue sanity
```

## 3. Deploy

| Target | Kya milta hai |
| --- | --- |
| **Vercel** | storefront (`apps/web`) + admin (`apps/admin`) — GitHub App access chahiye |
| **Render** | full app + Postgres (`render.yaml` blueprint) |
| **Netlify** | storefront + admin, functions ke saath (`netlify.toml`) |

Detail: [`docs/10-deployment/`](docs/10-deployment).

## 4. Owner panel (admin)

- Login: `ADMIN_EMAIL` (comma-separated list) + `ADMIN_PASSWORD` — code me koi email/password hardcoded nahi.
- Session 30 din ka httpOnly cookie; production me `ADMIN_PASSWORD` set na ho to login **fail-closed**.
- Order timeline, status change (placed → confirmed → packed → shipped → delivered), stock, price,
  invoice, tracking, reviews, messages, coupons, Google Sheet status screen — sab yahin.

## 5. Payments (UPI, seedha owner ke account me)

Order page par UPI QR + UPI ID + exact amount; customer UTR daalta hai, admin verify karta hai.
UPI ID **sirf Sheet** se — `docs/09-devops/upi-payments.md`.

## 6. Brand assets

Owner ke diye hue ek hi logo se banti hain (koi redraw nahi):

```bash
node scripts/brand/build-responsive-assets.mjs   # logo-*.png + og-image + favicon marks
node scripts/brand/build-hero-banners.mjs        # home banners (desktop/tablet/mobile)
```

Source: `assets/source/logo-original.png`.

## 7. Sample catalogue (abhi template ka)

`database/seeds/` aur `apps/web/src/data/catalog.json` me abhi **template ka sample catalogue**
(287 products) hai — sirf design/flow test karne ke liye. Asli products owner ke diye hue
data se replace honge (`npm run catalog:build`). Products ke naam/photos badalne se code
nahi badalta — bas `catalog.json` regenerate hota hai.

## Docs

- [`STRUCTURE.md`](STRUCTURE.md) — har folder kya hai, naya code kahan jaayega
- [`docs/09-devops/google-sheets.md`](docs/09-devops/google-sheets.md) — Sheet = owner ka control panel
- [`docs/09-devops/sheet-tabs/`](docs/09-devops/sheet-tabs) — ready-to-import CSV
- [`docs/00-overview/`](docs/00-overview) — owner ke liye code map
