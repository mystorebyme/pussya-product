---
name: minimal-diff
description: Sabse chhota badlav jo kaam kare — naya dependency, naya abstraction, naya config default nahi. Use before adding any package, helper, wrapper, state library or refactor.
---

# Minimal diff — "laziest senior dev" rule

> "Codes like the laziest senior dev in the room." — Ponytail.
> Maqsad: **kaam ho jaye, code kam ho.** Thakaan wala code hi chhota hota hai.

## 5 sawaal (code likhne se pehle)

1. **Kya iske bina ho sakta hai?** — half the time: haan.
2. **Kya pehle se maujood hai?** — `grep` karo: `packages/validation`, `apps/web/src/lib`,
   `apps/web/src/components` me pehle se helper ho sakta hai.
3. **Kitni lines?** — 10 line me ho sakta hai to 100 line mat likho.
4. **Naya dependency?** — sirf tab jab 40+ line bachein *aur* wo cheez core ho.
5. **Naya config/state?** — pehle props/URL/server state se try karo.

## Is repo ke rules (already decide ho chuke)

| Cheez | Rule |
| --- | --- |
| UI library | ❌ nahi — Tailwind + apne components |
| State library | ❌ nahi — server components + URL params |
| Animation library | ❌ nahi — CSS (`reveal.tsx`) |
| ORM / query builder | ❌ nahi — `pg` + `db.ts` |
| Payment gateway | ❌ nahi — seedha UPI (owner rule) |
| Email service | optional — sirf tab jab owner kahe (message DB + Sheet me jaata hai) |
| Icon pack | ❌ nahi — inline SVG jo already hain |

## Diff discipline

- **Ek commit = ek behaviour.** "aur ye bhi theek kar diya" → alag commit.
- Purana code delete karna bhi part of fix hai — dead code chhodna diff ko bada karta hai.
- Comment sirf **kyun** likho, **kya** nahi (`// sheet na khule to nayi bana lo` ✅,
  `// loop chalao` ❌).
- Formatting-only changes alag commit (review me shor nahi).

## Red flags (jab diff bada ho raha ho)

- 3+ nayi files ek fix me.
- Ek helper sirf ek jagah use ho raha hai → inline kar do.
- "Future me kaam aayega" wala option/flag.
- Wrapper jo sirf ek function call karta hai.
- `any`, `@ts-ignore`, `eslint-disable` — kuch chhupa rahe ho to ruko.

## Verify

```bash
git diff --stat            # 300+ lines? wajah likho
npm run typecheck && npm test
npm run audit              # hygiene: any / TODO / console / secrets
```
