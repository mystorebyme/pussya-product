# Engineering standards

## Code

- TypeScript strict; `any` sirf justified comment ke saath.
- Server code alag file me agar `fs`/secrets touch karta hai (`lib/*.ts` server-only).
- Ek component = ek kaam; 150+ lines ka component tod do.
- Naming: files kebab-case (`product-card.tsx`), types PascalCase, constants UPPER_SNAKE.
- Money: integer paise, `formatPrice` sirf display ke waqt.
- Dates: ISO string se store, display par `formatDate`.

## Git

- Branch: `feat/…`, `fix/…`, `docs/…`; commit imperative ("add COD validation").
- PR me: what/why, screenshot (UI), curl output (API), risk note.
- `main` always deployable; direct push only for docs.

## Definition of done

1. `npm run typecheck` clean (web, admin, api).
2. `npm run build` clean.
3. Mobile 360px par check.
4. Empty/loading/error state.
5. Docs update agar contract badla.

## CSS

- Storefront: Tailwind utilities + `globals.css` tokens (`--brand`, `--ink`, `--paper`).
- Admin: plain CSS modules-less global classes (`.card`, `.table`, `.badge`) — chhota, fast.
- No inline hex colours in JSX; tokens use karo.

## Testing

- Unit: pricing, validation, order numbering, slug helpers.
- Integration: order create/idempotency, webhook signature, search.
- E2E (Playwright): home → PLP → PDP → cart → COD checkout → order page.

## Logging

- API: `logger.info({ msg, requestId, route, ms })`; PII (phone/email) mask karo.
- Client: koi `console.log` production me nahi.
