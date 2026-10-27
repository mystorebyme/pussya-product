# Cloudflare Workers (vinext) — storefront ke liye (R34)

**Status: repo-prep + local workerd verification complete. Preview deploy nahi hua
(Credentials nahi diye gaye). Production DNS/Vercel abhi waisa hi hai — koi cutover
nahi hua (dekhen §8).**

Ye doc sirf **storefront** (`apps/web`) ke Cloudflare Workers path ke baare me hai.
Admin (`apps/admin`) aur Express API (`apps/api`) Node par hi chalte hain
(Render/Vercel) — unke URL aur auth contract nahi badle.

---

## 1. Kya kyun

| Cheez | Pehle | Ab (R34) |
| --- | --- | --- |
| Build | `next build` (Vercel/Render) | Wahi + **`vite build` vinext** (Cloudflare Worker bundle) |
| Dev | `npm run dev` (`next dev`, port 3000) | Wahi + **`npm run dev:vinext`** (`vite dev`, port 3001, local workerd) |
| Runtime | Node (Vercel serverless / Render) | Node **ya** workerd — code dono par chalta hai |
| Config | `next.config.ts` | + `vite.config.ts`, `cloudflare.config.ts` |
| Deploy | `vercel` / Render auto | + `npm run deploy:vinext` (`vinext-cloudflare deploy`) |

`next dev`, `next build`, Vercel aur Render ka setup **jaise tha waise hi** hai —
vinext add-on hai, replacement nahi. Rollback = sirf naye files/scripts hatao (§9).

Compatibility check (`npx vinext check`, `apps/web` me):

```
Overall: 97% compatible (18 supported, 1 partial, 0 issues)
imports  6/6     (next/link, next/server, next/navigation, next/headers, next/script, server-only)
structure        17 pages, 4 layouts, 38 route handlers, 1 error boundary, 2 not-found
config   images  partial — hum sirf <img> + CDN use karte hain, optimizer ki zaroorat nahi
```

---

## 2. Commands

```bash
# local dev — workerd par asli Workers runtime (port 3001)
npm run dev:vinext --workspace @noor/web

# production build — output: apps/web/.cloudflare/output/v0/workers/default/bundle
npm run build:vinext --workspace @noor/web

# built bundle ko local workerd par serve (port 8787)
npm run start:vinext --workspace @noor/web -- --host 0.0.0.0 --port 8787

# Cloudflare par deploy (Wrangler login / CLOUDFLARE_API_TOKEN chahiye)
npm run deploy:vinext --workspace @noor/web

# repo root se ek command — install + build + deploy (§7 me yahi dashboard/CI me chalti hai)
npm run deploy:worker
```

`build`/`build:vinext` dono pehle `policies:build` aur `assets:invoice-logo`
chalate hain — generated content kabhi stale nahi rehta.

---

## 3. Config files

**`apps/web/vite.config.ts`** — vinext + Cloudflare plugin, aur do Workers-only
patches (sirf is build ke liye, `next build` par asar nahi):

1. `pdfkit` → `pdfkit.node.mjs` (node ESM entry). Default browser entry module load
   hote hi `__filename` chhoo leta hai → workerd par `TypeError: Invalid URL string.`
2. `new URL('./data/sRGB…icc', import.meta.url)` → absolute URL. workerd is relative
   resolve par wahi error deta hai; PDF/A hum use nahi karte.
3. `require('#standard-fonts/X')` → static `import ... from './standard-fonts/X.mjs'`.
   Warna Workers par `No such module "#standard-fonts/Helvetica"` → invoice 500.
4. `preview.allowedHosts: true` — sirf local `vite preview` ke liye (tunnel/preview
   host). Deploy par koi asar nahi.

**`apps/web/cloudflare.config.ts`** — worker `noor-storefront`,
entrypoint `vinext/server/fetch-handler`, `compatibilityDate 2026-10-26`,
`compatibilityFlags ["nodejs_compat"]`, assets `runWorkerFirst` (HTML worker se,
`/_next/static/*` assets se), aur **sirf naam** declare kiye gaye secrets (§4).

---

## 4. Environment variables / secrets

Values **kabhi** repo me nahi. Local ke liye `apps/web/.dev.vars` (gitignored) ya
`apps/web/.env`; Cloudflare par `npx wrangler secret put <NAME>` (ya dashboard →
Worker → Settings → Variables and Secrets).

| Name | Type | Kya karta hai |
| --- | --- | --- |
| `DATABASE_URL` | secret | **zaroori** — Postgres (orders, invoices, payments, messages, settings) |
| `ADMIN_API_TOKEN` | secret | admin APIs (`/api/admin/*`) ka bearer token |
| `UPI_RETURN_SECRET` | secret | payment return link signature |
| `OTP_TOKEN_SECRET` | secret | OTP token sign (UI se OTP hata hua hai, server verify rehta hai) |
| `GOOGLE_SHEETS_WEBAPP_URL` | secret | owner ki sheet bridge (Apps Script) |
| `GOOGLE_SHEETS_TOKEN` | secret | sheet bridge token |
| `GOOGLE_SHEETS_SETTINGS_CSV_URL` | secret | Settings sheet ka CSV URL |
| `SHEET_SELFTEST_KEY` | secret | `/api/sheet-selftest` key-gate |
| `RESEND_API_KEY` | secret | order/contact email |
| `NEXT_PUBLIC_SITE_URL` | var | `https://noorethnicwear.in` (config me already set) |
| `SHEET_READ_TIMEOUT_MS` | var | Apps Script read timeout — **4000** (R35; 900ms par read hamesha timeout hota tha, isliye sheet ka UPI site par nahi aata tha) |
| `SHEET_SETTINGS_TTL_MS` | var | sheet settings kitni der fresh maani jaayein — **10000** (10s; payment page `?fresh=1` se turant padhta hai) |

> `STORE_UPI_ID` / `STORE_UPI_NAME` config me **jaan-boojh kar declare nahi** kiye —
> UPI ka source of truth owner ki Google Sheet hai (`Settings → upi_id`). Env sirf
> fallback hai; Workers par chahiye to `npx wrangler secret put STORE_UPI_ID`.

Aur (optional, code me default hai): `STORE_UPI_ID`, `STORE_UPI_NAME`, `SELLER_*`,
`GST_HSN`, `OTP_DEV_MODE=off`, `EMAIL_FROM`, `ORDER_NOTIFICATION_EMAIL`,
`CONTACT_EMAIL`, `CORS_ALLOWED_ORIGINS`, `DB_POOL_MAX`.

Razorpay env (`RAZORPAY_*`) **jaan-boojh kar declare nahi kiye** — owner rule: koi
third-party gateway nahi, payments sirf UPI. Route dormant hai (`503 webhook not
configured`).

---

## 5. Workers par kya badla (code changes)

Workers ka file system **read-only** hai. Isliye:

| File | Change | Kyun |
| --- | --- | --- |
| `apps/web/src/lib/fs-runtime.ts` | naya shim (`existsSync`/`readFileSync`/`writeFileSync`/`renameSync`/`mkdirSync`) | Node par asli `node:fs`; Workers par likhna memory me (crash nahi) |
| `lib/{data-dir,orders,payments,store-settings,delivery,messages,manual-invoices,checkout-events,traffic}.ts` | `node:fs` → `@/lib/fs-runtime` | `EPERM: operation not permitted` se `/api/settings`, `/api/delivery/check`, `POST /api/orders` 500 ho rahe the |
| `scripts/build-policies.mjs` → `src/content/policies.generated.ts` | policies build-time bundle | `/policies/:slug` runtime `readFileSync` par 404 de raha tha |
| `scripts/build-invoice-logo.mjs` → `src/content/invoice-logo.generated.ts` | invoice logo base64 | Workers par `public/` disk se padha nahi ja sakta — invoice par wahi logo |
| `src/app/api/health/route.ts` | `runtime`, `storage`, `durable` fields | deploy ke baad ek hi call me pata chale ki data durable hai ya nahi |
| `src/app/policies/[slug]/page.tsx` | generated markdown import | runtime fs nahi |

**Sabse zaroori baat:** Workers par `DATABASE_URL` ke bina orders **memory** me
jaate hain (per-isolate, restart par gayab). `/api/health` aise case me
`"storage":"memory", "durable":false` batata hai. Production me ye **nahi** hona
chahiye.

---

## 6. Feature-by-feature runtime status (local workerd, port 8787/3001)

`✅` = workerd par chala kar dekha gaya (R34), `—` = Node-only by design.

| Feature | Route | workerd |
| --- | --- | --- |
| Home, nav, collections, PDP (variants/images) | `/`, `/collections/:handle`, `/products/:handle` | ✅ 200 |
| Search / filters | `/search`, `/api/search`, `/api/products` | ✅ 200 |
| Cart + server-side pricing | client + `/api/orders` | ✅ (price catalogue se) |
| Order create + idempotency | `POST /api/orders` | ✅ 201; same `idempotency-key` → 200 `idempotent:true` |
| Order page + tracking sach | `/orders/:orderNumber?phone=`, `/api/orders/:n/public` | ✅ status/payment/courier/AWB dikhte hain |
| Admin auth + status/tracking update | `/api/admin/*` | ✅ bina token 401, token ke saath 200; payment gate + status machine kaam karti hai |
| Payment link + UPI confirm | `/api/payments/*` | ✅ verification ke bina 401 (contract same) |
| Payment webhook (dormant) | `/api/webhooks/razorpay` | ✅ 503 (configured nahi) |
| GST invoice PDF | `/api/orders/:n/invoice?phone=` | ✅ `200 application/pdf` (~146 KB, logo embed) |
| Settings (owner sheet par) | `/api/settings`, `/api/admin/settings` | ✅ 200 |
| Delivery/pincode check | `/api/delivery/check` | ✅ 200 (valid + invalid pincode) |
| Contact / newsletter | `/api/contact`, `/api/newsletter` | ✅ 201 |
| Best-sellers | `/api/best-sellers` | ✅ 200 |
| Policies | `/policies/:slug` | ✅ 200 (chaaron) |
| SEO | `/sitemap.xml`, `/robots.txt` | ✅ 200 |
| Health | `/api/health` | ✅ 200, `runtime: cloudflare-workers` |
| Admin panel (Next server actions) | `apps/admin` | — Node (Render/Vercel) |
| Express API | `apps/api` | — Node |

**Verification (R34 me chalaya gaya):**

- `BASE_URL=http://127.0.0.1:3001 npm run test:smoke` → **88 passed, 0 failed**
  (`dev:vinext` = asli workerd + `.dev.vars`).
- `BASE_URL=http://127.0.0.1:8787 npm run test:smoke` → **88 passed, 0 failed**
  (`vite preview` = production bundle, local values `apps/web/.env` se).
  Note: secrets ke bina preview me admin-token wale checks 401 dete hain (10 checks) —
  isliye local `.env`/`.dev.vars` me dev values zaroori hain; deploy par `wrangler secret put`.
- `dev:vinext` start par warning aati hai:
  `Missing required secrets for Worker "noor-storefront": …` — local dev me jinke paas value
  nahi, unke liye. Production me sab set hone chahiye (§4).
- Invoice PDF dono jagah `200 application/pdf` (~146 KB, logo embed); bina `?phone=` → 403.

---

## 7. Deploy — exact steps

### 7.0 Pehle ye galti theek kariye (build fail ho raha tha)

Cloudflare Workers Builds me deploy command `npx wrangler deploy` thi aur build ye
error dekar ruk jaata tha:

```
✘ [ERROR] Could not detect a directory containing static files (e.g. html, css and js) for the project
```

**Wajah:** ye command **repo root** par chalti hai, aur root par koi `wrangler.toml` /
`wrangler.jsonc` hai hi nahi (jaan-boojh kar nahi hai). Wrangler config na milne par
Cloudflare "automatic project configuration" chalata hai — wo framework detect karte waqt
static files ka folder (`public/`, `dist/`) dhoondhta hai, milta nahi → error.
Storefront Next.js app hai: uska Worker **vinext** build karta hai aur config
`apps/web/cloudflare.config.ts` me hai. Deploy isi liye `apps/web` se chalti hai
(`vinext-cloudflare deploy` → vite build → `cf deploy`).

> Owner ka worker pehle se **`designer`** naam se hai (GitHub PR check me
> "Workers Builds: designer → fail" dikha). Isliye §7.1 me `WORKER_NAME=designer`
> build variable zaroori hai — warna deploy ek **naya** worker `noor-storefront`
> bana dega aur `designer` (domain/routes ke saath) stale reh jaayega.

### 7.1 Cloudflare dashboard (Workers Builds) — settings

Workers & Pages → **`designer`** → **Settings → Build** me:

| Setting | Value |
| --- | --- |
| Git branch | `main` |
| Root directory | `/` (repo root — **`apps/web` nahi**: script khud `apps/web` me chali jaati hai, aur `npm ci` ko workspace root chahiye) |
| Build command | `npm ci --no-audit --no-fund` |
| Deploy command | `bash scripts/deploy-cloudflare.sh` |
| Preview command | khaali/band (preview builds chahiye to `SKIP_INSTALL=1 bash scripts/deploy-cloudflare.sh`) |

Aur usi screen par **Build variables and secrets** me do variable:

| Variable | Value | Kyun |
| --- | --- | --- |
| `WORKER_NAME` | `designer` | existing worker update ho, naya na bane (`cloudflare.config.ts` isi env ko padhta hai) |
| `NODE_VERSION` | `22` | repo ko Node ≥ 20.9 chahiye (`cf` ko ^22.23); root `.nvmrc` me bhi `22` hai |

`scripts/deploy-cloudflare.sh` wahi karta hai jo local par karte hain: root par
`npm ci` (agar Build command me pehle hi ho chuka ho to `SKIP_INSTALL=1`), phir
`npm run deploy:vinext --workspace @noor/web` → vinext vite build → `cf deploy`
(`cloudflare.config.ts` padh kar). Deploy command me **kabhi** `npx wrangler deploy`
mat likhiye.

> Build command + deploy command dono me `npm ci` ho to dobara install hota hai —
> isliye deploy command `SKIP_INSTALL=1 bash scripts/deploy-cloudflare.sh` bhi chalega.

### 7.2 Credentials (ek baar)

Cloudflare dashboard → **My Profile → API Tokens → Create Token** → template
"Edit Cloudflare Workers" (account: Workers Scripts = Edit) → token copy.
Phir Worker build ke env me:

```
CLOUDFLARE_API_TOKEN = <token>
CLOUDFLARE_ACCOUNT_ID = <dashboard → account home → right side "Account ID">
```

**Workers Builds me ye step zaroori nahi**: Cloudflare apna build token khud lagata hai
(Settings → Build → *API token* → "Create new token" = Workers Scripts edit + routes edit).
Token tab chahiye jab GitHub Actions ya laptop se deploy karein. Ye tokens **repo me kabhi
nahi** — sirf Cloudflare dashboard / GitHub Actions secrets me.

### 7.3 Worker ke secrets (ek baar, deploy ke baad)

> Naam `WORKER_NAME` se badalta hai — owner ka worker `designer` hai, isliye har command se
> pehle `export WORKER_NAME=designer`. Ya seedha dashboard → Worker → **Settings →
> Variables and Secrets** se daal dein (CLI ki zaroorat nahi).

```bash
cd apps/web
export WORKER_NAME=designer              # aapka existing worker
npx wrangler login                       # ya CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID env

npx wrangler secret put DATABASE_URL             # zaroori — warna orders memory me
npx wrangler secret put ADMIN_API_TOKEN
npx wrangler secret put UPI_RETURN_SECRET
npx wrangler secret put OTP_TOKEN_SECRET
# sheet = owner ka control panel (UPI/phone/announcement real-time inhi se aate hain)
npx wrangler secret put GOOGLE_SHEETS_WEBAPP_URL
npx wrangler secret put GOOGLE_SHEETS_TOKEN
npx wrangler secret put SHEET_SELFTEST_KEY
# optional
npx wrangler secret put GOOGLE_SHEETS_SETTINGS_CSV_URL
npx wrangler secret put RESEND_API_KEY
```

Ya dashboard → Worker → **Settings → Variables and Secrets** → type *Secret* → add.
Har `secret put` ke baad Worker apne aap redeploy hota hai.

### 7.4 Local se deploy (dashboard se jhanjhat nahi)

```bash
cd apps/web && npx wrangler login && cd ..
WORKER_NAME=designer npm run deploy:worker     # = bash scripts/deploy-cloudflare.sh
```

### 7.5 Deploy ke baad verify (3 curl)

```bash
W=https://noor-storefront.<subdomain>.workers.dev

# 1) runtime + durable storage — "storage":"postgres","durable":true chahiye
curl -s $W/api/health

# 2) sheet live hai? meta.sheetSource = "apps-script" aur data.upiId = sheet wala UPI
curl -s $W/api/settings

# 3) admin APIs token ke bina band hain (401 chahiye)
curl -s -o /dev/null -w '%{http_code}\n' $W/api/admin/orders
```

**`durable:true` na dikhe to deploy rok dein** — us haal me orders memory me jaate
hain (isolate restart par gayab). Aur `meta.sheetSource: null` dikhe to sheet
connect nahi hui: `docs/09-devops/google-sheets.md` §1 (Apps Script deploy) kariye.

### 7.6 GitHub Actions se deploy (optional)

`.github/workflows/cloudflare-worker.yml` — repo → **Actions → Cloudflare Worker
(storefront) → Run workflow**. Secrets `CLOUDFLARE_API_TOKEN` + `CLOUDFLARE_ACCOUNT_ID`
GitHub repo me daalne padte hain. Manual trigger hai (production DNS abhi Vercel par
hai, isliye har push par Worker deploy nahi hota).

Custom domain (baad me, owner approval ke baad): Worker → Settings → Domains &
Routes → add `www.noorethnicwear.in` **sirf tab** jab apex/Vercel ka faisla
ho jaye. `noorethnicwear.in` par kuch nahi.

---

## 8. Kya **nahi** kiya gaya (jaan-boojh kar)

- Production DNS touch nahi hua; `noorethnicwear.in` abhi bhi Vercel par.
- Cloudflare account/credentials nahi the → **preview deploy nahi hua**, sirf local
  workerd par verify hua.
- Vercel/Render/GitHub Pages config hataya nahi gaya; `next dev`/`next build` intact.
- Postgres-over-Workers end-to-end **test nahi** hua (sandbox me Postgres nahi tha).
  Isliye preview deploy ke pehle `/api/health` check anivarya hai (§7 step 3).
- Admin panel (`apps/admin`) ko vinext par migrate nahi kiya — server actions +
  HMAC session + middleware ka apna audit chahiye (alag kaam).

---

## 9. Rollback

Repo: `git revert <R34 commit>` — vinext files/scripts hat jaate hain, `next build`
waisa hi chalta rehta hai (ye changes Next path ko chhoote nahi). Deployed preview
Worker: Cloudflare dashboard → Worker `noor-storefront` → Deployments → pichla
version, ya Worker delete. **Vercel production par koi asar nahi** — DNS wahin hai.

---

## 10. Known limitations

| Cheez | Asar | Hal |
| --- | --- | --- |
| `DATABASE_URL` bina deploy | orders memory me (restart par gone) | `/api/health` → `durable:true` check; Postgres/Hyperdrive set karein |
| Postgres TCP from Workers | sandbox me verify nahi hua | preview deploy par health check; Hyperdrive recommended |
| `pdfkit` bundle ~1 MB | Worker size badhta hai (limits ke andar) | chaho to invoice PDF ko alag service par le jaayein |
| `.cloudflare/` build output | audit me na aaye | `scripts/repo-audit.mjs` aur `.gitignore` me excluded |
| Root par wrangler config nahi | `npx wrangler deploy` (root) → `Could not detect a directory containing static files` | deploy command `bash scripts/deploy-cloudflare.sh` rakhein (§7.1); `tests/unit/round35.test.ts` ise pin karta hai |
| Workers par `process.env` sirf declared vars | sheet timeout/TTL knobs na chalte | `cloudflare.config.ts` me `SHEET_READ_TIMEOUT_MS` + `SHEET_SETTINGS_TTL_MS` declare |
| `cf@1.0.0-beta.23` engine warning (node ^22.23) | sirf warning, build chalti hai | Node minor bump (alag decision) |
