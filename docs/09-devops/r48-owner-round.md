# R48 — owner round: size guide, category images, palette/animation, PDP hover, YouPI gateway

Owner ke 5 kaam (+ 1 naya): poora size guide, unique category images, colours +
animation, PDP hover zoom, aur **YouPI PG** ka integration.

## 1. Size guide — poora Saga-style guide

Owner ne exactly ye maanga tha: 3 tabs, unit toggle, XS–XXL chart, bust se size,
unstitched note, 4 steps with pro-tip. Sab implement hua.

| Cheez | Kahan |
| --- | --- |
| Data (ek hi source) | `apps/web/src/lib/size-chart.ts` |
| Body (tabs/toggle/find/note/steps) | `apps/web/src/components/size-guide-content.tsx` |
| Chart table | `apps/web/src/components/size-chart-table.tsx` |
| Panel (header + PDP) | `apps/web/src/components/size-guide-dialog.tsx` |
| Page | `/pages/size-guide` (`app/pages/[slug]/page.tsx`) |

Chart (owner ke numbers, **verbatim** — cm ko inch se dobara convert nahi kiya):

| Size | Bust | Waist | Hips | Front Length |
| --- | --- | --- | --- | --- |
| XS | 34″ / 85 | 32″ / 80 | 36″ / 90 | 46″ / 115 |
| S | 36″ / 91 | 34″ / 86 | 38″ / 96.5 | 46″ / 117 |
| M | 38″ / 95 | 36″ / 90 | 40″ / 100 | 46″ / 115 |
| L | 40″ / 100 | 38″ / 95 | 42″ / 105 | 46″ / 115 |
| XL | 42″ / 105 | 40″ / 100 | 44″ / 110 | 46″ / 115 |
| XXL | 44″ / 110 | 42″ / 105 | 46″ / 115 | 46″ / 115 |

Subtitle: **Regular Comfort Fit • Ready to Wear**.

*Find My Size*: bust daaliye (inches ya cm) → "Size M · Best Fit · Graceful
regular fit for 38″ bust" + 34″–44″ quick-select. Chart se bahar ke naap par
seedhi baat (XS se chhota → unstitched custom; XXL se bada → unstitched, tailor
XS–5XL).

*Unstitched note*: ~2.5 m kurti top, ~2.5 m bottom, ~2.25 m dupatta, tailor apne
naap par XS–5XL tak sil sakta hai.

*How to Measure*: 4 numbered steps (Bust / Waist / Hips / Front Length), har ek
ke neeche **Pro tip**.

## 2. Category images — har circle ki apni image

Pehle har circle collection ka image (ya us collection ke pehle product ka photo)
dikhata tha — new-arrivals / noors-choice / sale me products overlap karte hain,
isliye circles ek jaisi lagti thin.

Ab `lib/circle-art.ts` saare 7 circles ka selection **ek saath** karta hai:

1. har category ke products ke photos (colour ke saath) candidates,
2. greedy: jo image use ho chuki hai skip, aur jis **colour family** ka circle aa
   chuka hai wo bhi skip (jab tak koi aur option ho),
3. deterministic (random nahi) — build/preview me same.

Live build par result: **7 circles · 7 unique images** (live-check me permanent
guard).

## 3. Colours + animation

`app/globals.css` → R48 block:

- warm ivory/gold tokens (`--noor-ivory`, `--noor-gold`, `--noor-hairline`),
  body par halka gold glow wash, brand-coloured text selection;
- `.cta-sheen` — primary CTA par gold sheen sweep (hover, pointer devices only);
- `.link-underline` — nav links ka khud draw hone wala underline;
- `.gold-hairline` divider;
- sab `prefers-reduced-motion: reduce` par band.

## 4. PDP image hover

`components/product-gallery.tsx`: hover par active slide `opacity-0` ho jaati hai
aur uske upar zoom layer (190%, cursor follow) fade-in hoti hai; `onMouseLeave`
par zoom off + origin reset → image **exactly pehle jaisi**. Touch devices par
ye layer `hidden` rehta hai (wahan swipe/counter chalta hai).

## 5. YouPI PG gateway

Poora setup + security model: **[`youpi-payment-gateway.md`](./youpi-payment-gateway.md)**.

Short (YouPI repo ke `openapi.yaml` ke exactly hisaab se):

1. **Session server se** — `/api/payments/youpi/create` → `POST {payUrl}/api/v1/payments`
   (`X-Merchant-Id` + `Idempotency-Key`, amount order se paise me). `409
   DUPLICATE_SESSION_DETECTED` par purana `session_id` ka wahi checkout khulta hai.
2. **Official `youpi.js`** — `window.Youpi.pay({ checkoutUrl, paymentId, handler })`
   se checkout modal (script gateway origin se load hota hai, vendor nahi).
3. **Authoritative confirmation** — HMAC webhook (`/api/payments/webhook/youpi`)
   aur static hosting ke liye server-verified confirm
   (`/api/payments/youpi/confirm`). Browser ke success ka UI matlab hai, order
   tabhi confirm hota hai jab server `GET /api/v1/payments/{id}` se amount +
   status match kare. Config sheet se live
(`youpi_enabled`, `youpi_pay_url`, `youpi_merchant_id`, `youpi_webhook_secret`) —
redeploy nahi. Config na ho to gateway button render hi nahi hota aur owner ka
purana UPI QR flow chalta rehta hai.

## Verification (is round ka)

| Check | Result |
| --- | --- |
| unit tests | **339 / 0** (`tests/unit/round48.test.ts` me 9 naye guards) |
| typecheck | clean |
| lint | 0 errors (34 pre-existing warnings) |
| static build (Pages) | 486 pages |
| static audit | 34,920 refs · 0 broken |
| live-check (local build par) | **113 ✅ / 0 ❌** (8 naye R48 checks) |
| YouPI end-to-end (mock gateway) | session create → HMAC webhook → order `confirmed` + `paid`; browser-confirm path bhi; wrong amount → `409 ORDER_AMOUNT_MISMATCH` aur order `failed`; duplicate delivery ignore |

## Owner ke liye baaki (YouPI)

1. YouPI gateway deploy karke **gateway URL**, **merchant id** aur **webhook
   secret** nikaalein.
2. Sheet → **Settings** tab me `youpi_pay_url`, `youpi_merchant_id`,
   `youpi_webhook_secret` bhar dein (`youpi_enabled` = `true`).
3. Automatic confirmation (webhook) ke liye site Vercel/Render par chahiye
   (GitHub Pages static hai — wahan webhook receive nahi ho sakta). Server na ho
   to bhi payment chalega par order confirm karne ke liye confirm-endpoint/server
   chahiye, isliye **Vercel deploy recommended** hai.
4. YouPI ke README ke mutabik ye gateway experimental hai (≤20 tx/day guideline) —
   team ko bank statement se reconcile karna chahiye.
