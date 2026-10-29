# Fixtures

Manual testing aur integration tests ke payloads. Prices/sizes catalogue ke against valid hain
(handles `database/seeds/catalog.json` me hain).

```bash
# COD order (under the Rs. 3,500 limit)
curl -s localhost:3000/api/orders \
  -H 'content-type: application/json' \
  -H 'idempotency-key: fixture-cod-1' \
  --data @tests/fixtures/order-cod.json | jq

# Prepaid order above the COD limit
curl -s localhost:4000/api/v1/orders \
  -H 'content-type: application/json' \
  -H 'idempotency-key: fixture-prepaid-1' \
  --data @tests/fixtures/order-prepaid-over-limit.json | jq
```

`order-cod.json` subtotal `299900` + COD fee `5000` − 10% discount `29990` = **`274910` paise (Rs. 2,749)**.
