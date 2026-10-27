#!/usr/bin/env bash
# Restore — destructive. Pehle dry run karein, phir production me.
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL set karein}"
: "${1:?Usage: restore.sh <backup.dump>}"
read -r -p "Yeh backup current DB ko replace karega. Type 'restore' to continue: " CONFIRM
[ "$CONFIRM" = "restore" ] || { echo "Cancelled."; exit 1; }
pg_restore --clean --if-exists --no-owner --dbname "$DATABASE_URL" "$1"
echo "Restore complete."
