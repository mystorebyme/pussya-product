# Security headers

## Storefront & admin (`next.config.ts` headers)

```
X-Content-Type-Options: nosniff
X-Frame-Options: SAMEORIGIN            # admin: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=()
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Robots-Tag: noindex, nofollow        # admin only
Content-Security-Policy: (neeche)
```

## CSP (production, report-only first)

```
default-src 'self';
img-src 'self' https://cdn.shopify.com https://*.shopifycdn.com data: blob:;
script-src 'self' 'unsafe-inline' https://checkout.razorpay.com;
style-src 'self' 'unsafe-inline';
font-src 'self' data:;
connect-src 'self' https://api.noorethnicwear.in https://api.razorpay.com;
frame-src https://api.razorpay.com https://checkout.razorpay.com;
form-action 'self';
base-uri 'self';
object-src 'none';
upgrade-insecure-requests;
```

`unsafe-inline` Next.js inline bootstrap ke liye; Phase 2 me nonce-based CSP.

## API (helmet)

`helmet()` defaults + CORS sirf `WEB_ORIGIN`/`ADMIN_ORIGIN`, `credentials: false`.

## Cookies

`httpOnly`, `sameSite=lax`, `secure` (prod), no `domain` attribute (host-only).

## Verify

`curl -I https://noorethnicwear.in | grep -i -E 'content-security|x-frame|strict-transport'`
+ https://securityheaders.com score ≥ A.
