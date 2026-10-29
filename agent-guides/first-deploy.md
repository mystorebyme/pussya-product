# Guide: pehli baar deploy karna

## Pre-flight

```
[ ] domain DNS access
[ ] Razorpay account (KYC) — live keys
[ ] Resend account (email) — domain verify
[ ] GitHub repo push access
```

## 1. Vercel — storefront

```bash
npm i -g vercel
vercel login
cd apps/web && vercel link     # project: noor-web
vercel env add NEXT_PUBLIC_SITE_URL production   # https://noorethnicwear.in
vercel env add ADMIN_API_TOKEN production
vercel env add RAZORPAY_KEY_ID production
vercel env add RAZORPAY_KEY_SECRET production
vercel env add RAZORPAY_WEBHOOK_SECRET production
vercel --prod
```

Settings → Domains → `noorethnicwear.in` + `www` (DNS records jo Vercel de).

## 2. Vercel — admin

```bash
cd apps/admin && vercel link   # project: noor-admin
vercel env add ADMIN_EMAIL production
vercel env add ADMIN_PASSWORD production
vercel env add ADMIN_SESSION_SECRET production
vercel --prod
```

Domain: `admin.noorethnicwear.in`. `noindex` header already set (`next.config.ts`).

## 3. Render — API

- New Web Service → repo connect
- Build: `npm ci && npm run build --workspace @noor/api`
- Start: `node apps/api/dist/server.cjs`
- Disk: 1GB at `/app/.data`
- Env: `DATA_DIR=/app/.data`, `WEB_ORIGIN`, `ADMIN_ORIGIN`, `ADMIN_API_TOKEN`, `RAZORPAY_*`, `RESEND_API_KEY`
- Health check: `/api/v1/health`

## 4. Razorpay webhook

Dashboard → Webhooks → add `https://api.noorethnicwear.in/api/v1/webhooks/razorpay`,
events: `payment_link.paid`, `payment.captured`, `payment.failed`, `refund.processed`.
Secret same rakho jo `RAZORPAY_WEBHOOK_SECRET` me hai.

## 5. Verify

```bash
curl -s https://noorethnicwear.in/api/health
curl -s https://api.noorethnicwear.in/api/v1/health
curl -sI https://admin.noorethnicwear.in | grep -i robots
```

Manual: COD order place karо, admin me dikhe, status badlo, order page refresh.

## 6. Post-deploy

- Uptime monitor (health URL, 1 min)
- Backup cron (`database/scripts/backup.sh`)
- Search Console sitemap submit
- `docs/10-deployment/go-live-checklist.md` tick karo
