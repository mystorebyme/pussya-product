# Round 36 — Address yaad rahe, payment **step 3 par yahin**, UPI apne aap na khule

Date: 27 Oct 2026 · Branch: `arena/b2117b2b-tannu-product` · PR #8 · Site: **Vercel** (`noor-clothing`)

Aapne chaar cheezein kahi:

> 1. "ek baar address card ki detail fill kare to sab **cache me save** kar lena, next time
>    direct **recommend** ho jaaye"
> 2. "payment ka **alag se page nahi** khulna chahiye — wahi **3rd step** me kaam kare,
>    **back** jaane par bhi, aur **wapis usi order me payment** par jaane par bhi"
> 3. "payment page par jaate hi **UPI par redirect na kare** — **Pay on UPI** kare tab jaakar
>    UPI detect ho"
> 4. "sheet ko **vapis se configure** karo — vaise abhi **Vercel** par deploy hai, fix karo"

Charo ho gaye. Neeche ek-ek karke.

---

## 1. Address ek baar bhara → agli baar pehle se bhara aayega

**Kaise kaam karta hai:** customer jab step 1 (delivery details) bhar kar **Continue to review**
dabata hai — ya order place karta hai — to naam, mobile, email, address, city, state, pincode
aur notes browser ke **localStorage** me save ho jaate hain. Agli baar `/checkout` khulte hi
wahi details **pehle se bhari** aati hain (pincode ka delivery check bhi apne aap chal jaata hai).

- Upar ek green notice dikhta hai: *"Aapka pichhla address pehle se bhara hua hai"* +
  **"Naya address bharein"** button (ek tap me form khali + saved details delete).
- Browser ka apna autofill bhi chalu: har field par `autocomplete` lagaya hai
  (`name`, `tel`, `email`, `street-address`, `address-level2`, `address-level1`, `postal-code`),
  isliye Chrome/Safari ke saved address bhi suggest honge.
- **UPI confirm** me mobile ke **last 4 digit** bhi pehle se bhare aate hain — customer ko
  sirf "Payment ho gaya — confirm kariye" dabana hai.
- 6 mahine purani details recommend nahi hoti (khud expire).

**Privacy (aapke purane rules ke hisaab se):**
- Sirf **delivery details** save hoti hain — koi payment detail, UPI PIN, card number, OTP ya
  UTR **kabhi nahi**. (Is store me card payment hai hi nahi — sirf UPI.)
- Data **customer ke apne browser** me rehta hai, hamare server ya sheet par nahi jaata.
- Adhoori details save nahi hoti (naam < 2 char, mobile ≠ 10 digit, address < 8 char,
  pincode ≠ 6 digit) — warna galat address recommend ho jaata.
- Code: `apps/web/src/lib/checkout-details.ts` (+ test `tests/unit/round36.test.ts`).

---

## 2. Payment ab **step 3 par, checkout ke andar hi** (alag page nahi)

| Pehle | Ab |
|---|---|
| Place order → `/orders/NE-…/pay?pay=1` (naya page load) | Place order → **usi page par step 3** (payment) khulta hai |
| URL: `/orders/NE-…/pay` | URL: `/checkout?step=payment&order=NE-…` |
| Browser back → review (snapshot se) | Browser back → **review (step 2)**, phir back → details |

Step 3 par wahi sab hai jo payment page par tha: live payment status, UPI QR, **Pay on UPI**
button, last-4 confirm, WhatsApp screenshot link, aur "Order details dekhein" callout.
Order summary (items + total) side me saath rehti hai.

**Teeno case kaam karte hain (aapne teeno poochhe the):**

1. **Naya order** → place karte hi step 3 yahin khulta hai (page reload nahi).
2. **Back** → step 2 (review) par jaata hai; wahan se **Continue to payment** dabane par
   step 3 dobara (order **dobara banta nahi** — wahi order number).
3. **Wapis usi order me payment** → link `/checkout?step=payment&order=NE-…` (ya refresh,
   ya doosra tab) kholte hi payment chal jaata hai. Data naye API
   `/api/orders/<order>/payment-context` se aata hai: amount, **sheet se live UPI**,
   payment status, aur UPI-return token.

**Ek asli bug bhi isme theek hua:** UPI app se wapas aane ka callback `/orders/NE-…` par jaata
tha — jis page par UPI component hota hi nahi, isliye **auto-confirm kabhi chalta hi nahi tha**.
Ab callback step 3 par aata hai (`/checkout?step=payment&order=…&upi=return&t=…`), jahan
`UpiPayment` render hota hai → payment apne aap confirm + status turant "Payment received".
Purane payment page ka callback bhi usi page par set kar diya (`/orders/<n>/pay`), kyunki wo
page bhi UPI component render karta hai.

**Purane links safe hain:** `/orders/NE-…/pay` waise hi kaam karta rahega (WhatsApp/email/QR
ke purane links, aur bina JavaScript ke). Dono jagah ek hi UPI card hai.

> Technical note: step 3 par checkout ka outer `<form>` render nahi hota (UPI card ke andar
> apna form hai — nested form invalid HTML hai aur galti se doosra order bana deta).

---

## 3. UPI app **apne aap nahi** khulti — sirf "Pay on UPI" par

Pehle: payment page khulte hi (`?pay=1`) mobile par 250ms baad UPI app chooser **khud** khul
jaata tha — customer ne kuch dabaya nahi hota tha.

Ab: wo auto-redirect code **hata diya**. Button ka naam **"Pay on UPI · ₹…"** hai; **dabane par
hi** phone ka UPI app khulta hai (amount + order note pehle se bhare). Desktop par QR scan.
`?pay=1` flag ab kahin use nahi hota (purane links me ho to bhi koi redirect nahi hoga).

---

## 4. Google Sheet — Vercel par kya configured hai aur "vapis configure" kaise karein

### 4.1 Jo maine Vercel par **abhi check** kiya (project `noor-clothing`)

Site Vercel par hai: project **`noor-clothing`** (root directory `apps/web`,
build `cd ../.. && npm run build --workspace @noor/web`), domains
**`noorethnicwear.in`** + `www.`. Admin panel alag project **`noor-admin`** par hai.

| Env variable | Status | Kaam |
|---|---|---|
| `GOOGLE_SHEETS_WEBAPP_URL` | ✅ set (`script.google.com/macros/s/AKfycbwIJ1ge…/exec`) | Apps Script web app (settings + rows) |
| `GOOGLE_SHEETS_TOKEN` | ✅ set (encrypted) | Apps Script ka `TOKEN` |
| `SHEET_SELFTEST_KEY` | ✅ set (encrypted) | `/api/sheet-selftest?key=…` debugging |
| `DATABASE_URL`, `ADMIN_API_TOKEN`, `OTP_TOKEN_SECRET`, `UPI_RETURN_SECRET` | ✅ set | order DB + payment confirm |
| `STORE_UPI_ID` = `` | ✅ set | **sirf fallback** — sheet na chale tab |
| `GOOGLE_SHEETS_SETTINGS_CSV_URL` | ❌ nahi hai | optional fallback (~5 min Google cache) — real-time ke liye zaroori nahi |
| `SHEET_READ_TIMEOUT_MS` / `SHEET_SETTINGS_TTL_MS` | ❌ nahi (default 4000 / 10000) | zaroorat ho tabhi add karein |

Yaani **sheet connection Vercel par pehle se configured hai** — URL aur token dono maujood hain.

### 4.2 Phir UPI update kyun nahi ho raha tha? Do wajah

1. **Sabse badi wajah: production par purana code chal raha tha.** Vercel ka live deployment
   commit `9704b3b` ka hai — Round 35 ka sheet fix (4s timeout, 10s TTL, last-good value,
   `?fresh=1`, live UPI) usme **hai hi nahi**. Purana code 900ms par timeout karke chup-chaap
   default UPI dikha deta tha. **Fix live hone ke liye deploy zaroori hai** (§5).
2. **Vercel-specific bug (ab fix):** background sheet refresh `void promise` se hota tha.
   Vercel par response jaate hi function **freeze** ho sakta hai, isliye refresh adhoora reh
   jaata tha. Ab `runInBackground()` (Next ka `after()`) chalta hai — response ke baad bhi
   platform kaam poora karta hai. (Cloudflare Workers par pehle jaisa fallback.)

### 4.3 Sheet "vapis configure" karni ho — 5 step

1. Apps Script editor → **Deploy → Manage deployments** → ✏️ (Edit) → Version: **New version**
   → Execute as: **Me** → Who has access: **Anyone** → **Deploy**.
   ⚠️ Sirf *Save* karne se `/exec` URL update **nahi** hota — new version deploy karna zaroori
   hai. Agar **naya** deployment banaya to URL hi badal jaata hai (tab step 3 zaroori hai).
2. Apps Script ke `TOKEN` aur Vercel ke `GOOGLE_SHEETS_TOKEN` **same** hone chahiye.
3. Vercel → project **`noor-clothing`** → Settings → Environment Variables →
   `GOOGLE_SHEETS_WEBAPP_URL` (aur badla ho to `GOOGLE_SHEETS_TOKEN`) → **Save**.
4. **Redeploy**: Vercel → `noor-clothing` → Deployments → latest → ⋯ → **Redeploy**.
   (Env change existing deployment par apply nahi hota.)
5. Verify (3 minute):
   ```bash
   curl -s "https://noorethnicwear.in/api/settings?fresh=1"
   #  → "meta":{"sheetSource":"apps-script", …}  aur  "upiId":"<sheet wala UPI>"
   curl -s "https://noorethnicwear.in/api/sheet-selftest?key=<SHEET_SELFTEST_KEY>"
   #  → urlDeployment Apps Script ke deployment id se match kare, write ok ho
   ```
   Admin panel → **Google Sheet** screen par bhi "Live read" button se wahi check hota hai.

Sheet ki poori guide + troubleshooting: `docs/09-devops/google-sheets.md` (§4b real-time,
**§4c Vercel config**), aur `docs/00-overview/apps-script-setup-steps.md`.

**Sheet ka UPI step 3 par kaise pahunchta hai:** `/checkout?step=payment&order=…` →
`/api/orders/<n>/payment-context` → `getStoreSettingsFast()` → **sheet-first** UPI.
Yaani sheet me UPI badalte hi naya order naye VPA par banta hai — redeploy/restart nahi.

---

## 5. Ye sab live kab hoga?

| Platform | Kya | Status |
|---|---|---|
| **Vercel** `noor-clothing` (noorethnicwear.in) | storefront — **yahi live site hai** | ⚠️ purana commit `9704b3b` chal raha hai → **deploy karna zaroori** |
| Vercel `noor-admin` (admin.noorethnicwear.in) | admin panel | PR ke branch ka preview banta hai; production `main` se |
| Cloudflare Worker `designer` | alternate deploy path | Workers Build fail — dashboard settings chahiye (`docs/09-devops/cloudflare-workers.md` §7, `WORKER_NAME=designer`) |

Deploy ke do raaste:
1. **PR #8 merge** → `main` → Vercel production deploy (admin + storefront projects `main` se
   jude hain to apne aap).
2. Ya branch ke commit se Vercel par **production deploy** (jo pichhle rounds me hota aaya hai).

> Deploy ke baad ek baar khud check kariye: `/checkout` → address khali ho to bhariye →
> Continue → Place order → **step 3 yahin khule** (naya page na jaaye) → **Pay on UPI** dabane
> par hi app khule → browser **back** → review dikhe → wahi link dobara khole → payment chale.

---

## 6. Quality (jo maine chalaya)

| Check | Result |
|---|---|
| `npm run typecheck` (web + admin) | ✅ |
| `npm run test:unit` | ✅ **246/246** (round36 ke 17 naye guards ke saath) |
| `tests/sheets/settings-realtime.test.ts` | ✅ 10/10 |
| `npm run test:all` | ✅ **305/305** (unit 246 + integration 40 + sheets 10 + db 9) |
| `npm run lint` (web) | ✅ **0 errors** / 35 warnings |
| `npm run audit -- --check` | ✅ (sab A) |
| `next build` + `vite build` (Cloudflare/vinext) | ✅ (`/checkout` static hi raha, `/api/orders/[orderNumber]/payment-context` ƒ) |
| workerd preview par smoke | ✅ **100/0** (pehle 88) |
| `tests/e2e/payments.mjs` (live payment flow) | ✅ 59/0 |
| `tests/e2e/round23.mjs` (live tracking) | ✅ 23/0 |
| **CI-parity** (`next build` + `next start` :3000, jaise GitHub Actions karta hai) | ✅ smoke 100/0 · responsive 44/0 · breakpoints 48/0 · round16 39/0 · payments 59/0 · links 45 pages/0 |

**CI ka ek stale guard bhi pakda:** `tests/e2e/responsive.mjs` me purana check tha —
"order page auto-opens the UPI app after placing the order" (yani `?pay=1` par UPI khud khule).
R36 me wahi behaviour aapke kehne par hataya, isliye GitHub ka `production-build smoke` job
fail hua. Guard ab ulta hai: **auto-open code present hona hi fail hai**, aur intent sirf
`upi-open` button ke `href` se chalega. `round36.test.ts` ise pin karta hai taaki dobara na aaye.

**Lint ka bonus fix:** `apps/web/eslint.config.mjs` me `ignores` us object me tha jisme `rules`
bhi hain — flat config me aisa ignore *global* nahi hota. Natija: `.next`/`.cloudflare` ka
minified bundle lint ho raha tha (build ke baad 27 jhoothe `rules-of-hooks` error, aur lint
**4.5 minute** leta tha). Ab `ignores` apne alag object me + `.cloudflare`/`.vinext`/`out` add
⇒ lint **9 second**, 0 errors. Guard test bhi hai.

Naye/updated tests: `tests/unit/round36.test.ts` (17), `tests/unit/checkout-flow.test.ts`,
`tests/unit/round33.test.ts`, `tests/unit/round27.test.ts`, `tests/e2e/smoke.mjs`
(payment-context API + pay-page deep-link ke checks).

Files: `components/checkout-form.tsx`, `components/checkout-payment-step.tsx` (naya),
`components/upi-payment.tsx`, `components/payment-status-watcher.tsx`,
`lib/checkout-details.ts` (naya), `lib/checkout-session.ts`,
`app/api/orders/[orderNumber]/payment-context/route.ts` (naya),
`app/orders/[orderNumber]/pay/page.tsx`, `lib/google-sheets.ts`, `lib/store-settings.ts`.
