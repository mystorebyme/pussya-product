---
name: typescript-discipline
description: TypeScript strict rules for this repo — unknown at the edges, narrow once, no any/ts-ignore, money in paise, exhaustive status unions. Use when adding types, parsing request bodies, or fixing typecheck errors.
---

# TypeScript discipline (strict, bina shortcut)

`apps/web/tsconfig.json` strict hai. Typecheck clean hona **definition of done** ka hissa hai.

## 4 rules

1. **Boundary par `unknown`, andar narrow ek baar.**
   ```ts
   let body: unknown;
   try { body = await request.json(); } catch { return badRequest(); }
   const parsed = schema.safeParse(body);      // zod — packages/validation
   if (!parsed.success) return badRequest(parsed.error);
   ```
   ❌ `body as any` ❌ `body as { x: string }` (bina check) → runtime par crash.

2. **`any` / `@ts-ignore` nahi.** Galti ho to type theek karo ya `unknown` + guard likho.
   `npm run audit` inka count 0 rakhta hai — badha to CI fail.

3. **Union ko exhaust karo** — status/step jaisi cheezein:
   ```ts
   const copy: Record<OrderStatus, string> = { placed: "…", confirmed: "…", /* sab */ };
   ```
   `Record<Union, T>` se naya status add karte hi typecheck batata hai ki copy bhool gaye.

4. **Paisa = integer paise.** `number` hi rakho, par naam `…Paise`/`…Cents` ho; `formatPrice()`
   sirf render par. Float (`0.1 + 0.2`) money me kabhi nahi.

## Is repo ke specific types

| Cheez | Kahan | Rule |
| --- | --- | --- |
| Order/status machine | `packages/validation` | import karo, copy nahi |
| Public API envelope | `apps/web/src/lib/*-format.ts` | `{ data }` / `{ error }` fixed shape |
| Sheet row | `apps/web/src/lib/sheet-format.ts` | column naam string, position par bharosa nahi |
| Settings | `apps/web/src/lib/store-settings.ts` | `supportEmail` optional/deprecated — site par nahi dikhta |

## Typecheck chalane ka sahi tareeka

```bash
npm run typecheck                      # web + admin + api, root se
npx tsc -p apps/web/tsconfig.json --noEmit
```

Trap: `apps/web/.next/types` purane build ka ho to `tsc` jhooti error deta hai (`order-preview/page.js`
jaisi) — `.next/types` delete karke dobara chalao, ya `npm run build` ke baad.

## Anti-patterns

- ❌ `as unknown as T` (double cast = type system ko dhokha)
- ❌ `@ts-expect-error` bina comment ke
- ❌ `Record<string, any>` se JSON ghumana
- ❌ `!` non-null assertion jab `if (!x) return` likhna aasan ho
