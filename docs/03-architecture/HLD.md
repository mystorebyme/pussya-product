# High Level Design

## Context

```
                ┌──────────────────────────┐
  Customer ───► │  apps/web (Next.js 16)   │  static pages + route handlers
                │  - 287 PDP prerendered   │
                │  - cart in localStorage  │
                └───────┬──────────┬───────┘
                        │          │
        catalogue.json  │          │ POST /api/orders, /api/payments
     (build artifact)   │          ▼
                        │   ┌───────────────┐    ┌──────────────┐
                        └──►│  .data/*.json │◄──►│ apps/admin   │  owner operations
                            │  (orders,     │    │ (Next.js)    │
                            │   messages,   │    └──────────────┘
                            │   overrides)  │
                            └───────┬───────┘
                                    │
                            ┌───────▼────────┐        ┌──────────────────┐
  Partner / mobile ───────► │  apps/api      │◄──────►│ Razorpay         │
                            │  (Express 5)   │ webhook│ (hosted checkout)│
                            └────────────────┘        └──────────────────┘
```

## Key decisions

| Decision | Reason |
| --- | --- |
| Catalogue static JSON | 287 read-only products; DB round-trip waste, prerender se TTFB ~50ms |
| Orders in JSON file (Phase 1) | Zero infra, single instance; interface service layer me hai taaki DB swap easy ho |
| Web + API separate | Web server-rendered UI; API stable contract for mobile/partners |
| Payment fully third-party | PCI scope zero; hum sirf payment link + webhook handle karte hain |
| Cart in localStorage | Guest checkout, no server session cost; server checkout par price re-verify |

## Runtime flows

1. **Browse** — static HTML from CDN edge (home, 9 PLPs, 287 PDPs) → sort/filter client-side →
   images direct from the Shopify CDN.
2. **Search** — client → `/api/search` (server reads catalogue, no client bundle bloat).
3. **Checkout** — client → `/api/orders` → validate → price recompute → `.data/orders.json` atomic write.
4. **Payment** — provider link → user pays → webhook (HMAC) → order `paid` → email queued.
5. **Admin** — cookie session → server components read `.data` → server actions mutate + audit.

## Boundaries

- Web/Admin/API kabhi ek dusre ke internals import nahi karte; shared code `packages/*` me.
- Health endpoints (`/api/health`, `/api/v1/health`) dono `{ data: { status: "ok", … } }` envelope dete hain.
- Provider-specific code `integrations/*` me; business logic provider-agnostic.
- Money integer paise everywhere.
