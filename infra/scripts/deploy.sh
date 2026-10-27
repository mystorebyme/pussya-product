#!/usr/bin/env bash
# deploy.sh — pre-flight → deploy hooks → post-deploy smoke.
#   bash infra/scripts/deploy.sh            # sab
#   SKIP_TESTS=1 bash infra/scripts/deploy.sh
# Render deploy hook env me daalo: RENDER_DEPLOY_HOOK=...
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

echo "==> pre-flight"
npm run typecheck
if [[ "${SKIP_TESTS:-0}" != "1" ]]; then npm run test:unit && npm run test:integration; fi
npm run catalog:verify

echo "==> build"
npm run build:web
npm run build --workspace @noor/admin
npm run build --workspace @noor/api

echo "==> backup data"
bash database/scripts/backup.sh || echo "warn: backup skipped (local data not present)"

if [[ -n "${RENDER_DEPLOY_HOOK:-}" ]]; then
  echo "==> trigger api deploy"
  curl -fsS "$RENDER_DEPLOY_HOOK" > /dev/null
fi

if command -v vercel > /dev/null; then
  echo "==> deploy web"
  vercel deploy --prod --yes
  echo "==> deploy admin"
  (cd apps/admin && vercel deploy --prod --yes)
else
  echo "warn: vercel CLI nahi mila — web/admin manually deploy karo (docs/10-deployment/vercel.md)"
fi

echo "==> post-deploy health"
sleep 5
WEB_URL="${WEB_URL:-https://noorethnicwear.in}" \
ADMIN_URL="${ADMIN_URL:-https://admin.noorethnicwear.in}" \
API_URL="${API_URL:-https://api.noorethnicwear.in}" \
bash infra/monitoring/health.sh
