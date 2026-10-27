# CLAUDE.md

Claude (ya koi bhi coding agent) ke liye entry point. Poori rules `AGENTS.md` me hain —
yahan sirf short version, sachche numbers, aur pointers.

## TL;DR

- Monorepo: `apps/web` (3000), `apps/admin` (3001), `apps/api` (4000), shared `packages/*`.
- **446 products, 11 collections** (`database/seeds/catalog.json` — generated). Numbers yaad
  se na likhein, `npm run audit` se verify karein.
- Paisa **paise (integer)** me. Server price compute karta hai. Catalogue generated JSON hai.
- **Payment = seedha UPI** (``), koi third-party gateway nahi, koi card data nahi.
- Site par **support email ya phone number kahin nahi** — sirf WhatsApp ``.
  (Email input form allowed; email *dikhana* nahi.)

## Skills (`.claude/skills/`)

`brainstorm-plan` · `systematic-debugging` · `minimal-diff` · `typescript-discipline` ·
`storefront-ui` · `catalogue-sync` · `order-lifecycle` · `api-module` · `admin-panel` ·
`database-prisma` · `testing` · `deploy-ops` · `netlify-deploy` · `monorepo-conventions` ·
`security-baseline` · `storefront-quality` · `ecommerce-payments` · `inventory-concurrency` ·
`india-compliance` · `agent-common-mistakes`

Task se match hone wali skill pehle padho — usme commands, file paths aur traps already likhe hain.

## Workflow (yahi order hai)

1. **`brainstorm-plan`** — pehle sawaal, phir plan (kaun file, kaun test, kaun doc). Chhoti cheez ho to
   seedha step 3.
2. **`minimal-diff`** — sabse chhota badlav. Naya dependency / naya abstraction default nahi.
3. Implement + **test usi commit me** (`testing` skill).
4. **`systematic-debugging`** — jo toota, uski asli wajah pehle dhoondo; guess se fix nahi.
5. Verify loop (niche) → `PROGRESS.md` me ek line → docs update.

## Verify loop

```bash
npm run typecheck && npm run test:all
npm run audit              # skills/instruction/hygiene/route-map ka scorecard
```

Kuch bhi ship karne se pehle: `PROGRESS.md` me ek line, aur agar behaviour badla to `docs/` update.

## Known traps

- `cd apps/admin && npx next build` (root se admin build fail hoti hai).
- `next dev` ke saath `.next` clean karo build se pehle.
- Client component me `@/lib/store` import mat karo (410KB bundle).
- `quantity` field name hai (`qty` nahi).
- Sandbox me outbound curl block hai — live data ke liye `fetch` tool ya `npm run catalog:sync-live`
  apni machine par.
- GitHub Pages par Node server nahi hota: `/orders/…` sirf `404.html` shell se chalta hai.
