# Owner Report — Round 38 (27 Oct 2026)

> Owner ke sawaal (jinglish me, jaise aaye):
> 1. "`` ye mail id abhi vi show kr rhi hai — **remove kro, code se hi
>    remove kro** — aur btao kha se fetch ho rhi thi. **Jo sheet me hai vo hi fetch honi chahiye.**"
> 2. "redeploy kr diya, **order bi kiya checkout kiya pr koi show hi nhai ho rha** —
>    ye bi btao **db kha se chl rha hai**; muje `owner ke Google account@gmail` wale sheet se chlvana hai.
>    Contact form ke message bi nahi aa rge."
> 3. "apps script **future proof** bnao — perfect, **every line meaningful**, jisko change
>    krne ki jrurat na pde, perfect working **instant**."

---

## 1. `` kahan se aa rahi thi? (poora khulasa)

Ye VPA **4 jagah** baiti thi — isliye "remove karne ke baad bhi" dikh rahi thi:

| # | Jagah | Kya karti thi |
| --- | --- | --- |
| 1 | `apps/web/src/lib/store-settings.ts` | server default: sheet/env na mile to **yahi** dikhti |
| 2 | `apps/web/src/components/store-settings-provider.tsx` | browser default (pehla paint) |
| 3 | **Vercel env `STORE_UPI_ID`** | `` set tha — sheet read fail hote hi yahi fallback chalti thi |
| 4 | Apps Script `DEFAULT_SETTINGS` + demo rows | sheet ka Settings tab khaali ho to script **yahi value seed** kar deta tha — matlab "sheet se" bhi yahi aa sakti thi! |

**Ab (R38):** chaaron jagah se hat gayi — code, script, aur Vercel env (delete kar diya).
UPI ka **ek hi source** hai: aapki sheet ka Settings tab → `upi_id`. Sheet me jo bhara
hai **wahi** site par dikhega. Sheet se value na aaye (script down / `upi_id` khaali) to
payment page jhoot nahi bolta — saaf likhta hai *"Payment settings abhi load nahi ho
rahi"* + WhatsApp help. Galat payee par paisa jaane se ye kahin behtar hai.

Guard: `tests/unit/round38.test.ts` — purana VPA `apps/`, `packages/`, `scripts/` me
kahin dikha to test fail (dobara kabhi wapas nahi aa sakti).

## 2. "Order kiya, sheet me koi show nahi ho raha" — 3 asli wajah mile

| # | Wajah | Fix |
| --- | --- | --- |
| 1 | **Token hi public placeholder tha** — Vercel ka `GOOGLE_SHEETS_TOKEN` = `CHANGE-ME-noor-token` (wahi jo public repo me likha hai). Matlab sheet ka darwaza duniya ke liye khula tha, aur aapke re-paste me token line aksar placeholder par laut aati thi | Token **rotate** kiya (naya 48-char random, sirf Vercel env me) + script ab token **Script Properties** me rakhti hai — `?action=set_token&token=…` URL ek baar kholiye, phir code kitni baar bhi paste ho token **kabhi nahi tootega** |
| 2 | **Anaath sheet** — script ko configured sheet ka access na mile to wo chup-chaap **nayi sheet bana kar** usme likh deti thi. Website par sab "ok" dikhta, aapki sheet khaali rehti (25 Oct ko bhi yahi hua tha) | Anaath sheet banna **band**. Access na ho to loud error (`sheet_access_denied`) + health me saaf likha aata hai. Apni sheet par switch karna ho: script apni sheet se kholiye (Extensions → Apps Script) aur `?action=adopt` dabaiye |
| 3 | **Dikhne layak kuch tha hi nahi** — write fail ho to sirf server log me jaata tha | Ab: append par **ek retry**, har write ka nateeja record, aur **`https://noorethnicwear.in/api/sheet-health`** — ek public page jo poora sach batata hai (neeche §4) |

Contact form ke message isi pipeline se jaate hain (`Messages` tab) — pipeline theek =
message theek. Newsletter → `Newsletter` tab, checkout events → `Checkout` tab, payment
→ `Payments` tab — sab isi append path par, ab retry ke saath.

## 3. DB kahan se chal raha hai? (seedha jawab)

| Layer | Kahan | Kya rehta hai |
| --- | --- | --- |
| **Order DB** | Supabase Postgres (`Noor Clothing`, Mumbai) — `DATABASE_URL` env **aapke hi** Vercel account (`owner ka apna Google account`) me | orders, payments, invoices, messages — site isi se order confirm/tracking dikhati hai |
| **Owner DB (aapki sheet)** | aapki Google Sheet + Apps Script (r38-1) | har order/payment/message/checkout ki **mirror row** + Settings + status/timeline |
| **Kaun jeetta hai** | sheet: settings (UPI/phone/announcement), order **status/courier/AWB/tracking** — sheet DB se aage ho to site sheet dikhata hai (R37 merge). payment status: hamesha DB (paisa = DB ki sacchai) |

Yaani site **dono** se chalti hai: Postgres = tezi/bharose ke liye, sheet = aapka control
panel. Aapko har cheez sheet me dikhegi — uske liye hi §2 wale fixes hain. (Agar aap
chahein to agle round me Postgres bhi **aapke apne Supabase account** me migrate kar
sakte hain — bata dijiyega.)

## 4. Naya Apps Script — r38-1 ("jis ko change karne ki zaroorat na pade")

Poora code: `docs/00-overview/apps-script-code.md` (auto-generated — script se exact sync).

| Feature | Detail |
| --- | --- |
| **Token paste-proof** | Script Properties me; `?action=set_token&token=…` ek baar (badalna ho to `old=` ke saath). Placeholder token se kuch nahi chalta |
| **Public reads** | `settings` (public keys subset — `admin_url` jaisi private cheezein bina token nahi), `health`, `version`, `ping` — token set hone se pehle bhi website ka UPI read chalta hai |
| **`?action=adopt`** | script jo sheet **bound** hai (Extensions → Apps Script) wahi website ki sheet ban jaati hai — purani/galat sheet ka jhanjhat khatam |
| **`?action=health`** | browser me kholiye: version, `tokenSet/tokenOk`, `sheetFound`, `sheetId`, `upiSet`, `problems[]` — har problem ke saath **Hinglish fix** |
| **Anaath sheet band** | access na ho → `sheet_access_denied` (chup-chaap data kahin nahi jaata) |
| **UPI default nahi** | `upi_id` khaali seed hota hai — sirf aapki bhari value chalti hai |
| Saabkaam pehle jaisa | `onEdit` (status edit → timeline, replied-mark), timeline API, order_update, invoices, stock, coupons, reviews, dashboard, backup, seed/clear-demo, doctor/whoAmI |
| **Safai** | duplicate `guard_` (dead code) hataya; har line ka kaam hai |

Website side: `/api/sheet-health` (public, secret-safe) + append retry + `SHEET_EXPECTED_ID`
env override + write-error me token redact.

## 5. Aapke liye setup — 4 kadam, ~4 minute (ek hi baar)

1. **Apni sheet** kholiye (owner ka apna Google account) → **Extensions → Apps Script** →
   purana code delete → `docs/00-overview/apps-script-code.md` ka poora code paste → Save.
   (`TOKEN` line ko **mat chhediye** — token step 3 me URL se set hoga.)
2. Function dropdown → **`setup`** → Run → permission me apna account → Advanced →
   "Go to … (unsafe)" → Allow. (Tabs/headers ban jaayenge.)
   Phir **Deploy → Manage deployments → ✏️ → Version: New version → Deploy**
   (URL wahi `/exec` rehna chahiye — **New deployment mat banaiye**, warna naya URL
   mujhe bhej dijiye, main Vercel me update kar dunga).
3. Browser me kholiye (main chat me exact URL de raha hoon):
   `<webapp URL>?action=set_token&token=<naya token>` → `{"ok":true,…}` aana chahiye.
4. Check: `<webapp URL>?action=health` → `"problems":["sab green ✔"]`, aur
   `https://noorethnicwear.in/api/sheet-health` → `"ok":true`.
   Settings tab me **`upi_id` = apna UPI ID** bhariye — 2-3 second me site par live.

Iske baad kabhi code change karne ki zaroorat nahi: token Properties me hai, sheet
bound hai, UPI sheet me hai — sirf sheet par kaam chalao.

## 6. Quality gates (R38)

| Gate | Result |
| --- | --- |
| `npm run typecheck` | ✅ |
| `npm run test:unit` | ✅ **270/270** (round38 ke 8 naye + updated apps-script suite) |
| `npm run test:all` | ✅ (unit + integration + sheets + db) |
| lint (`@noor/web`) | ✅ 0 errors (warnings CI budget me) |
| `npm run audit -- --check` | ✅ sab A |
| `next build` + `build:vinext` | ✅ |
| Next-prod parity (:3000) | ✅ smoke + payments + responsive + breakpoints + links |
| workerd preview (:8787) | ✅ smoke |

## 7. Deploy — ✅ LIVE

| Cheez | Result |
| --- | --- |
| PR #9 | ✅ **MERGED** (squash) → `main` @ `4062a0a` |
| CI | ✅ typecheck·build·test + production-build smoke (Cloudflare `designer` check owner ke kehne par red chhoda) |
| Vercel production | ✅ `dpl_H2hAd1kjKd9x66QrotXNJnMqLbPH` — **READY / PROMOTED** |
| Live domains | `noorethnicwear.in` · `www.noorethnicwear.in` · `noor-ethnic-wear.vercel.app` |
| Env (isi deploy me) | `STORE_UPI_ID` **deleted** ✅ · `GOOGLE_SHEETS_TOKEN` **rotated** ✅ (build env me confirmed; `STORE_UPI_ID` build env me absent = sahi) |
| `noor-admin` | untouched |

Naya token (script me `set_token` URL se jaana hai): chat me diya gaya hai —
Vercel env me bhi wahi hai. Owner ke 4 kadam (§5) complete hote hi
`/api/sheet-health` `"ok": true` dikha dega.

Files: `scripts/google-apps-script/noor-sheets.gs` (r38-1),
`apps/web/src/lib/{google-sheets,store-settings,upi}.ts`,
`apps/web/src/components/{upi-payment,store-settings-provider}.tsx`,
`apps/admin/src/lib/data.ts`, `apps/web/src/app/api/sheet-health/route.ts` (naya),
`apps/web/src/app/api/{admin/sheet,sheet-selftest}/route.ts`, `.github/workflows/ci.yml`,
`tests/unit/{round38 (naya),apps-script,round23,round27,round37,sale-payments-sheets}.test.ts`,
`tests/e2e/{smoke,payments}.mjs`, docs (`google-sheets.md` §4e, `apps-script-code.md`,
`owner-code-map.md`, `live-vercel-supabase.md`, `netlify-shift-guide.md`), `PROGRESS.md`.
