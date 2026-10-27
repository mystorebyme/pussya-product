# Test plan

## Scope

Storefront (browse → checkout → order page), admin (auth → orders → products → settings), API
(products, orders, payments, webhook), data integrity (prices/sizes/images).

## Pyramid

| Level | Count target | Tools | Runtime |
| --- | --- | --- | --- |
| Unit | ~40 | `node:test` + `tsx` | < 2s |
| Integration | ~12 | `node:test` + fetch against local API/web | < 20s |
| E2E | ~8 scenarios | Playwright (Chromium mobile + desktop) | < 3 min |
| Manual | checklist | `docs/08-testing/uat.md` | 1h |

## Environments

- Unit/integration: local, `.data` temp dir (`LIKHSA_DATA_DIR=.data-test`).
- E2E: `npm run build && npm start` (production build, static pages real).
- Staging: preview deploy + Razorpay test keys.

## Entry / exit criteria

Entry: build green, typecheck clean, test data seeded.
Exit: P0/P1 defects zero, P2 documented, e2e green on mobile viewport, perf budget met.

## Data

- Deterministic catalogue (committed JSON) — tests prices hard-code karte hain.
- Random order numbers test me stub (inject `randomOrderNumber`).
- Never hit real Razorpay; signature tests local HMAC se.

## Commands

```bash
npm test                  # unit
npm run test:integration  # api + web route handlers
npm run test:e2e          # playwright
npm run typecheck         # all workspaces
```
