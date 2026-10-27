# Design tokens

```css
/* apps/web/src/app/globals.css — @theme */
--color-maroon:      #862222;
--color-maroon-dark: #6d1a1a;
--color-cream:       #faf6f1;
--color-sand:        #e9dfd4;

--font-display: "Cormorant Garamond", "Playfair Display", Georgia, serif;
--font-body:    "Jost", "Helvetica Neue", Arial, sans-serif;
```

## Semantic layer

| Semantic | Raw | Where |
| --- | --- | --- |
| surface | `#ffffff` | page |
| surface-alt | `--color-cream` | section band |
| border | `--color-sand` | cards, dividers |
| text | `#2f2a25` | paragraphs |
| text-muted | `#7a7268` | meta, MRP |
| brand | `--color-maroon` | CTA |
| brand-hover | `--color-maroon-dark` | hover |
| success | `#1f7a4d` | paid badge |
| warning | `#a96500` | pending badge |
| danger | `#a02020` | cancelled badge |

## Type scale

| Name | Size / line | Use |
| --- | --- | --- |
| display | 40/44 (mobile 32/38) | hero |
| h1 | 32/38 | page title |
| h2 | 24/30 | section title |
| h3 | 18/26 | card title |
| body | 15/24 | default |
| small | 13/20 | meta |
| micro | 11/16 + tracking `.12em` uppercase | labels, badges |

## Layout

- Container: `max-w-7xl` (1280) + `px-4 md:px-6`.
- Grid: 2 cols mobile, 3 md, 4 lg for PLP.
- Breakpoints: 640 / 768 / 1024 / 1280.

## Admin tokens

Plain CSS variables: `--ink #1c1a18`, `--paper #fff`, `--line #e5e0da`, `--brand #862222`,
`--ok #1f7a4d`, `--warn #a96500`, `--bad #a02020`. Radius 6px, density 13px base font.
