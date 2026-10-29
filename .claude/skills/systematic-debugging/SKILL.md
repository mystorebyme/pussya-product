---
name: systematic-debugging
description: Jab kuch toota ho — pehle asli wajah dhoondo (repro → evidence → 1 root cause), phir ek hi fix. Use when a bug, 500, blank page, "kaam nahi kar raha" or a flaky test shows up.
---

# Systematic debugging — guess nahi, proof

> Symptom ko `try/catch` se chhupana debugging nahi hai. Sabse pehla kaam:
> **"kaun se step par, kaun si value galat hai"** ka jawab nikalna.

## 4 step (order fix hai)

### 1. Reproduce — ek line me likho

```
Repro: <URL / command> → <jo dikhta hai> (expected: <jo dikhna chahiye>)
```

- Live site par: URL + browser console ka error + Network tab ka status.
- Local par: `npm run dev` (web 3000 / admin 3001), ya `npm run start` production build se.
- Reproduce nahi ho raha → **logs/monitoring** pehle (`/api/health`, Vercel/Netlify function logs,
  sheet ka `Errors` tab). Bina repro fix mat likho.

### 2. Evidence — kaun si layer par toota

| Layer | Signal | Kahan dekhein |
| --- | --- | --- |
| Browser/UI | blank, hydration error, console 500 | console + React error |
| Network | CORS, 401, 404, 500, timeout | DevTools Network → status + response body |
| Route handler | 500 with stack | function logs (`/api/...`) |
| DB | `EMAXCONNSESSION`, timeout | Supabase logs, `db.ts` retry messages |
| Sheet | row nahi aayi | `<exec>?action=health`, `Sync`/`Errors` tab |
| Build/deploy | page 404, assets 404 | CI log, deploy log, `404.html` |

**Rule:** pehla layer jo galat dikh raha hai, wahi fix karo — niche wale ko chhedo mat.
(UI par "error aaya" ka matlab DB kharab hai — ye guess hai, evidence nahi.)

### 3. Ek root cause, ek fix

- Hypothesis likho: "mujhe lagta hai X ki wajah se Y" → usko **test/repro se confirm** karo.
- Confirm hone par **sabse chhoti** jagah par fix (`minimal-diff`).
- Do jagah same bug ho to root ko theek karo, dono call sites par patch nahi.

### 4. Guard — dobara na ho

- Ek test jo bug ko pakadta hai (test pehle **fail** hona chahiye, phir pass).
- Jo cheez naapi ja sakti hai usko `npm run audit` me daalo (route→test map, hygiene).

## Is repo ke 5 sabse common bugs

| Symptom | Asli wajah (99%) |
| --- | --- |
| Order bana par **sheet me row nahi** | `GOOGLE_SHEETS_TOKEN` / purana Apps Script deploy (`?action=health` se `version` dekho) |
| Admin par **401** | `ADMIN_API_TOKEN` dono sites par alag |
| `EMAXCONNSESSION` / 500 order par | pooler URL session mode (5432) → transaction (6543) chahiye |
| GitHub Pages par `/orders/…` 404 | static export me route nahi — `404.html` shell chahiye |
| Payment page par QR nahi | `STORE_UPI_ID` missing / settings sheet khaali |

## Anti-patterns

- ❌ `try { } catch { }` — error gayab, bug zinda.
- ❌ 5 cheezein ek saath badalna ("dekhte hain kaun si kaam karti hai").
- ❌ `setTimeout` badha kar race "fix" karna.
- ❌ Test ko dhila karke green karna (assert hata dena).
