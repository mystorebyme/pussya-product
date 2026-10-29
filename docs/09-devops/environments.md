# Environments

| Env | Web | Admin | API | Data | Payments |
| --- | --- | --- | --- | --- | --- |
| local | :3000 | :3001 | :4000 | `.data/` | Razorpay test |
| preview (PR) | `*.vercel.app` | `*.vercel.app` | shared staging | ephemeral | test |
| staging | `staging.noorethnicwear.in` | `staging-admin…` | `staging-api…` | separate disk | test |
| production | `noorethnicwear.in` | `admin.noorethnicwear.in` | `api.noorethnicwear.in` | persistent disk | live |

## Env matrix

| Var | local | staging | prod |
| --- | --- | --- | --- |
| `NEXT_PUBLIC_SITE_URL` | http://localhost:3000 | staging URL | https://noorethnicwear.in |
| `ORDERS_API_URL` | — (direct) | staging-api | https://api… |
| `ADMIN_SESSION_SECRET` | dev default | random 32B | random 32B |
| `RAZORPAY_KEY_ID` | test | test | live |
| `RESEND_API_KEY` | optional | test key | live key |
| `NODE_ENV` | development | production | production |

## Rules

1. Prod secrets kabhi local `.env` me copy nahi (vault/dashboard se).
2. Staging par live customer data nahi — synthetic orders.
3. Test payment keys staging me zaroori; live keys kabhi staging par nahi.
4. Local data reset: `rm -rf .data && npm run seed:dev`.

## Local bootstrap

```bash
cp .env.example .env
npm install
npm run catalog:build
bash scripts/setup.sh
npm run dev        # 3000, 3001, 4000 (alag terminals ya concurrently)
```
