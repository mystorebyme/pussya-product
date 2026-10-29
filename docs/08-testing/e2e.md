# E2E (Playwright)

## Config

```ts
// playwright.config.ts
projects: [
  { name: "mobile",  use: devices["iPhone 13"] },
  { name: "desktop", use: devices["Desktop Chrome"] },
],
webServer: { command: "npm run start --workspace @noor/web", port: 3000, reuseExistingServer: true },
```

## Fixtures

- `page.goto("/")` base URL se.
- Product fixture: pehla catalogue item (`page.getByTestId("product-card").first()`).
- Order number regex se pick: `/NE-[A-Z0-9]+/`.
- Har test apna `Idempotency-Key` generated karta hai (server reuse nahi).

## data-testid contract

| Selector | Element |
| --- | --- |
| `header-search` | search toggle |
| `search-input` | input |
| `product-card` | card link |
| `size-option` | size button |
| `add-to-cart` | PDP CTA |
| `cart-drawer` | drawer root (`role="dialog"`) |
| `header-cart` | header cart button |
| `mobile-menu` | mobile nav trigger |
| `cart-count` | header badge |
| `checkout-submit` | place order |
| `order-number` | confirmation |
| `cod-error` | blocked message |

Selectors badle to ye doc bhi update karna hai.

## Flake rules

- Koi `waitForTimeout` nahi — `expect(...).toBeVisible()` auto-wait use karo.
- Network idle par depend nahi (images CDN se aati hain) — element-based waits.


## Naye test ids (OTP, tracking, invoice, gallery)

| testid | Kahan | Kya assert karte hain |
| --- | --- | --- |
| `announcement-bar` | har page (header ke upar) | live store jaisa rotating announcement |
| `phone-otp` | checkout | Send OTP → Verify step, verified hone par "Verified" badge |
| `product-price` | PDP | selected size ka price |
| `order-tracking` | order page | status timeline + courier/AWB block |
| `download-invoice` | order page | GST invoice link (phone ke last 4 digit maangta hai) |

Playwright spec (`tests/e2e/storefront.spec.ts`) me gallery swipe, hover image swap aur
OTP dev flow cover hote hain; smoke suite (`tests/e2e/smoke.mjs`) invoice PDF aur
unverified-order block ko HTTP level par check karta hai.
