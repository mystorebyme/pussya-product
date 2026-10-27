#!/usr/bin/env bash
# headers.sh — production security headers ka quick probe.
#   bash tests/security/headers.sh
#   WEB_URL=https://noorethnicwear.in ADMIN_URL=https://admin.noorethnicwear.in bash tests/security/headers.sh
set -uo pipefail

WEB_URL="${WEB_URL:-http://localhost:3000}"
ADMIN_URL="${ADMIN_URL:-http://localhost:3001}"
fail=0

expect_header() {
  local name="$1" url="$2" header="$3" pattern="$4"
  local value
  value=$(curl -sI --max-time 8 "$url" | grep -i "^$header:" | head -1 || true)
  if [[ "$value" =~ $pattern ]]; then
    printf "ok   %-18s %s\n" "$name" "$header"
  else
    printf "FAIL %-18s %s missing/unexpected: %s\n" "$name" "$header" "${value:-<absent>}"
    fail=1
  fi
}

expect_header "web hsts"        "$WEB_URL/"        "strict-transport-security" "max-age=[0-9]+"
expect_header "web nosniff"     "$WEB_URL/"        "x-content-type-options"    "nosniff"
expect_header "web referrer"    "$WEB_URL/"        "referrer-policy"           "strict-origin"
expect_header "admin noindex"   "$ADMIN_URL/login" "x-robots-tag"              "noindex"

code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "$ADMIN_URL/" || echo 000)
if [[ "$code" == "307" || "$code" == "302" ]]; then
  printf "ok   %-18s admin redirects unauthenticated (%s)\n" "admin guard" "$code"
else
  printf "FAIL %-18s admin returned %s (expected 307)\n" "admin guard" "$code"
  fail=1
fi

api=$(curl -s -o /dev/null -w "%{http_code}" --max-time 8 "${API_URL:-http://localhost:4000}/api/v1/orders" || echo 000)
if [[ "$api" == "401" ]]; then
  printf "ok   %-18s admin api requires a token\n" "api guard"
else
  printf "FAIL %-18s /orders returned %s (expected 401)\n" "api guard" "$api"
  fail=1
fi

exit "$fail"
