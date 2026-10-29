---
name: deploy-ops
description: Deploy storefront/admin/api, set env vars, verify health, and roll back safely. Use for releases, go-live checks and incidents.
---

# Deploy & ops

## Topology

| App | Host | Domain | Port local |
| --- | --- | --- | --- |
| web | Vercel | noorethnicwear.in | 3000 |
| admin | Vercel (project 2) | admin.noorethnicwear.in | 3001 |
| api | Render (Node + disk) | api.noorethnicwear.in | 4000 |

## Pre-deploy

```bash
npm run typecheck
npm run build:all
npm test
bash database/scripts/backup.sh
```

## Deploy

```bash
vercel --prod                     # web (apps/web root)
cd apps/admin && vercel --prod    # admin
# api: git push origin main → Render auto-deploy (ya deploy hook curl)
```

## Verify (2 min)

```bash
curl -s  https://noorethnicwear.in/api/health
curl -s  https://api.noorethnicwear.in/api/v1/health
curl -sI https://noorethnicwear.in | head -3
curl -s -o /dev/null -w "%{http_code}\n" https://admin.noorethnicwear.in/login
```

## Rollback

```bash
vercel rollback <url>                      # web/admin instant
# api: Render → Deploys → previous → Deploy
bash database/scripts/restore.sh <backup>  # data corruption
```

## Env checklist (prod)

`NEXT_PUBLIC_SITE_URL`, `ORDERS_API_URL`, `ADMIN_API_TOKEN`, `RAZORPAY_KEY_ID`,
`RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`, `RESEND_API_KEY`, `EMAIL_FROM`,
`ADMIN_EMAIL`, `ADMIN_PASSWORD`, `ADMIN_SESSION_SECRET`.

## Notes

1. `.data` Vercel par persist nahi hota — orders API/Render disk par.
2. Sandbox preview me Shopify CDN images block ho sakti hain (SSL) — placeholder fallback.
3. Admin build root se nahi chalti: `cd apps/admin && npx next build`.
4. `next dev` aur `next build` ek hi `.next` share karte hain → build se pehle `rm -rf .next`.

## Incident first 5 minutes

1. Status: laapata? `curl` health.
2. Orders fail? API logs `requestId` se.
3. Payment fail? Razorpay dashboard + webhook logs.
4. Fix forward < 5 min? warna rollback.
5. Log in `docs/11-maintenance/incidents.md`.
