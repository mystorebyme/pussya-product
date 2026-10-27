#!/usr/bin/env bash
#
# Cloudflare Workers par storefront deploy — **ek command, repo root se**.
#
# Kyun ye script hai (26 Oct 2026):
#   Cloudflare Workers Builds me deploy command `npx wrangler deploy` tha aur build
#   ye error dekar ruk jaata tha:
#     ✘ [ERROR] Could not detect a directory containing static files (e.g. html, css and js)
#   Wajah: repo root par koi `wrangler.jsonc`/`wrangler.toml` hai hi nahi — storefront
#   Next.js app hai jo **vinext** se Worker banta hai, aur uska config
#   `apps/web/cloudflare.config.ts` me hai. Isliye build+deploy `apps/web` se chalta hai.
#
# Kya karta hai:
#   1. repo root par `npm ci` (workspaces wahin se install hote hain — apps/web akela nahi)
#   2. `npm run deploy:vinext --workspace @noor/web`
#      → vinext vite build chalata hai, phir `cf deploy` (cloudflare.config.ts padh kar)
#
# Credentials (kabhi repo me nahi):
#   • local      → cd apps/web && npx wrangler login
#   • CI/Builds  → CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID
#
# Env:
#   SKIP_INSTALL=1  → npm ci chhodo (deps pehle se install hain, jaise CI me)
#
# Poora guide: docs/09-devops/cloudflare-workers.md §7
set -euo pipefail

cd "$(dirname "$0")/.."

echo "→ node $(node -v) · npm $(npm -v) · cwd $(pwd)"

# Cloudflare credential: Workers Builds apna token khud inject karta hai, isliye
# missing hone par **rok-te nahi** — sirf batate hain (asli error CLI dega).
if [[ -z "${CLOUDFLARE_API_TOKEN:-}" && -z "${CLOUDFLARE_OAUTH_TOKEN:-}" ]]; then
  echo "→ CLOUDFLARE_API_TOKEN env me nahi mila."
  echo "  Local par:  cd apps/web && npx wrangler login"
  echo "  CI par:     CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID secrets daalein."
  echo "  (Cloudflare Workers Builds apna token khud lagata hai — wahan ye normal hai.)"
fi

echo "→ worker naam: ${WORKER_NAME:-noor-storefront}  (badalna ho to WORKER_NAME env set kariye)"

if [[ "${SKIP_INSTALL:-0}" != "1" ]]; then
  echo "→ npm ci (repo root — workspaces)"
  npm ci --no-audit --no-fund
fi

echo "→ build + deploy: apps/web → worker 'noor-storefront'"
npm run deploy:vinext --workspace @noor/web

cat <<'EOF'

✔ Deploy command poori hui.
  Ab check kariye (Worker ke URL par):
    /api/health        → "runtime":"cloudflare-workers", "storage":"postgres", "durable":true
    /api/settings      → data.upiId = owner ki sheet wala UPI, meta.sheetSource = "apps-script"
  `durable:true` na dikhe to DATABASE_URL secret set kariye — warna orders memory me
  jaate hain (restart par gayab). Detail: docs/09-devops/cloudflare-workers.md
EOF
