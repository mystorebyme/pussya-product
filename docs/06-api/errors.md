# Error catalogue

## Envelope

```json
{ "error": { "code": "COD_NOT_ALLOWED", "message": "COD is available up to Rs. 3,500",
             "details": { "limit": 350000, "subtotal": 412000 } } }
```

## Codes

| HTTP | Code | When | Client action |
| --- | --- | --- | --- |
| 400 | `VALIDATION_ERROR` | zod fail | field errors dikhao (`details.fields`) |
| 400 | `INVALID_ITEM` | handle/size/qty invalid | line highlight + cart refresh |
| 400 | `EMPTY_CART` | items `[]` | cart page |
| 401 | `UNAUTHORIZED` | admin token missing/wrong | login |
| 401 | `INVALID_SIGNATURE` | webhook HMAC fail | provider retries; alert |
| 404 | `NOT_FOUND` | product/order nahi mila | friendly empty state |
| 409 | `INVALID_TRANSITION` | status jump galat | refresh order |
| 409 | `DUPLICATE_KEY` | same idempotency key different payload | naya key |
| 422 | `COD_NOT_ALLOWED` | subtotal > 350000 | prepaid choose |
| 422 | `COUPON_INVALID` | code galat/expired | coupon field error |
| 429 | `RATE_LIMITED` | limit cross | `retry-after` seconds |
| 500 | `INTERNAL_ERROR` | unhandled | "try again", log request-id |
| 503 | `PROVIDER_UNAVAILABLE` | Razorpay down | UPI manual fallback |

## Messages

Message user-facing friendly English, `code` machine-readable. Stack traces kabhi response me nahi.
Hinglish copy UI layer me (client) hoti hai.

## Logging

Har error: `requestId`, `code`, `route`, `status`, `ms`. 5xx par stack + safe context (no PII).
