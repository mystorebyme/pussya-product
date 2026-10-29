---
name: agent-common-mistakes
description: Known traps in this repo (build dirs, workspace builds, paise math, server/client boundaries, CDN images). Read before your first edit in a session.
---

# Common mistakes (already paid for)

## Build & run

| Mistake | Reality |
| --- | --- |
| Root se `npx next build` for admin | Admin root se build nahi hoti. `cd apps/admin && npx next build` |
| `next dev` ke saath `next build` | Dono `.next` share karte hain → `rm -rf .next` pehle |
| `pnpm install` | pnpm nahi hai; npm workspaces use karo |
| Port collision | web 3000, admin 3001, api 4000 |
| Preview par `localhost` fetch | Browser sandbox se localhost nahi pakadta — relative URLs |

## Code

| Mistake | Reality |
| --- | --- |
| `@/db` / drizzle import | Phase 1 me DB nahi. Server data `@/lib/orders`, `@/lib/store` |
| `@/lib/store` in client component | 410KB JSON bundle me chala jayega; server-only |
| Rupees me calculation | Sab paise (integer). `formatPrice` sirf display |
| `next/image` with Shopify CDN | `remotePatterns` nahi; plain `<img>` + `imageUrl()` |
| `next/font/google` | Build-time fetch fail (offline CI). `<link>` + system stack |
| `any` to silence TS | `String(req.params.x)`, `unknown` + zod |

## Data

| Mistake | Reality |
| --- | --- |
| Duplicate order on retry | `Idempotency-Key` bhejo; server dedupe |
| Client price trust | Server catalogue se recompute |
| `quantity` vs `qty` | Schema field `quantity` |
| Case-sensitive order lookup | `NE-` uppercase hi |
| Editing `catalog.json` by hand | `scripts/build-catalog.mjs` se regenerate |

## Environment

| Symptom | Cause |
| --- | --- |
| Shopify images blank | Sandbox/network SSL block — placeholder fallback expected |
| `curl` outbound fails | Sandbox restricted; `fetch_page` tool use karo |
| Admin 307 loop | Cookie secret badla → re-login |
| `tsc` fails only in api | `req.params.x` type → `String(...)` |
