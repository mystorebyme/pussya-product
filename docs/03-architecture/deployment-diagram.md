# Deployment diagram

## Phase 1 (current)

```
                 DNS: noorethnicwear.in
                          │
                 ┌────────▼─────────┐
                 │ Vercel (edge)    │  apps/web  (static + serverless functions)
                 └────────┬─────────┘
                          │
      admin.noorethnicwear.in ──► Vercel project 2 (apps/admin)
                          │
                 ┌────────▼─────────┐
                 │ Render web svc   │  apps/api (Node 22, persistent disk for .data)
                 └────────┬─────────┘
                          │
             Razorpay ──► /api/v1/webhooks/razorpay
```

**Important**: `.data` shared volume tabhi kaam karta hai jab web/admin/api ek hi instance par ho.
Isliye Phase 1 ka simplest deploy: **ek hi Render service par teen process** (ya web+admin Vercel,
orders API ke through — recommended path niche).

### Recommended Phase 1 deploy

| App | Host | Note |
| --- | --- | --- |
| web | Vercel | `apps/web`, env me Razorpay keys |
| admin | Vercel (subdomain) | Basic Auth / IP allow optional |
| api | Render (Node) | persistent disk `.data` |
| orders | web → api proxy | `ORDERS_API_URL` set karte hi web ka route API ko forward karta hai |

## Phase 2

Postgres (Neon) + Redis (Upstash) + R2 images; web/api scale independently; cron workers as separate service.
