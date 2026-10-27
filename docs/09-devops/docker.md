# Docker

## Compose (local full stack)

```bash
docker compose up --build        # web :3000, admin :3001, api :4000
docker compose logs -f api
docker compose down -v           # data volume bhi delete
```

Services: `web`, `admin`, `api` (teeno `node:22-alpine`, multi-stage build, non-root user),
shared named volume `noor-data:/app/.data`.

## Dockerfiles

Pattern (har app):

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package*.json ./
COPY apps/web/package.json apps/web/
COPY packages/*/package.json packages/
RUN npm ci

FROM node:22-alpine AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build --workspace @noor/web

FROM node:22-alpine AS runner
ENV NODE_ENV=production
USER node
COPY --from=builder /app/apps/web/.next/standalone ./
CMD ["node", "server.js"]
```

## Notes

1. API esbuild se bundle hoti hai (`npm run build --workspace @noor/api` → `dist/server.cjs` + `dist/worker.cjs`).
2. Images me `.git`, `node_modules` (build cache), `.data` exclude (`.dockerignore`).
3. Compose me secrets `.env` se env vars ke roop me.
4. Production me Docker optional — Vercel/Render native builds recommended; compose mainly parity testing.
