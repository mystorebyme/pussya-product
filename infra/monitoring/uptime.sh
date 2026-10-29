#!/usr/bin/env bash
# uptime.sh — 1 minute loop (systemd/cron ke bina, foreground me).
#   WEB_URL=https://noorethnicwear.in bash infra/monitoring/uptime.sh
# Har failure par ek line log karta hai; 3 lagataar failure = alert hook.
set -uo pipefail

WEB_URL="${WEB_URL:-http://localhost:3000}"
ALERT_WEBHOOK="${ALERT_WEBHOOK:-}"
INTERVAL="${INTERVAL:-60}"
LOG_FILE="${LOG_FILE:-./.data/uptime.log}"
mkdir -p "$(dirname "$LOG_FILE")"

failures=0
while true; do
  code=$(curl -s -o /dev/null -w "%{http_code}" --max-time 10 "$WEB_URL/api/health" || echo "000")
  stamp=$(date -Iseconds)
  if [[ "$code" == "200" ]]; then
    if [[ "$failures" -ge 3 ]]; then echo "$stamp recovered" >> "$LOG_FILE"; fi
    failures=0
  else
    failures=$((failures + 1))
    echo "$stamp failure #$failures (http $code)" >> "$LOG_FILE"
    if [[ "$failures" -eq 3 && -n "$ALERT_WEBHOOK" ]]; then
      curl -s -X POST "$ALERT_WEBHOOK" \
        -H "content-type: application/json" \
        -d "{\"text\":\"Noor storefront DOWN: $WEB_URL/api/health returned $code\"}" > /dev/null || true
    fi
  fi
  sleep "$INTERVAL"
done
