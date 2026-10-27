# Backup & restore

## What

| Data | Method | Frequency | Retention |
| --- | --- | --- | --- |
| `.data/orders.json` | `scripts/backup.sh` (JSON snapshot) | daily + before deploy | 30 days |
| `.data/*` (settings, audit, overrides) | same script | daily | 30 days |
| `catalog.json` | git | every change | forever |
| Disk snapshot (Render) | host feature | weekly | 4 weeks |
| Postgres (Phase 2) | `pg_dump` | daily | 14 days + monthly |

## Backup

```bash
bash database/scripts/backup.sh
# → .data/backups/orders-2026-10-24T06-00.json (aur baaki files)
```

Cron (Render cron job ya local machine):

```
0 2 * * * cd /app && bash database/scripts/backup.sh && rclone copy .data/backups remote:noor-backups
```

## Restore

```bash
bash database/scripts/restore.sh .data/backups/orders-2026-10-24T06-00.json
```

Script: current file ka `.bak` banata hai, phir copy, phir JSON validity check.

## Rehearsal (monthly)

1. Copy prod backup to staging.
2. Restore staging.
3. Admin me order count + aaj ka order match karo.
4. Note duration in `docs/11-maintenance/incidents.md`.

## Loss scenarios

| Scenario | Recovery |
| --- | --- |
| File corrupt (half write) | tmp+rename design se unlikely; `.bak` se restore |
| Accidental delete | backup (max 24h loss) |
| Disk failure | Render snapshot (max 7d loss) → Phase 2 Postgres PITR |
