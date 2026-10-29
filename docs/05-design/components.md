# Component specs

| Component | Props (key) | States | Notes |
| --- | --- | --- | --- |
| `Header` | — | scrolled, menu open, search open | sticky, transparent→solid on scroll; announcement bar above |
| `AnnouncementBar` | `text` | — | settings se aata hai, dismiss nahi |
| `MobileNav` | `open`, `onClose` | — | full-screen sheet, focus trap, Esc close |
| `SearchOverlay` | `open` | idle/typing/empty | 220ms debounce → `/api/search`; keyboard ↑↓ Enter |
| `ProductCard` | `product`, `priority?` | hover (image 2nd), sold-out | 3:4 image, title 2 lines, price + MRP + %; `next/image` nahi (CDN) → `<img loading=lazy>` |
| `ProductGrid` | `products`, `columns` | loading skeleton | `product-grid-client` sort/filter/load-more wala variant |
| `ProductDetail` | `product` | size not selected → CTA disabled | gallery thumbnails, size buttons, size chart link, accordions (details/shipping/returns) |
| `CartDrawer` | `open` | empty / lines | qty stepper (max 10), remove, subtotal, "Checkout" |
| `CheckoutForm` | — | idle / submitting / error / success | field-wise zod errors, COD disabled > Rs. 3,500 |
| `OrderSummary` | `lines`, `coupon` | coupon applied/invalid | server-computed total par trust |
| `TrackOrderForm` | — | idle / not found | order number → `/orders/[orderNumber]` |
| `PolicyMarkdown` | `slug` | — | `src/content/policies/*.md` |
| `EmptyState` | `title`, `body`, `action` | — | illustration = SVG line art |
| `Footer` | — | — | 4 columns, newsletter, WhatsApp, payment icons |

## Admin

| Component | Notes |
| --- | --- |
| `AdminNav` | 13 links, active state, logout |
| `LoginForm` | email + password, error inline |
| `StatCard` | label, value, delta |
| `Table` | sticky header, zebra off, right-aligned numbers |
| `StatusBadge` | colour by status enum |
| `ActionForm` | server action wrapper, `useFormStatus` pending |

## Accessibility per component

- Sab interactive elements keyboard-reachable; visible focus ring `2px solid var(--color-maroon)`.
- Icon-only buttons me `aria-label`.
- Drawer/modal: `role="dialog"`, `aria-modal`, focus trap, restore focus on close.
