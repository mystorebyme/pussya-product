# Runbook

## Daily (5 min)

1. Admin dashboard → naye orders count.
2. `placed` orders ko WhatsApp par confirm karo → admin me `confirmed`.
3. Pending prepaid payments check (Razorpay dashboard).
4. Health: `curl -s https://api.noorethnicwear.in/api/v1/health`.

## Weekly

- Backup download (`database/scripts/backup.sh` output copy off-server).
- Price spot-check 3 products vs store.
- Stock audit: sold-out sizes update.
- Error log review (5xx, webhook failures).
- `npm audit` + dependency bump (patch only).

## Common tasks

| Task | Steps |
| --- | --- |
| Naya product | catalogue rebuild (JSON) → build → deploy → admin me stock/price override |
| Price change (jaldi) | admin `/products/[handle]` → new price → save (override layer) |
| Stock khatam | admin `/inventory` → 0 → PDP par Sold out |
| Order cancel | admin order → status `cancelled` → refund (agar prepaid) → WhatsApp customer |
| Return | customer se product receive → status `returned` → refund → inventory +1 |
| AWB add | admin order → status `shipped` + note me AWB |
| Coupon band | `packages/validation` constants → deploy (ya Phase 2 me admin toggle) |

## Support scripts

```bash
# order dhundo
jq '.orders[] | select(.orderNumber=="NE-05K05TGG")' .data/orders.json

# aaj ke orders
jq '[.orders[] | select(.createdAt | startswith("2026-10-24"))] | length' .data/orders.json

# total sales
jq '[.orders[] | select(.status!="cancelled") | .total] | add' .data/orders.json
```

## Escalation

Payment issue → Razorpay dashboard → support ticket (payment id ke saath).
Hosting down → status page → rollback/previous deploy.
Customer angry → refund + free shipping next order (owner discretion, note in audit).
