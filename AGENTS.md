# AGENTS.md — working rules for AI coding agents

Read this first. Then `STRUCTURE.md`, then `PROGRESS.md`, then the matching skill in `.claude/skills/`.

## The loop (order badalna nahi)

| # | Step | Skill | Kya matlab |
| --- | --- | --- | --- |
| 1 | **Plan** | `brainstorm-plan` | Pehle sawaal (kaun user, kaun edge case), phir 3-line plan: kaun file, kaun test, kaun doc. Chhoti cheez ho to seedha 3. |
| 2 | **Minimal diff** | `minimal-diff` | Sabse chhota badlav jo kaam kare. Naya dependency, naya abstraction, naya config — default **nahi**. |
| 3 | **Implement + test** | `testing` | Test usi commit me. "Baad me test likhenge" = test kabhi nahi likha jaata. |
| 4 | **Debug** | `systematic-debugging` | Toofa to pehle **asli wajah** dhoondo (log/repro), phir 1 fix. Guess-patch nahi, `try/catch` se symptom chhupana nahi. |
| 5 | **Verify + doc** | `testing` + `deploy-ops` | `npm run typecheck && npm run test:all && npm run audit`, phir `PROGRESS.md` line. |

> Rule: jo cheez naapi nahi ja sakti, wo "ho gaya" nahi kehlati. `npm run audit` wahi naapta hai.

## The 10 rules

1. **Money = integer paise.** No floats, no rupees in storage. `formatPrice()` only at render time.
2. **Never trust client prices.** Orders are priced from the catalogue on the server.
3. **Catalogue is generated.** Change `scripts/build-catalog.mjs`, `scripts/data/*`, or run
   `npm run catalog:sync-live`; never hand-edit `catalog.json` copies inside apps.
4. **Business rules live once** — `packages/validation/index.ts` (coupons, COD limits, status machine,
   order number format). Import it, don't copy it.
5. **Server vs client:** `@/lib/store` and anything touching `fs` is server-only. Client components
   never import the catalogue. Storefront also runs on Cloudflare Workers (read-only FS), isliye
   `apps/web/src/lib/*` me seedha `node:fs` nahi — `@/lib/fs-runtime` use karein
   (`docs/09-devops/cloudflare-workers.md`; `tests/unit/cloudflare-workers.test.ts` ise gate karta hai).
6. **Validate at the edge.** zod schema on every write path; `String(req.params.x)` in Express handlers.
7. **Every admin mutation writes an audit entry** and calls `revalidatePath`.
8. **Idempotency + atomic writes** for anything money-related (`.data/*.json`, tmp+rename).
9. **Tests are part of the change.** Unit for rules, integration for endpoints; run `npm run test:all`.
10. **Docs and code ship together.** If behaviour changes, update `docs/0X-…` and `PROGRESS.md`.

## Golden commands

```bash
npm run typecheck                 # must be clean before you stop
npm run test:all                  # unit + integration
npm run audit                     # scorecard: skills, instruction files, hygiene, route→test map
npm run audit -- --check          # CI gate (regression par fail)
npm run catalog:verify            # if catalogue touched
npm run build:web                 # if storefront touched
npm run build:vinext --workspace @noor/web   # if Cloudflare Workers path touched
cd apps/admin && npx next build   # admin root se build nahi hoti
npm run dev / dev:admin / dev:api # ports 3000 / 3001 / 4000
```

## Never do

- `git push` to any branch other than the session branch; never rewrite history on `main`.
- Add a dependency without need (no UI kit, no state library, no animation library).
- Put secrets in `NEXT_PUBLIC_*` or in the repo.
- Use `next/font/google` (breaks offline builds) or `next/image` with the Shopify CDN.
- Delete or rename `database/seeds/catalog.json` structure without updating tests.
- Invent product data. `noorethnicwear.in` is the only source of truth.

## When stuck

| Symptom | Where to look |
| --- | --- |
| "Kaam kyun nahi kar raha, pata nahi" | `.claude/skills/systematic-debugging` (pehle repro, phir fix) |
| Kaam bahut bada lag raha hai | `.claude/skills/brainstorm-plan` (chhota karo) + `.claude/skills/minimal-diff` |
| Netlify/Vercel deploy | `.claude/skills/deploy-ops` + `.claude/skills/netlify-deploy` |
| Build oddities | `docs/08-testing` + `agent-guides/troubleshoot-storefront.md` |
| Order/money bug | `.claude/skills/order-lifecycle` |
| API shape change | `.claude/skills/api-module` + `docs/06-api` |
| Admin behaviour | `.claude/skills/admin-panel` |
| Catalogue mismatch | `.claude/skills/catalogue-sync` |
| Deploy | `.claude/skills/deploy-ops` |

## Definition of done

Typecheck clean · `npm run test:all` pass · `npm run audit -- --check` pass · mobile 360px checked ·
empty/error states handled · docs updated · `PROGRESS.md` line added.

**"Ho gaya" ka proof:** ek command ka output, ek test ka naam, ya ek live URL — zubani dawa nahi.

