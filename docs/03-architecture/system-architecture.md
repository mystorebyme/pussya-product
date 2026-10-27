# System architecture

## Services

| Service | Tech | Port | Deploy |
| --- | --- | --- | --- |
| Storefront | Next.js 16 (App Router, Turbopack) | 3000 | Vercel / Render |
| Admin | Next.js 16 | 3001 | Vercel (admin subdomain) / Render |
| API | Node 22 + Express 5 + tsx | 4000 | Render / Fly |
| Data | JSON files (Phase 1) → Postgres (Phase 2) | — | volume / Neon |
| Images | Shopify CDN (Phase 1) → Cloudflare R2 (Phase 2) | — | — |

## Environments

local → preview (PR) → production. Har environment ka apna `.data` + secrets.

## Cross-cutting

- **Observability**: structured JSON logs (api), request-id header, health endpoints (`/api/health`, `/api/v1/health`).
- **Security headers**: nosniff, frame options, referrer policy, permissions policy (web); admin noindex.
- **Caching**: HTML static (revalidate on demand), `/api/products` 60s stale-while-revalidate,
  `/api/search` 5 min.
- **Failure isolation**: payment provider down → manual fallback; email provider down → log mode;
  webhook failure → 5xx so provider retries.

## Scaling path

1. Web static → edge CDN (already).
2. API → 2+ instances (needs DB/Redis first).
3. Orders → Postgres + connection pool.
4. Images → R2 + Cloudflare.
5. Search → Meilisearch when catalogue > 2,000.
