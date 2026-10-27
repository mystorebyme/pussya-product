#!/usr/bin/env bash
# lighthouse.sh — performance budget check. Network chahiye (npm registry).
#   bash tests/performance/lighthouse.sh                      # local build
#   URL=https://noorethnicwear.in bash tests/performance/lighthouse.sh
set -euo pipefail

URL="${URL:-http://localhost:3000}"
OUT="${OUT:-.data/lighthouse}"
mkdir -p "$OUT"

if ! command -v npx > /dev/null; then
  echo "npx nahi mila — node install karo"; exit 1
fi

echo "auditing $URL (mobile preset)"
npx --yes lighthouse "$URL" \
  --preset=perf \
  --only-categories=performance,accessibility,best-practices,seo \
  --chrome-flags="--headless --no-sandbox" \
  --output=json --output-path="$OUT/report.json" \
  --quiet

node -e '
const report = require("./'"$OUT"'/report.json");
const cats = report.categories;
const scores = Object.fromEntries(Object.entries(cats).map(([k, v]) => [k, Math.round(v.score * 100)]));
console.log(scores);
const budget = { performance: 85, accessibility: 90, "best-practices": 90, seo: 95 };
const failures = Object.entries(budget).filter(([key, min]) => (scores[key] ?? 0) < min);
const lcp = report.audits["largest-contentful-paint"].numericValue;
console.log(`LCP: ${(lcp / 1000).toFixed(2)}s (budget 2.5s)`);
if (failures.length || lcp > 2500) {
  console.error("budget miss:", failures.map(([k, v]) => `${k} < ${v}`).join(", "), lcp > 2500 ? "| LCP too slow" : "");
  process.exit(1);
}
console.log("performance budget ok");
'
