# Rollback

## Decision matrix

| Symptom | Action | Target time |
| --- | --- | --- |
| Checkout 500/error spike | redeploy previous Vercel build | 5 min |
| Payment webhook broken | revert api deploy; payments manual | 10 min |
| Wrong prices site-wide | revert catalogue JSON + build (or override fix) | 15 min |
| Admin locked out | rotate `ADMIN_SESSION_SECRET`, reset password env | 10 min |
| Data corruption (orders.json) | restore latest backup + replay missing orders | 30 min |

## Storefront/Admin (Vercel)

```bash
vercel rollback <deployment-url>   # ya dashboard → Deployments → Promote
```
Instant, no build. DNS unchanged.

## API (Render)

Dashboard → Deploys → previous → "Deploy this version". Disk untouched (data safe).

## Catalogue revert

```bash
git revert <commit> -- database/seeds/catalog.json
npm run catalog:build && npm run build --workspace @noor/web
```

## Data restore

```bash
bash database/scripts/restore.sh .data/backups/orders-2026-10-24T06-00.json
```
Restore se pehle current file copy karo (`*.bak`).

## Post-rollback

1. `PROGRESS.md` entry (kya hua, kitna time, impact).
2. Root cause note `docs/11-maintenance/incidents.md`.
3. Regression test add (jo miss hua).
