# Tech stack

| Layer | Choice | Version | Why |
| --- | --- | --- | --- |
| Storefront | Next.js (App Router) | 16.2.6 | SSG for 287 PDPs, RSC = small JS |
| UI styling | Tailwind CSS | 4.1 | fast iteration, no runtime CSS-in-JS |
| Admin | Next.js + plain CSS | 16.2.6 | server actions, zero extra deps |
| API | Express | 5.3 | simple, boring, easy to hire for |
| Language | TypeScript | 5.9 | shared types with web |
| Validation | zod | 4.6 | one schema for UI + API |
| Runtime | Node | 22 LTS | native fetch, fast |
| Dev runner | tsx | 4.21 | TS seedha chalao, no build step |
| Payments | Razorpay (hosted) | — | UPI + cards + netbanking, India-first |
| Images | Shopify CDN | — | source images already there |
| Email | Resend | — | simple API, good deliverability |
| Hosting | Vercel (web/admin) + Render (api) | — | already used by store |

## Deliberately NOT used

- **Drizzle/Prisma in Phase 1** — no DB needed for read-only catalogue.
- **Redux/Zustand** — cart context + localStorage kaafi hai.
- **next/font** — build-time Google Fonts fetch fails in restricted CI; `<link>` with fallback stack.
- **Stripe** — India me UPI/UPI-mandate ke liye Razorpay better.
- **Custom payment gateway** — PCI DSS burden, no business benefit.

## Upgrade policy

Security patch: within 7 days. Major framework upgrade: quarterly, with `PROGRESS.md` note.
