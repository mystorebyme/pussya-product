# Component diagram

```
apps/web
├── app/
│   ├── page.tsx                     home (static)
│   ├── collections/[handle]/         PLP (server, searchParams)
│   ├── products/[handle]/            PDP (287 × SSG)
│   ├── search/                       search results
│   ├── cart/ checkout/               client cart + order submit
│   ├── orders/[orderNumber]/         confirmation (dynamic, reads store)
│   ├── policies/[slug]/              markdown policies (SSG)
│   ├── pages/[slug]/                 about, contact, FAQ, size guide
│   └── api/{orders,search,products,payments,contact,newsletter,health,webhooks}
├── components/  header, footer, cards, detail, cart, checkout, forms
└── lib/         store, orders, payments, messages, markdown, format, data-dir

apps/admin
├── (admin)/ dashboard, orders, products, inventory, collections,
│            customers, reports, coupons, reviews, settings, audit-logs, staff, banners
├── login/
├── actions.ts (server actions: stock, price, status, settings)
└── lib/ auth, session, data, format

apps/api
├── modules/{products,orders,payments,health}
├── middlewares/{request-id,error,validate,rate-limit,idempotency,auth}
├── webhooks/razorpay.webhook.ts
├── integrations/{razorpay,email,whatsapp,shiprocket,storage}
└── jobs/{queues,workers,schedulers}

packages
├── types (shared TS models)
├── validation (zod schemas + business constants)
├── api-client (typed fetch)
├── ui (admin primitives)
└── config (tsconfig, eslint, prettier)
```
