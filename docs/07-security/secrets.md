# Secrets management

## Inventory

| Secret | Used by | Exposure if leaked |
| --- | --- | --- |
| `ADMIN_PASSWORD` | admin | full store control |
| `ADMIN_SESSION_SECRET` | admin | session forgery |
| `ADMIN_API_TOKEN` | admin → api | order read/status write |
| `RAZORPAY_KEY_ID` | web/api | public-ish (Publishable) |
| `RAZORPAY_KEY_SECRET` | api | charge/refund |
| `RAZORPAY_WEBHOOK_SECRET` | api | fake paid events |
| `RESEND_API_KEY` | api | email spoofing |
| `DATABASE_URL` | Phase 2 | full data |

## Rules

1. Secrets sirf env vars me — repo me nahi (`.env*` gitignored, `.env.example` sirf keys + placeholders).
2. `NEXT_PUBLIC_*` = public by definition; usme koi secret kabhi nahi.
3. Dev defaults code me hain (`dev-only-secret-change-me`, `noor2026`) — production me:
   - `ADMIN_PASSWORD` missing ho to login **fail-closed** (default password kabhi nahi chalta),
   - `ADMIN_SESSION_SECRET` / `ADMIN_API_TOKEN` dono missing hon to admin panel par warning banner,
   - session secret ka fallback `ADMIN_SESSION_SECRET → ADMIN_API_TOKEN` hai, isliye base URL/secret
     badalne par admin ko dobara login nahi karna padta.
4. Logs me secrets/PII nahi (mask phone `98******10`).
5. Rotate schedule: `docs/06-api/auth.md`.
6. Local: `.env.local` (gitignored). Preview/prod: host dashboard (Vercel/Render env).

## Kahan set karte hain (deployment)

| Platform | Kahan | Kaise |
| --- | --- | --- |
| Render | Service → **Environment** | Blueprint `render.yaml` me `generateValue: true` (ADMIN_API_TOKEN, OTP_TOKEN_SECRET, ADMIN_SESSION_SECRET) aur `sync: false` (ADMIN_PASSWORD) — dashboard se ek baar set karke chhod dein. Blueprint dobara apply karne par generated values badal sakti hain, isliye production me manually fix karna behtar. |
| Vercel | Project → **Settings → Environment Variables** | `ADMIN_API_TOKEN`, `OTP_TOKEN_SECRET` type = **Sensitive**, `NEXT_PUBLIC_*` = plain. `Next` build ke waqt inline hote hain, isliye value badalne par **Redeploy** zaroori. |
| GitHub Actions | Repo → **Settings → Secrets and variables → Actions** | Sirf tab chahiye jab CI ko kisi external service me login karna ho. Abhi CI me koi real secret nahi — smoke test dev token use karta hai. |
| Local | `.env.local` (gitignored) | `cp .env.example .env.local`, phir values bharein. |

## Boot validation

`config/env.ts` zod se required keys validate karta hai; production me missing/weak → process exit.
Admin app ke liye `lib/auth.ts` me: production + `ADMIN_PASSWORD` missing = login band (fail-closed).

## Leak response

1. Rotate secret (dashboard) → 2. redeploy → 3. provider dashboard me revoke → 4. audit log check
   → 5. `docs/11-maintenance/changelog.md` me entry (impact likho).
