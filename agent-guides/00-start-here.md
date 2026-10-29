# Start here (5 minutes)

## 1. Requirements

- Node 22+ (`node -v`)
- npm 10+
- Git

## 2. Setup

```bash
git clone <repo> noor && cd noor
cp .env.example .env
npm install          # workspaces install
npm run catalog:build
bash scripts/setup.sh  # data dir, checks, seed
```

## 3. Run

```bash
npm run dev        # storefront  http://localhost:3000
npm run dev:admin  # admin       http://localhost:3001  (admin@noorethnicwear.in / noor2026)
npm run dev:api    # api         http://localhost:4000/api/v1/health
```

Teeno alag terminals me, ya `docker compose up --build`.

## 4. Pehla check (2 min)

```bash
curl -s localhost:4000/api/v1/health | jq
curl -s localhost:3000/api/health | jq
open http://localhost:3000/products/luxury-mustard-embroidered-georgette-anarkali-suit
```

## 5. Repo map

- `apps/web` — storefront (287 prerecorded PDPs)
- `apps/admin` — owner panel
- `apps/api` — REST API for partners/mobile
- `packages/*` — types, validation (zod), api-client, ui
- `database/` — prisma schema + catalogue seed + backup scripts
- `docs/` — 00 → 11 (requirements → maintenance)
- `.claude/skills/` — 15 task skills (agent ke liye)
- `tests/` — unit / integration / e2e

## 6. Rules yaad rakho

1. Money paise me.
2. Price server par compute.
3. `docs/` update karo jab behaviour badle.
4. `npm run typecheck` clean rakho.
