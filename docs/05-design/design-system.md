# Design system

## Brand direction

Modern Indian ethnic wear — rich maroon, cream paper, generous whitespace, editorial serif headings.
Reference: noorethnicwear.in ka premium festive feel, par ours cleaner aur faster.

## Principles

1. **Product pehle** — photo full-bleed, text secondary.
2. **Quiet luxury** — 2 colours, 1 accent, koi gradient/shadow noise nahi.
3. **Mobile-first** — 360px par design decide hota hai, desktop par sirf columns badhte hain.
4. **Fast feedback** — har tap ka 100ms ke andar visible response (optimistic cart badge).
5. **Consistent vocabulary** — "Add to bag", "Checkout", "Track order" fixed.

## Tokens

| Token | Value | Use |
| --- | --- | --- |
| `--color-maroon` | `#862222` | primary CTA, links, badges |
| `--color-maroon-dark` | `#6d1a1a` | hover/pressed |
| `--color-cream` | `#faf6f1` | section backgrounds |
| `--color-sand` | `#e9dfd4` | borders, dividers |
| ink | `#2f2a25` | body text |
| muted | `#7a7268` | secondary text |
| `--font-display` | Cormorant Garamond → Playfair → Georgia | headings |
| `--font-body` | Jost → Helvetica → Arial | body, buttons |

## Spacing & radius

- Base 4px; sections `py-16` (mobile) / `py-24` (desktop); container `max-w-7xl px-4`.
- Radius: `0` for images (editorial sharp), `2px` buttons, `full` only for pills/badges.

## Elevation

Sirf 2 levels: `none` (default) aur `shadow-sm` on sticky header / drawer. Cards par shadow nahi — border.

## Motion

`fadeIn` 200ms, `slideUp` 600ms reveal, marquee 18s linear. `prefers-reduced-motion` par animations off.

## Component inventory

`header`, `footer`, `announcement-bar`, `mobile-nav`, `search-overlay`, `product-card`, `product-grid`,
`product-detail` (gallery + size selector), `cart-drawer`, `checkout-form`, `order-summary`,
`track-order-form`, `policy-markdown`, `empty-state`.
Admin: `admin-nav`, `login-form`, `stat-card`, `table`, `badge`, `form-row`.

## Do / Don't

- Do: ek screen par ek primary CTA.
- Do: price bold, MRP strike-through muted, discount % pill.
- Don't: auto-carousel with 3+ slides; don't hide size chart behind a modal that can't scroll on mobile.
