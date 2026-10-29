#!/usr/bin/env bash
# setup.sh — naye machine par ek command me dev ready.
#   bash scripts/setup.sh
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

echo "==> node $(node -v), npm $(npm -v)"
node -e 'const major = Number(process.versions.node.split(".")[0]); if (major < 20) { console.error("Node 20+ chahiye"); process.exit(1); }'

if [[ ! -f .env ]]; then
  cp .env.example .env
  echo "==> .env banaya (.env.example se) — values check kar lo"
fi

echo "==> dependencies"
npm install

echo "==> catalogue"
if [[ ! -f database/seeds/catalog.json ]]; then
  npm run catalog:build
fi
npm run catalog:verify

echo "==> data dir"
mkdir -p .data
[[ -f .data/orders.json ]] || echo "[]" > .data/orders.json

echo "==> typecheck"
npm run typecheck

echo
echo "ready. teen terminals me:"
echo "  npm run dev        # storefront  http://localhost:3000"
echo "  npm run dev:admin  # admin       http://localhost:3001"
echo "  npm run dev:api    # api         http://localhost:4000/api/v1/health"
echo
echo "tests: npm test  ·  smoke: npm run test:smoke (server chalne ke baad)"
