# Release process

## Versioning

`MAJOR.MINOR.PATCH` — tag `v1.2.3` on `main`. Release notes = `changelog.md` section.

## Steps

1. `PROGRESS.md` me "planned release" entry.
2. Local verify: `npm run typecheck && npm run build --workspaces && npm test`.
3. Backup `.data` (`database/scripts/backup.sh`).
4. Merge PR → auto deploy (web/admin) + Render deploy (api).
5. Smoke test (5 min):
   - `/` 200, PDP 200, collection 200
   - `POST /api/orders` test order (then cancel)
   - admin login + dashboard
   - `/api/v1/health`
6. Tag release, update changelog date.
7. Announce (internal WhatsApp note; customer-facing only for visible changes).

## Hotfix

Branch `hotfix/x` → PR (1 reviewer if available, else self-review checklist) → merge → deploy →
changelog `### Fixed` → incident note if customer-facing.

## Freeze windows

Festive sale ke pehle 24h aur sale ke dauraan: koi schema/catalogue change nahi, sirf hotfix.

## Post-release

- 24h monitoring: 5xx, order creation, payment success.
- Week 1: perf check (LCP), support tickets review.
