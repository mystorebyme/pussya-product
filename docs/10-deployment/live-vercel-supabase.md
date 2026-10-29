# Live deployment — Vercel + Supabase (Round 18)

Render (`noorclothing.onrender.com`) ne kaam karna band kar diya (har path par `Not Found`,
`/api/health` bhi). Isliye production stack ab **Vercel + Supabase Postgres** par hai — same
repo, same code, zero code change ke saath.

## 1. Live URLs

| Kya | URL |
| --- | --- |
| Storefront (public) | **https://noor-ethnic-wear.vercel.app** |
| Payment page (order ke baad) | `https://noor-ethnic-wear.vercel.app/orders/<NE-XXXX>/pay` |
| Admin panel | **https://noor-admin.vercel.app** (login) |
| Database | Supabase `Noor Clothing` project (region `ap-south-1`, Mumbai) |
| Static preview (sirf browse) | https://mystorebyme.github.io/tannu-product-/ |

## 2. Vercel projects

| Project | Root Directory | Framework | Install | Build |
| --- | --- | --- | --- | --- |
| `noor-clothing` | `apps/web` | Next.js | `cd ../.. && npm ci` | `cd ../.. && npm run build --workspace @noor/web` |
| `noor-admin` | `apps/admin` | Next.js | `cd ../.. && npm ci` | `cd ../.. && npm run build --workspace @noor/admin` |

Monorepo hone ke kaaran install/build repo root se chalta hai (`cd ../..`), output wapas app ke
`.next` me aata hai.

## 3. Environment variables

### `noor-clothing` (storefront)

| Key | Value / kahan se |
| --- | --- |
| `DATABASE_URL` | Supabase **session pooler** (port 5432): `postgresql://postgres.<ref>:<password>@aws-0-ap-south-1.pooler.supabase.com:5432/postgres` |
| `NEXT_PUBLIC_SITE_URL` | `https://noor-ethnic-wear.vercel.app` (domain lagne par `https://noorethnicwear.in`) |
| `ADMIN_API_TOKEN` | random long string — **admin project me wahi** hona chahiye |
| `STORE_UPI_ID` | ❌ **R38 me delete** — UPI sirf sheet ke `upi_id` se aati hai (koi fallback payee nahi) |
| `STORE_UPI_NAME` | owner ke UPI account ka naam |
| `UPI_RETURN_SECRET` | random (UPI return callback signing) |
| `GOOGLE_SHEETS_WEBAPP_URL` / `GOOGLE_SHEETS_TOKEN` | owner ki sheet settings — token R38 me rotate hua (48-char; script me `?action=set_token` se) |
| `SHEET_EXPECTED_ID` | R39: `<SHEET_ID>` — owner ki **final sheet**; `/api/sheet-health` isse `idMatch` verify karta hai. Sheet badle to env update + redeploy (code change nahi) |

### `noor-admin`

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `ADMIN_API_TOKEN` (same as storefront),
`STORE_API_URL=https://noor-ethnic-wear.vercel.app`, `NEXT_PUBLIC_STORE_URL` (same).

> `ADMIN_PASSWORD` production me zaroori hai — na ho to login band rehta hai (safety).

## 4. Database — koi manual step nahi

Serverless par `npm run db:migrate` chalane ka mauka nahi hota, isliye app khud migrate karta hai:

- `apps/web/src/lib/db-schema.ts` — `database/schema.sql` + `database/migrations/*.sql` ka
  generated embed (`node scripts/db/embed-schema.mjs`).
- Pehli DB query par `ensureSchema()` chalta hai: advisory lock → schema (agar `orders` nahi hai)
  → baaki migrations ek-ek (record `schema_migrations` me). Idempotent.
- Check: `GET /api/health` → `{ ordersStore: "postgres", db: "up" }`.

Naya DB lagana ho to: Supabase project banao → connection string copy → `DATABASE_URL` update →
redeploy. Baseline tables khud ban jayengi.

## 5. Payment + tracking flow (jo live verify hua)

```
checkout → POST /api/orders (server validation: stock, size, pincode, price)
        → order DB me: status=placed, payment_status=pending, order number NE-…
        → redirect /orders/<NE-…>/pay   (payment page ALAG)
             • order number, amount, items, live payment state
             • UPI QR + UPI ID + "Open UPI app" (mobile)
        → customer UTR daalta hai → payment_status=processing (DB)
        → admin panel → payment verify (ya UPI return auto-confirm) → paid
        → order status: placed → confirmed
        → /orders/<NE-…> par tracking timeline + courier/AWB
```

Rules jo code me hard-locked hain:

- Payment confirm hone se pehle order **packed/shipped/delivered** nahi ho sakta (409 `payment_pending`).
- `payment_status` ke saare states DB me save hote hain: `pending`, `processing`, `paid`, `failed`, `refunded`.
- Customer ke liye `/api/orders/<num>/payment` (no-store) — payment page 8s me poll karta hai.

## 6. Deploy / redeploy

```bash
# code push (branch: arena/f713eef1-tannu-product)
git push origin arena/f713eef1-tannu-product

# Vercel: project settings → Deployments → Redeploy
# (ya CLI: vercel --prod --cwd apps/web)
```

GitHub Actions:

- `CI` — typecheck, unit/integration/db tests, web+admin build, smoke.
- `GitHub Pages preview` — static browse build.
- `Live payment + tracking smoke` — manual (`workflow_dispatch`) ya commit message me
  `[live-test]` likhne par live URL par poora public flow test karta hai (order create →
  payment page → pending → processing → tracking). Log `live-logs` branch par jaata hai.

## 7. Domain (baad me)

`NEXT_PUBLIC_SITE_URL=https://noorethnicwear.in` set karke Vercel → Domains me
`noorethnicwear.in` + `www` add karna hai; admin ke liye `admin.noorethnicwear.in`.
Canonical/OG/WhatsApp links isi env se bante hain — code change nahi chahiye.

## 8. Render (purana)

`render.yaml` repo me maujood hai (backup ke liye) — par Render service abhi har path par
`Not Found` deti hai. Dobara use karna ho to Render dashboard → service → Manual Deploy +
naya Postgres. Vercel primary hai.
