# Round 35 — Sheet ka UPI **turant** site par + Cloudflare Worker ke proper steps

Date: 26 Oct 2026 · Branch: `arena/b2117b2b-tannu-product` · Code: ready, **deploy baaki hai** (§6)

Aapki shikayat:

> "maine sheet me UPI change kiya par wo change nahi hui real time me … jo cheez sheet se
> data dekh kar turant change hoti hai wo honi chahiye"
> aur Cloudflare build ka error: `✘ Could not detect a directory containing static files`

Dono fix ho gaye. Neeche pehle **asli wajah**, phir **Cloudflare ke exact steps**.

---

## 1. UPI change kyun nahi ho raha tha (3 asli wajah)

Code padhne par teen alag-alag bug mile — teeno mil kar "sheet me badla, site par nahi aaya"
banate the:

| # | Wajah | Asar |
|---|---|---|
| 1 | Apps Script ko padhne ka **timeout 900 millisecond** tha, jabki Google ka Apps Script thanda (cold) padne par **1–4 second** leta hai | Read **hamesha** timeout hota tha → site ko lagta "sheet me kuch hai hi nahi" → **default UPI** dikh jaata tha |
| 2 | Read fail hone par cache **khaali (null)** kar diya jaata tha | Jo sahi UPI pehle mil chuka tha, wo bhi gayab → phir default |
| 3 | Payment page ka fast-path **350 ms** baad haar maan kar **hardcoded default UPI** de deta tha (``) | Sabse bura: **paisa purane UPI par jaane ka risk**, jabki sheet me naya UPI pada tha |

Aur ek chhota gap: payment page ka QR/UPI ID **server ke render** se aata tha, isliye
sheet badalne par page reload kiye bina naya UPI kabhi nahi dikhta tha.

---

## 2. Ab kya hota hai (fix)

| Cheez | Ab |
|---|---|
| Apps Script read timeout | **4 second** (env `SHEET_READ_TIMEOUT_MS` se badal sakte hain) — cold start par bhi read poora hota hai |
| Sheet ka change site par | **≤ 10 second** (env `SHEET_SETTINGS_TTL_MS`), aur page kabhi sheet ka intezaar nahi karta |
| Payment page ka UPI ID + QR | **turant** — page khulte hi browser `/api/settings?fresh=1` call karta hai (sheet se abhi padh kar). Page pehle se khula ho tab bhi naya UPI apne aap aa jaata hai, reload ki zaroorat nahi |
| Announcement, WhatsApp number, footer, shipping line | ≤ **15 second** me apne aap (browser poll); tab par wapas aate hi **turant** |
| Sheet/Apps Script down ho jaaye | Site **default par nahi girti** — jo last sahi value mili thi wahi chalti rehti hai |
| Naya Cloudflare Worker / Vercel cold start | Last sahi value **Cloudflare Cache API** me rehti hai → pehla customer bhi sahi UPI dekhta hai |
| Sheet kitni baar padhi jaati hai | TTL + single-flight (ek hi read sab requests share karti hain) → Apps Script quota safe |
| Aapke liye "sach dikhai de" | `https://<site>/api/settings` me ab `meta` aata hai: `sheetSource` (`apps-script` / `csv` / `null`), `sheetAgeMs`, `sheetLastError`, `sheetReadTimeoutMs` — aur **Admin panel → Google Sheet** screen par wahi baat Hindi me likhi dikhti hai |

Files: `apps/web/src/lib/google-sheets.ts`, `apps/web/src/lib/store-settings.ts`,
`apps/web/src/app/api/settings/route.ts`, `apps/web/src/components/store-settings-provider.tsx`,
`apps/web/src/components/upi-payment.tsx`, `apps/web/src/lib/payments.ts` (+ 2 payment routes),
`apps/web/src/app/api/admin/sheet/route.ts`, `apps/admin/src/app/(admin)/sheet/page.tsx`.

---

## 3. Sheet → site: kab kya update hoga (rule)

| Jagah | Kab tak |
|---|---|
| Payment page (UPI ID + QR + "Open UPI app") | **turant** |
| Order page, invoice, contact, footer, announcement bar, WhatsApp buttons | 10–15 second |
| Admin panel ka edit (Settings screen) | save karte hi (sheet me bhi likha jaata hai) |

Sheet me key naam yahi hone chahiye (lower-case + underscore): `upi_id`, `upi_name`,
`support_phone`, `whatsapp`, `announcement`, `gstin`, `free_shipping`, `admin_url`.

> ⚠️ Agar aapne **"Publish to web" CSV** wala URL (`GOOGLE_SHEETS_SETTINGS_CSV_URL`) diya hai
> aur Apps Script wala `/exec` URL nahi, to Google us CSV ko **~5 minute** cache karta hai —
> real-time nahi milega. Asli real-time ke liye Apps Script ka `/exec` URL zaroori hai
> (`docs/09-devops/google-sheets.md` §1).

---

## 4. 3 minute me khud check kariye

```bash
# 1) sheet ka UPI site par pahunch raha hai?
curl -s https://noorethnicwear.in/api/settings
```

Jawab me dekho:

| Field | Hona chahiye |
|---|---|
| `data.upiId` | **wahi UPI jo sheet me hai** |
| `meta.sheetSource` | `"apps-script"` ✅ |
| `meta.sheetLastError` | `null` ✅ |

- `meta.sheetSource: "csv"` → Apps Script connect nahi, CSV fallback chal raha hai (§3 wali warning).
- `meta.sheetSource: null` + error → Apps Script tak request nahi pahunchi. Wajah 90% yahi hoti hai:
  deployment me **"Who has access: Anyone"** nahi hai, ya **purana/archived deployment URL** env me hai,
  ya **token** galat hai. Poora detail: `https://<site>/api/sheet-selftest?key=<SHEET_SELFTEST_KEY>`.
- Admin panel → **Google Sheet** screen kholo → upar `Connected` + naya notice:
  "Settings sheet se live padhi ja rahi hain ✅" (source, last read ms, value kitni purani).

```bash
# 2) sheet me upi_id badlo, 10 second rukho, phir dobara:
curl -s https://noorethnicwear.in/api/settings | grep upiId
```

---

## 5. Cloudflare Worker — **proper steps** (aapka build isi me fail hua tha)

### 5.1 Error kyun aaya tha

```
Executing user deploy command: npx wrangler deploy
✘ [ERROR] Could not detect a directory containing static files (e.g. html, css and js) for the project
```

`npx wrangler deploy` **repo root** par chala. Root par koi `wrangler.toml` / `wrangler.jsonc`
**hai hi nahi** (jaan-boojh kar nahi hai). Config na milne par Cloudflare "automatic
configuration" chalata hai — wo static site ka folder (`public/`, `dist/`) dhoondhta hai,
milta nahi → error. Aapka storefront Next.js app hai: uska Worker **vinext** banata hai aur
uski config `apps/web/cloudflare.config.ts` me hai. Isliye deploy **`apps/web` se** chalti
hai — root se `wrangler deploy` kabhi nahi.

> **Aapka Cloudflare worker ka naam `designer` hai** (GitHub PR ke check se dikha:
> "Workers Builds: designer → fail"). Neeche `WORKER_NAME=designer` isliye zaroori hai —
> warna deploy ek **naya** worker bana dega aur `designer` (jisme aapka domain/routes hain)
> purana/stale reh jaayega.

### 5.2 Cloudflare dashboard me sirf 3 settings badalni hain

Cloudflare → **Workers & Pages** → aapka Worker (`noor-storefront`) → **Settings → Build**:

| Setting | Value |
|---|---|
| **Git branch** | `main` |
| **Root directory** | `/` (repo root — `apps/web` mat likhiye, warna dependencies install nahi hongi) |
| **Build command** | `npm ci --no-audit --no-fund` |
| **Deploy command** | `bash scripts/deploy-cloudflare.sh` |

Usi screen par **Build variables and secrets** me do variable add kariye:

| Variable | Value | Kyun |
|---|---|---|
| `WORKER_NAME` | `designer` | aapka worker isi naam se hai — naya worker banne se rokta hai |
| `NODE_VERSION` | `22` | repo ko Node 22 chahiye (purane Node par build fail hoti hai) |

Save → **Retry deployment** (ya naya push). Bas. Deploy command me
**`npx wrangler deploy` mat rakhiye** — wahi purani galti hai.

> `scripts/deploy-cloudflare.sh` naya file hai is round me — wahi karta hai jo aap local par
> karte: root par `npm ci` (monorepo workspaces) → `npm run deploy:vinext --workspace @noor/web`
> → vinext build → `cf deploy` (`apps/web/cloudflare.config.ts` padh kar).
> Deploy command me **`npx wrangler deploy` mat rakhiye** — wahi purani galti hai.

### 5.3 Cloudflare ka token (Workers Builds me zaroori **nahi**)

Workers Builds apna API token **khud** lagata hai — Worker → **Settings → Build → API token**
(wahan "Create new token" default hai: Workers Scripts edit + routes edit permission).
Yaani §5.2 ki settings kaafi hain.

Token sirf tab chahiye jab aap **GitHub Actions** ya **apne laptop** se deploy karein:

1. Cloudflare dashboard → **My Profile → API Tokens → Create Token**.
2. Template: **Edit Cloudflare Workers** → Account Resources: *Workers Scripts = Edit* →
   **Continue to summary → Create Token** → token copy.
3. Jahan se deploy karte hain wahan daalein — GitHub repo → **Settings → Secrets and
   variables → Actions**, ya Cloudflare → Build variables:

   ```
   CLOUDFLARE_API_TOKEN  = <paste token>
   CLOUDFLARE_ACCOUNT_ID = <dashboard ke right side "Account ID">
   ```

   Token repo me **kabhi** nahi jaata.

### 5.4 Worker ke secrets (ek baar — ye sabse zaroori step hai)

Deploy ke baad, Worker ke andar ke secrets daalein. Sabse aasaan: dashboard → Worker
(`designer`) → **Settings → Variables and Secrets** → *Add* → type **Secret**.
CLI se karna ho to:

```bash
cd apps/web
export WORKER_NAME=designer      # aapka existing worker
npx wrangler login

npx wrangler secret put DATABASE_URL              # ⚠️ zaroori — warna order memory me, restart par gayab
npx wrangler secret put ADMIN_API_TOKEN
npx wrangler secret put UPI_RETURN_SECRET
npx wrangler secret put OTP_TOKEN_SECRET
npx wrangler secret put GOOGLE_SHEETS_WEBAPP_URL  # ← sheet = UPI/phone real-time isi se
npx wrangler secret put GOOGLE_SHEETS_TOKEN
npx wrangler secret put SHEET_SELFTEST_KEY
npx wrangler secret put RESEND_API_KEY            # optional (email)
```

> **`GOOGLE_SHEETS_WEBAPP_URL` + `GOOGLE_SHEETS_TOKEN` ke bina Worker par sheet kaam nahi
> karegi** — aur tab site default UPI hi dikhaayegi. Vercel me ye env pehle se hain;
> Cloudflare par alag se daalne padte hain (dono jagah ka env apna hota hai).

### 5.5 Deploy ke baad 3 check

```bash
W=https://<aapka-worker>.workers.dev

curl -s $W/api/health       # "runtime":"cloudflare-workers" + "storage":"postgres" + "durable":true
curl -s $W/api/settings     # data.upiId = sheet wala, meta.sheetSource = "apps-script"
curl -s -o /dev/null -w '%{http_code}\n' $W/api/admin/orders   # 401 (token ke bina band)
```

`durable:true` na dikhe → `DATABASE_URL` secret set kariye (Supabase/Neon ka connection
string, `?sslmode=require` ke saath). `sheetSource: null` → §5.4 ke do sheet secrets.

### 5.6 Chahein to GitHub Actions se bhi (dashboard ki zaroorat nahi)

Repo → **Actions → Cloudflare Worker (storefront) → Run workflow**.
GitHub repo me 2 secrets chahiye: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`.
Manual button hai — har push par apne aap deploy nahi hota (production abhi Vercel par hai).

### 5.7 Local se deploy (sabse seedha raasta)

```bash
cd apps/web && npx wrangler login && cd ../..
WORKER_NAME=designer npm run deploy:worker     # install + build + deploy
```

---

## 6. ⚠️ Ek kaam baaki: ye code **deploy** karna padega

Ye sab code fix hain — live hone ke liye deploy zaroori hai:

| Kahan | Kaise |
|---|---|
| **Vercel (aapki asli site — `noorethnicwear.in`)** | GitHub par ye branch merge karte hi `Deploy` workflow chalta hai, ya repo → Actions → **Deploy** → Run workflow. Vercel me env pehle se hain, kuch naya daalne ki zaroorat nahi |
| **Cloudflare Worker** (agar wahan le jaana hai) | §5.2 ki 3 settings + §5.4 ke secrets |

Deploy ke baad §4 wala check kariye — `meta.sheetSource: "apps-script"` aur `data.upiId`
sheet wala dikhna chahiye.

---

## 7. Proof (kya naapa gaya)

| Check | Result |
|---|---|
| Naya suite `tests/sheets/settings-realtime.test.ts` (asli code, stub network) | **10/10 pass** — 1.5s slow Apps Script ab padha jaata hai, fail par last good UPI rehta hai, TTL ke andar 1 network call, stale-while-revalidate, CSV fallback, cold-start payment page default par nahi jaata |
| Naye guards `tests/unit/round35.test.ts` | **12/12 pass** |
| Poora unit suite | **229 pass / 0 fail** (pehle 217) |
| Integration · DB suites | **40/0** · **9/0** |
| Typecheck (web + admin + api) · lint | clean · **0 errors** (33 warnings = pehle jaisi) |
| `npm run audit -- --check` | ✅ Grades: Skills A · Tests A · Hygiene A · Instruction A · CI A |
| Cloudflare **workerd** production bundle (`vite build` + `vite preview`) | `npm run test:smoke` → **88 passed / 0 failed** |
| Payment page workerd par | 200 in **~25 ms**, UPI card + QR render |
| `/api/settings` workerd par | 200, `meta.sheetTtlMs: 10000`, `meta.sheetReadTimeoutMs: 4000` |

Docs: `docs/09-devops/google-sheets.md` (§4b real-time + troubleshooting),
`docs/09-devops/cloudflare-workers.md` (§7 deploy steps + §7.0 error ki wajah),
`agent-guides/troubleshoot-storefront.md` (2 naye section), `.env.example` (3 naye knobs).
