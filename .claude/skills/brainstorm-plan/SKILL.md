---
name: brainstorm-plan
description: Kisi bhi naye kaam se pehle sawaal + chhota plan banao (kaun file, kaun test, kaun doc, kaun edge case). Use when the request is vague, big, or touches money/orders/checkout.
---

# Brainstorm → plan → phir code

> "Plans, tests and debugs before it writes code." — Superpowers ka core.
> Is repo me sabse mehnga bug wahi hota hai jo galat sawaal ka jawab tha.

## Kab use karein

- Request me "fix karo", "kaam nahi kar raha", "jaisa waisa bana do" jaisa kuch ho.
- Kaam me 3+ files ya checkout/order/payment/sheet touch ho raha ho.
- Do options ho aur pata na ho kaunsa chahiye.

## Step 1 — sawaal (max 4, sirf wahi jo kaam badal dein)

| Sawaal | Kyun poochhte hain |
| --- | --- |
| Kaun use karega — customer ya owner (admin)? | UI/API ka shape badal jaata hai |
| "Ho gaya" kaise pata chalega? (URL? sheet row? test?) | Wahi acceptance criteria banega |
| Purana behaviour rakhna hai ya badalna hai? | data/URLs/links tootne ka risk |
| Deadline/scope: sirf ye ek cheez ya poora flow? | chhota diff decide karta hai |

Sawaal poochhne ke baad **apne aap se** ye 3 cheezein likho (chat me, plan ke roop me):

```
Plan:
1. <file(s)> — kya badlega (ek line)
2. <test>    — kaunsa test isse fail hota hai abhi
3. <doc>     — kaun si doc/PROGRESS line update hogi
Risk: <sabse bada jo galat ho sakta hai> → <usko kaise pakdenge>
```

## Step 2 — chhota karo (decomposition)

- Ek badlav = ek behaviour. "aur saath me ye bhi" = **alag commit**.
- Agar plan me 6+ file hai to pehle wo hissa karo jo **akela ship** ho sakta ho.
- Naya dependency chahiye? Pehle likho "iske bina kya tootega" — 90% baar kuch nahi tootta
  (`minimal-diff` skill).

## Step 3 — repo-specific checklist (yahi bhoolna sabse aam hai)

| Cheez | Kahan likhna hai |
| --- | --- |
| Naya API route | `apps/web/src/app/api/<name>/route.ts` + test + `docs/06-api` |
| Money/order rule | `packages/validation` (ek hi jagah) + unit test |
| Sheet column | `scripts/google-apps-script/noor-sheets.gs` `HEADERS` + `docs/00-overview/apps-script-code.md` regenerate |
| User-facing copy | Hinglish, chhota, no emoji, no email display |
| Env variable | `.env.example` + `infra/netlify/*.env.example` + `docs/10-deployment` |

## Anti-patterns

- ❌ Code pehle, plan baad me ("mujhe pata tha kya karna hai").
- ❌ 400-line diff jo "ek chhoti fix" ke naam par aaya.
- ❌ Plan me test nahi likha → test kabhi nahi banega.
- ✅ Plan chat me dikhao, phir likhna shuru karo — owner beech me rok sakta hai.
