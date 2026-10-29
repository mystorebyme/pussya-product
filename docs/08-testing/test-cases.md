# Test cases (core)

## Unit

| ID | File | Case | Expected |
| --- | --- | --- | --- |
| U1 | `tests/unit/pricing.test.ts` | subtotal for 2 items | exact paise sum |
| U2 | U1 | NOOR10 on 251910 | discount 25191 |
| U3 | U1 | WELCOME15 below min order | discount 0 + invalid reason |
| U4 | U1 | COD fee added | total +5000 |
| U5 | U1 | free shipping always | shipping 0 |
| U6 | `tests/unit/validation.test.ts` | phone `12345` | reject |
| U7 | U6 | pincode `012345` | reject (leading 0) |
| U8 | U6 | quantity 11 | reject |
| U9 | U6 | valid order payload | pass |
| U10 | `tests/unit/catalog.test.ts` | 287 products | exact count |
| U11 | U10 | unique handles | 0 duplicates |
| U12 | U10 | price range | 149900–499900 |
| U13 | U10 | every product has ≥1 image + sizes | pass |
| U14 | U10 | 9 collections | counts match |
| U15 | `tests/unit/order-number.test.ts` | format | `/^NE-[A-Z0-9]{6,12}$/` |
| U16 | `tests/integration/admin-session.test.ts` | forged/expired cookie | rejected |

## Integration

| ID | File | Case | Expected |
| --- | --- | --- | --- |
| I1 | `tests/integration/http-api.test.ts` | same key twice | one order, same number + replay header |
| I2 | I1 | different key same payload | two orders |
| I3 | `tests/integration/orders.test.ts` | client price tampering | server catalogue price used |
| I4 | I3 | size not in product | 400 with valid options |
| I5 | `tests/integration/webhook.test.ts` | valid signature | `true` (order paid) |
| I6 | I5 | wrong secret / tampered body | `false`, order unchanged |
| I7 | `tests/integration/http-api.test.ts` | unsigned webhook | 401 |
| I8 | `tests/integration/orders.test.ts` | COD above limit | throws `COD_NOT_ALLOWED` |
| I9 | `tests/integration/search.test.ts` | "anarkali" | relevant hits > 0 |
| I10 | I9 | no match | empty array, total 0 |
| I11 | `tests/integration/http-api.test.ts` | GET /orders no token | 401 `UNAUTHORIZED` |
| I12 | I11 | PATCH invalid transition | 409 `INVALID_TRANSITION` |

## E2E (`tests/e2e/storefront.spec.ts`)

| ID | Flow |
| --- | --- |
| E1 | Home → collection → filter → product |
| E2 | PDP size select → add to bag → drawer shows |
| E3 | Cart qty +2 → subtotal updates |
| E4 | Checkout COD ≤ Rs. 3,500 → order page with number |
| E5 | Checkout COD > Rs. 3,500 → blocked with message |
| E6 | Order tracking with invalid number → friendly error |
| E7 | Mobile 375px: nav, search, sticky add-to-bag |
| E8 | Admin login → order status change → audit entry |

## Non-functional

- LCP < 2.5s (4G throttled), CLS < 0.1, JS < 150KB on PDP.
- 287 PDP build < 5 min.
- `npm audit` no high.
