# Deploy — storefront & admin (Vercel)

## Projects

| Project | Root | Domain |
| --- | --- | --- |
| noor-web | `apps/web` | noorethnicwear.in, www |
| noor-admin | `apps/admin` | admin.noorethnicwear.in |

## Settings

- Framework: Next.js (auto-detected)
- Node: 22.x
- Install: `npm install` (workspace root — Vercel root directory ke parent se install)
- Build: `npm run build --workspace @noor/web`
- Output: `.next`
- Region: `bom1` (Mumbai) — Indian traffic ke liye lowest TTFB

## Env vars (web)

`NEXT_PUBLIC_SITE_URL`, `NEXT_PUBLIC_WHATSAPP_NUMBER`, `ORDERS_API_URL`, `ADMIN_API_TOKEN`,
`RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`, `ADMIN_EMAIL`

## Env vars (admin)

`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`, `LIKHSA_DATA_DIR` (agar shared volume nahi to API mode), `API_BASE_URL`

## Deploy flow

```bash
vercel --prod                  # web (root se, project linked)
cd apps/admin && vercel --prod
```

GitHub integration on: `main` push = prod deploy; PR = preview URL.

## Notes

1. `.data` Vercel par ephemeral hai — orders **API/Render** par persist hone chahiye. Isliye prod me
   `ORDERS_API_URL` set karke web ka `/api/orders` proxy mode use karo (Phase 2 hardening item).
2. Admin same reason se API mode recommend; standalone mode sirf single-instance deploy (Render) par.
3. Image domains `next.config.ts` me `cdn.shopify.com` + `images.remotePatterns`.

## Live link (Round 8)

Vercel par project `noor-clothing` (root directory `apps/web`) banti hai; GitHub branch connect
hone par har push par preview URL milta hai — wahi "live link" hai jo client ko bheja jaata hai.

Monorepo settings jo zaroori hain:

| Setting | Value |
| --- | --- |
| Root Directory | `apps/web` |
| Install Command | `npm install` (repo root — workspace deps) |
| Build Command | `npm run build --workspace @noor/web` |
| Framework | Next.js |
| Node | 22.x |

Env (minimum for live preview):

- `NEXT_PUBLIC_SITE_URL` = deployment URL
- `ADMIN_API_TOKEN` (admin panel isi se storefront API call karta hai)
- `OTP_DEV_MODE=on` (jab tak Firebase keys na hon; production me `off` + Firebase keys)
- `DATABASE_URL` (optional — na ho to orders/notes/invoices container ke local JSON me jaate hain, jo deploy par reset hota hai)

Data persistence: orders, status notes, delivery rules, store settings aur manual invoices sab
`DATABASE_URL` hone par Postgres me jaate hain (migrations `0001`–`0004`). Sirf catalogue edits
(title/price/photos/publish) repo checkout par chalte hain — deployed panel read-only mode dikhata hai.
