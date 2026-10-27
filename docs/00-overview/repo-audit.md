# Repo audit — top skill repos ke hisaab se

> Auto-generated: `npm run audit` (is file ko haath se edit na karein).
> Benchmark: Superpowers (plan → test → debug), Matt Pocock & Anthropic (chhote skills),
> Karpathy (ek sachcha instruction file), Ponytail (minimal diff), Graphify (code map),
> Agent Skills (production gates).

## Scorecard

| Dimension | Score | Grade |
| --- | --- | --- |
| Skills (format + refs) | 100% | A |
| Tests per route (Graphify map) | 100% | A |
| Hygiene (any/TODO/log/secrets) | 100% | A |
| Instruction files (Karpathy) | 100% | A |
| CI gates (Agent Skills) | 100% | A |

## Repo facts

| Metric | Value |
| --- | --- |
| products | 446 |
| collections | 11 |
| sourceFiles | 254 |
| sourceLines | 28027 |
| testFiles | 52 |
| skills | 20 |
| docsPages | 130 |

## Skills (20/20 pass)

| Skill | Lines | Status |
| --- | --- | --- |
| admin-panel | 64 | ✅ |
| agent-common-mistakes | 47 | ✅ |
| api-module | 70 | ✅ |
| brainstorm-plan | 59 | ✅ |
| catalogue-sync | 61 | ✅ |
| database-prisma | 61 | ✅ |
| deploy-ops | 70 | ✅ |
| ecommerce-payments | 52 | ✅ |
| india-compliance | 54 | ✅ |
| inventory-concurrency | 55 | ✅ |
| minimal-diff | 55 | ✅ |
| monorepo-conventions | 70 | ✅ |
| netlify-deploy | 61 | ✅ |
| order-lifecycle | 62 | ✅ |
| security-baseline | 56 | ✅ |
| storefront-quality | 58 | ✅ |
| storefront-ui | 63 | ✅ |
| systematic-debugging | 65 | ✅ |
| testing | 61 | ✅ |
| typescript-discipline | 58 | ✅ |

## API → test map (37/37 active routes covered)

Sab active routes ka test hai ✅

Dormant (jaan-boojh kar bina test — third-party gateway nahi, owner rule):
- ⏸️ `/api/admin/checkout-events`
- ⏸️ `/api/payments/webhook/[gateway]`
- ⏸️ `/api/webhooks/razorpay`

## Hygiene

| Check | Count | Kya chahiye |
| --- | --- | --- |
| `any` type | 0 | 0 |
| TODO/FIXME | 0 | 0 |
| console.log | 0 | 0 |
| hardcoded secrets | 0 | 0 |
| client me server-only import | 0 | 0 |
| gateway (razorpay) refs | 0 | 0 (owner rule: sirf UPI) |
| public email refs | 0 | 0 (owner rule: sirf WhatsApp) |

## Instruction files

| Check | Value |
| --- | --- |
| CLAUDE.md lines | 53 |
| AGENTS.md lines | 79 |
| CLAUDE.md product count sach? | ✅ |
| CLAUDE.md collection count sach? | ✅ |
| Razorpay claim (owner: nahi) | ✅ |
| support email claim (owner: nahi) | ✅ |
| unlisted skills | — |
| plan step (Superpowers) | ✅ |
| debug step (Superpowers) | ✅ |
| minimal-diff rule (Ponytail) | ✅ |

## CI gates

| Gate | Present |
| --- | --- |
| typecheck | ✅ |
| tests | ✅ |
| build | ✅ |
| smoke | ✅ |
| responsive | ✅ |
| audit | ✅ |
