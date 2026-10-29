# Guide: feature ship karna (step by step)

## 0. Decide

- Kaunsa app? web / admin / api / package.
- Docs kaunsa update hoga (`docs/0X-…`).
- Data change? `.data` shape badle to migration note.

## 1. Branch

```bash
git checkout main && git pull
git checkout -b feat/coupon-banner
```

## 2. Build (smallest vertical slice)

Order: **type → validation → data → UI**.

```
packages/types/index.ts        naya field/type
packages/validation/index.ts   zod schema + business constant
apps/api/src/modules/...       service + route
apps/web/src/lib/...           read helper
apps/web/src/app/...           page/component
```

## 3. Self-check

```bash
npm run typecheck
npm test
npm run build:all
```

## 4. Manual pass (mobile 375px)

```
[ ] happy path
[ ] empty state
[ ] error state (network fail / invalid input)
[ ] back button / refresh
[ ] no console errors
```

## 5. Docs + tests

- `docs/` me relevant file update (endpoints, page-specs, data-model).
- `tests/unit` ya `tests/integration` me case add.
- `PROGRESS.md` / `changelog.md` entry.

## 6. PR

Title: `feat: coupon banner on cart`
Body: what, why, screenshot, curl proof, risk.

## 7. Deploy + verify

```bash
npm run build:all
vercel --prod                 # web
cd apps/admin && vercel --prod
git push origin main          # api auto-deploy (Render)
curl -s https://api.noorethnicwear.in/api/v1/health
```

## 8. After

- 24h monitor (5xx, order create, payment).
- Agar kuch toota: `docs/11-maintenance/rollback.md`.
