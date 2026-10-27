#!/usr/bin/env bash
# health.sh — ek shot me poora stack check. Cron/uptime monitor isi ko call kar sakta hai.
#   bash infra/monitoring/health.sh
#   WEB_URL=https://noorethnicwear.in API_URL=https://api.noorethnicwear.in bash infra/monitoring/health.sh
set -uo pipefail

WEB_URL="${WEB_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3001}"
API_URL="${API_URL:-http://localhost:4000}"
fail=0

check() {
  local name="$1" url="$2" expect="$3"
  local code
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$url" || echo "000")
  if [[ "$code" == "$expect" ]]; then
    printf "ok   %-22s %s (%s)\n" "$name" "$code" "$url"
  else
    printf "FAIL %-22s %s (expected %s) %s\n" "$name" "$code" "$expect" "$url"
    fail=1
  fi
}

check "web home"        "$WEB_URL/"                      200
check "web health"      "$WEB_URL/api/health"            200
check "web pdp"         "$WEB_URL/products/green-bandhej-maslin-anarkali-suit-set-td-141-copy" 200
check "web checkout"    "$WEB_URL/checkout"              200
check "admin login"     "$ADMIN_URL/login"               200
check "admin guard"     "$ADMIN_URL/"                    307
check "api health"      "$API_URL/api/v1/health"         200
check "api products"    "$API_URL/api/v1/products?perPage=1" 200
check "api admin guard" "$API_URL/api/v1/orders"         401

if [[ "$fail" -ne 0 ]]; then
  echo "health: FAILED"
  exit 1
fi
echo "health: all good"
