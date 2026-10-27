---
name: netlify-deploy
description: Netlify par storefront + admin deploy karna (2 sites, env, domain, rollback). Use when shifting hosting to Netlify, changing env values, adding a domain, or debugging a Netlify build.
---

# Netlify deploy (2 sites, ek repo)

Poori step-by-step guide: `docs/00-overview/netlify-shift-guide.md` (env + domain + troubleshooting).

## 2 sites — settings yaad rakho

| | Site #1 storefront | Site #2 admin |
| --- | --- | --- |
| Package directory | `apps/web` | `apps/admin` |
| Base directory | *(khaali — repo root)* | *(khaali)* |
| Build command | `npm run build --workspace @noor/web` | `npm run build --workspace @noor/admin` |
| Publish | `apps/web/.next` | `apps/admin/.next` |
| Config file | `apps/web/netlify.toml` | `apps/admin/netlify.toml` |

**Base directory me `apps/web` likhna sabse aam galti hai** — us se `@noor/types` resolve nahi hota
aur build fail hota hai. Package directory hi badalni hai.

## Env (copy-paste templates)

`infra/netlify/web.env.example` · `infra/netlify/admin.env.example`

- `ADMIN_API_TOKEN` **dono sites par same** (warna 401).
- `STORE_API_URL` (admin) = site #1 ka URL.
- `NEXT_PUBLIC_SITE_URL` = public URL (domain aane par badalna + redeploy).
- `DATABASE_URL` = Supabase **transaction pooler** (port 6543).
- Support email kahin set na karein (owner rule).

## Deploy ke baad

```bash
curl -s https://<site>/api/health          # {"ok":true,...}
curl -s https://<site>/api/delivery/check?pincode=302006
curl -s "https://<site>/api/sheet-selftest?key=$SHEET_SELFTEST_KEY"
```

Phir: ek test order → `/orders/NE-…/pay` (last-4 confirm) → admin me order dikhe →
sheet me row aaye.

## Code side jo already handle hai

- `apps/web/netlify.toml` — Next runtime plugin + headers.
- `apps/web/src/lib/cors.ts` — `*.netlify.app` allowed (checkout/payment cross-origin).
- `apps/web/src/lib/db.ts` — Netlify/Lambda par pool 1 connection (EMAXCONNSESSION se bachne ke liye).
- `apps/web/src/lib/data-dir.ts` — serverless par `/tmp` (bundle read-only).
- `.github/workflows/pages.yml` — Pages preview ka live URL `vars.STORE_API_URL` se.

## Rollback

Netlify → Deploys → purana successful deploy → **Publish deploy**. Env galat ho to bhi yahi karo.

## Traps

- Deploy "live" par har page 404 → Next runtime plugin nahi chala (netlify.toml check + clear cache).
- Domain par "Not Secure" → DNS pehle sahi, phir HTTPS → Provision certificate.
- Free plan credits khatam → site band; build/publish dono credit khate hain (deploy previews off rakho).
