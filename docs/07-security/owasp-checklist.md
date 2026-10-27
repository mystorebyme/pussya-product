# OWASP Top 10 checklist

| # | Risk | Humara control | Status |
| --- | --- | --- | --- |
| A01 | Broken access control | middleware + `requireSession()` in actions + `requireAdmin` on API | ✅ |
| A02 | Cryptographic failures | HMAC timingSafeEqual, https-only, secrets in env, no card data | ✅ |
| A03 | Injection | koi SQL nahi (Phase 1); markdown HTML sanitized; slug regex whitelist | ✅ |
| A04 | Insecure design | server-side pricing, COD cap, idempotency, audit trail | ✅ |
| A05 | Security misconfiguration | noindex admin, headers, prod boot-check on dev secrets | ✅ |
| A06 | Vulnerable components | `npm audit` CI, monthly dependency bump | ⏳ |
| A07 | Auth failures | strong password, session TTL, login rate limit | partial (2FA Phase 2) |
| A08 | Data integrity | signed webhooks, event dedupe, order snapshot immutability | ✅ |
| A09 | Logging failures | request-id, audit log, error logs without PII | ✅ |
| A10 | SSRF | user-supplied URLs fetch nahi karte | N/A |

## XSS specifics

- Product descriptions = source HTML (trusted, humare DB se) — render `dangerouslySetInnerHTML` sirf catalogue ke liye.
- User input (notes, contact message) kabhi HTML ke roop me render nahi — React escaping.
- Policy markdown: humari files, minimal parser (no raw HTML pass-through).

## Upload

Phase 1 me koi user upload nahi (images CDN se). Phase 2: type/size validation + S3 presigned.
