# Unit tests

| File | Covers |
| --- | --- |
| `pricing.test.ts` | coupons, COD fee/limit, totals, status machine, idempotency TTL |
| `validation.test.ts` | phone/pincode/email normalisation, quantity bounds, coupon casing, payment default |
| `catalog.test.ts` | 287 products, unique ASCII handles, paise prices, MRP > price, sizes, 9 collections + counts, app copies in sync |
| `order-number.test.ts` | `NE-` format and burst uniqueness |

```bash
npm test          # runs all of the above via tsx --test
```
