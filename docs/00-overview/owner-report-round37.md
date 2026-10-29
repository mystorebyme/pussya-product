# Round 37 — Owner report (27 Oct 2026)

> Owner ke points (voice note):
> 1. "ye aa rha hai — direct phone se detect krta hai na UPI direct, tb fix kro" (Paytm **Payment Alert** screenshot)
> 2. "owner ka apna Google account se DB connect hona chahiye, wahi se sheet ka Apps Script work karna chahiye"
> 3. "site ka header bar fix in desktop"
> 4. "Vercel par sheet ke environment add kr dena — variable jo owner ke Google account hai uske"
> 5. "dusri repo dekhna — `trends-sheets.gs` kaise proper DB ka kaam karti hai: ek box me hi placed / confirmed / shipped … replied / marked reply — vo bhi use kar lena, DB ko manage karna zaroori hai"
> 6. "Vercel par admin page ko manage mat kro abhi — only store + DB sheet"
> 7. "jo jo instant change ki cheez hai vo instant change honi chahiye — instant means instant (phone number, UPI ID …)"
> 8. "saare device — har android, iPhone, desktop — comfortable hone chahiye"
> 9. "wedding wale circle me image nahi dikh rhi — home page par fix kro"
> 10. "mobile number me prefix 0 / country code / + accept karna chahiye — 91 / +91 / 0 automatic hat jaye, 10 digit aa jaye"
> 11. "sab fix karne ke baad Vercel par latest deploy kr dena + push"

---

## 1. Paytm "Payment Alert" — asli wajah + fix

Screenshot me Paytm ki apni **Paytm Protect / UPI Risk Policy** screen hai ("pay via mobile number
or scanning QR"). Ye Paytm ki taraf se aati hai jab **personal VPA** (``) par
collect-request jaati hai — site ise control nahi kar sakti. Par jo galat cheez thi wo ye:

- **production par purana code chal raha tha** (commit `9704b3b`) jisme `?pay=1` auto-open tha —
  payment page khulte hi phone ka UPI app **khud** launch ho jaata tha, isi liye alert "direct
  phone se detect" ho raha tha. R36 me wo code hataya (`appOpened` ref + auto-open effect delete);
  UPI app ab **sirf "Pay on UPI" button ke tap** par khulti hai. Ye fix is deploy me live hoga.
- Payment step par naya hint (`upi-risk-hint`): "UPI app par *Payment Alert* dikhe to ghabraiye
  mat — *Pay via Scanning QR* chuniye ya upar diya QR scan kariye / UPI ID copy kariye."
  QR + UPI ID copy payment step par hamesha maujood hain, isliye customer kahin nahi atakta.
- Owner rule barkarar: koi app-brand list nahi (sirf generic wording), koi UTR nahi (last-4),
  support email nahi.

## 2. Phone number — `+91` / `91` / `0` automatic hat jaate hain

- Checkout me type karte hi auto-fix: `+91 98765 43210` → field me `9876543210` (`autoFixPhoneInput`).
- Server validation (`packages/validation` → `phoneSchema`) teeno prefix strip karke **sirf 10 digit**
  accept karta hai; order me bhi saaf 10 digit phone save hota hai (DB + sheet dono me).
- Saved-details (R36) + WhatsApp link (`whatsappNumber`) pehle se yahi karte hain — ab ek hi
  normaliser sab jagah (`lib/phone.ts` → `normaliseIndianPhone`).
- Contact form ka optional phone bhi isi schema se guzarta hai.

## 3. Home page — Wedding circle + desktop header bar

- **Wedding circle khaali tha** kyunki code me image hardcoded `undefined` thi. Ab har circle ki
  image collection se aati hai; collection me image na ho to uska **pehla product photo** fallback
  (circle kabhi khaali nahi dikhta). Smoke me guard: saare circles me `<img>`.
- **Desktop header bar**: nav 8 links `grid-cols-[1fr_auto_1fr]` ke 1fr column me thi — 1024–1440px
  par column se chaudi ho kar **centered logo ke upar chadh jaati thi**. Ab nav logo-row ke neeche
  apni alag **centered row** me hai (`data-testid="desktop-nav"`); logo hamesha center, mobile
  drawer jaisa tha waisa hi.

## 4. Sheet = order ka DB (trends-sheets.gs pattern)

`mystorebyme/manoj-Product` wali `trends-sheets.gs` padhi — uska core idea: **ek sheet tab me hi
placed / confirmed / shipped … aur replied / marked-reply**. Hamari sheet (`noor-sheets.gs`,
ab version **r37-1**) me wo pattern aa gaya:

| Owner kya kare (sheet me) | Site par asar |
|---|---|
| `Orders` tab → order ki row ka **`Order status`** cell badlo (`confirmed` / `packed` / `shipped` / `delivered` / `cancelled` …) | tracking page + order page par status/timeline **≈2 second** me update (`onEdit` trigger nayi timeline row bhi likh deta hai) |
| `Orders` row me **`Tracking courier` / `AWB` / `Tracking URL`** bharo | courier link + AWB site par (URL na ho to courier se link khud banti hai) |
| `Messages` tab → **`Status`** me `replied` / `done` / `closed` likho | `Replied = YES` + `Replied at` timestamp khud bhar jaata hai (marked-reply) |

- Site side: naya `lib/sheet-tracking.ts` (fetch + 2s cache + background refresh) +
  `lib/sheet-merge.ts` (pure merge). Order page aur `/api/orders/<n>/public` dono merge karte hain.
- **Sheet jeetti hai kab**: sheet ka status DB se aage ho (ya cancel/return ho). Payment-confirm
  jaisi cheezein jo sheet se pehle hoti hain unpar DB jeetta hai — **paymentStatus hamesha DB se**
  (paisa = DB ki sacchai, sheet se override nahi).
- Privacy: script phone match karwata hai — galat phone se kisi ka tracking nahi khulta.
- `?fresh=1` lagao to bilkul taaza read (cache bypass).
- **Zaroori step (owner)**: sheet → Extensions → Apps Script me naya code paste karke
  **Deploy → Manage deployments → Edit → New version → Deploy** (URL wahi rehta hai).
  Naya code `docs/00-overview/apps-script-code.md` me poora hai. (Purane deploy par bhi status
  merge chalta hai; `onEdit` wala auto-timeline + marked-reply naye version se aata hai.)

## 5. "Instant means instant"

| Cheez | Pehle | Ab |
|---|---|---|
| Sheet settings (UPI ID, WhatsApp, announcement…) server cache | 10s | **2s** (`SHEET_SETTINGS_TTL_MS`) |
| Browser poll | 15s | **3s** |
| Order tracking (sheet status) | — | **2s** (`SHEET_TRACKING_TTL_MS`) + background refresh |
| Payment step ka UPI/amount | fresh | fresh (`no-store`) |
| Bilkul turant dekhna ho | — | `/api/settings?fresh=1` / tracking `?fresh=1` |

Apps Script push nahi kar sakta, isliye duniya bhar me "instant" ka practical matlab yahi poll+TTL
hai — ab ≈2-3 second. Sheet save karke page refresh kariye, badlav dikhega.

## 6. Vercel (store only — admin chheda nahi)

Project **`noor-clothing`** (`noorethnicwear.in`) par sheet ke env **add kar diye** (API se):

| Variable | Value | Kaam |
|---|---|---|
| `SHEET_READ_TIMEOUT_MS` | `4000` | Apps Script cold-start (1-4s) par read timeout na ho |
| `SHEET_SETTINGS_TTL_MS` | `2000` | settings cache 2s (instant) |
| `SHEET_TRACKING_TTL_MS` | `2000` | sheet-status cache 2s |

Pehle se set: `GOOGLE_SHEETS_WEBAPP_URL`, `GOOGLE_SHEETS_TOKEN`, `SHEET_SELFTEST_KEY`,
`DATABASE_URL`, `ADMIN_API_TOKEN`, `UPI_RETURN_SECRET`, `OTP_TOKEN_SECRET`,
`NEXT_PUBLIC_SITE_URL`, `STORE_UPI_ID`, `STORE_UPI_NAME`, `CORS_ALLOWED_ORIGINS`.
Sheet/Apps Script **owner ka apna Google account** ki sheet se hi chalta hai (`GOOGLE_SHEETS_WEBAPP_URL`
usi ka `/exec` URL hai) — deploy ke baad wahi DB-sheet site ko chalati hai.
Admin project (`noor-admin`) ko is round me **chheda nahi gaya**.

## 7. Har device

Smoke + responsive + breakpoints suites (mobile 360px → desktop 1779px) sab green; naya header-row
aur circles flex/wrap se har width par fit hote hain (nav row `flex-wrap`, circles mobile par
swipe / desktop par center).

## 8. Quality

| Check | Result |
|---|---|
| `npm run typecheck` (web + admin + api) | ✅ |
| `npm run test:unit` | ✅ **259/259** (naya `tests/unit/round37.test.ts` — 13) |
| `npm run test:all` | ✅ 259 + 40 + 10 + 9 = **318/318** |
| `npm run lint` (web) | ✅ 0 errors / 38 warnings (CI gate 40) |
| `npm run audit -- --check` | ✅ sab A |
| `next build` + `vite build` (vinext) | ✅ |
| Next production parity (`next start` :3000) | ✅ smoke **104/0** · responsive 44/0 · breakpoints 48/0 · payments 59/0 · links 45 pages/0 |
| workerd preview (:8787) | ✅ smoke **104/0** |

## 9. Deploy

Owner ke kehne par ye code **Vercel production** par bheja gaya (PR #8 merge → `main` →
`noor-clothing` production deploy). Merge ke baad production deployment READY hai ya nahi,
Vercel API se verify kiya gaya (report ke end me commit hash likh denge jo live hua).

Files: `apps/web/src/lib/sheet-tracking.ts` (naya), `apps/web/src/lib/sheet-merge.ts` (naya),
`apps/web/src/lib/phone.ts`, `apps/web/src/lib/checkout-details.ts`,
`apps/web/src/lib/google-sheets.ts`, `apps/web/src/components/{checkout-form,site-header,upi-payment,store-settings-provider}.tsx`,
`apps/web/src/app/page.tsx`, `apps/web/src/app/orders/[orderNumber]/page.tsx`,
`apps/web/src/app/api/orders/[orderNumber]/public/route.ts`, `packages/validation/index.ts`,
`apps/web/cloudflare.config.ts`, `scripts/google-apps-script/noor-sheets.gs` (r37-1),
`tests/unit/round37.test.ts`, `tests/e2e/smoke.mjs`, docs.
