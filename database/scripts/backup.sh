#!/usr/bin/env bash
# Postgres backup — Phase 2 (DB par shift hone ke baad)
set -euo pipefail
: "${DATABASE_URL:?DATABASE_URL set karein}"
STAMP=$(date +%Y%m%d-%H%M%S)
OUT_DIR="${BACKUP_DIR:-./backups}"
mkdir -p "$OUT_DIR"
pg_dump "$DATABASE_URL" --format=custom --file "$OUT_DIR/noor-$STAMP.dump"
echo "Backup ready: $OUT_DIR/noor-$STAMP.dump"
# 14 din se purane backups hatao
find "$OUT_DIR" -name 'noor-*.dump' -mtime +14 -delete
