# Owner report — Round 23

**Date:** 25 October 2026
**Live site:** https://noor-ethnic-wear.vercel.app · **Admin:** https://noor-admin.vercel.app
**Live commit:** `8c60324` (health API me `commit` dikhta hai)

---

## 1. Aapke 5 sawaal — status

| Aapki baat | Status |
| --- | --- |
| "Pincode ka state aur daala hua state verify ho — galat ho to sahi state dalwao" | ✅ **Ho gaya.** Pincode daalते hi jo state aata hai, usse alag state chuni to order aage nahi badhta — saaf message aata hai ("Ye pincode **Rajasthan** ka hai, aapne Gujarat chuna hai") aur **ek tap me sahi state** set ho jaati hai. Server bhi galat state wala order **reject** karta hai (GST place-of-supply galat na jaye). Spelling ke alag version (J&K / Orissa / Pondicherry / Uttaranchal) bhi sahi maane jaate hain — customer ko block nahi karte. |
| "Address ke baad payment page bahut slow khulta hai — very fast karo (order create bhi)" | ✅ **Ho gaya.** Pehle: order banate waqt poora orders table padha jaata tha + 2 Google Sheet call ka **wait** kiya jaata tha. Ab: order create = **1 hi database write**, Sheet ki row **background** me jaati hai, payment page 3 cheezein **ek saath** load karta hai. Live par order create + payment page + tracking page — **teeno 2 second se andar** (test ab isi ko check karta hai, aage slow hua to test fail hoga). |
| "Sheet me data add nahi ho raha, account badla — naya Apps Script code + exact location do" | ⚠️ **Aadha ho gaya — aapke 5 minute chahiye.** Asli wajah mil gayi (neeche point 2). Naya script + step-by-step guide ready hai: `docs/00-overview/sheet-setup-owner.md`. Aap sirf **Web app URL + TOKEN** bhej dijiye, main Vercel me daal kar redeploy kar dunga. |
| "Admin me numbers clickable ho — detailed view + edit" | ✅ **Ho gaya.** Dashboard, Orders list, order page, Customers, Messages — har number par **📞 Call** aur **💬 WhatsApp** (message pehle se likha: order number ke saath). Naam/phone par tap → **customer ki poori detail** (kitne order, lifetime value, address, saare orders) + **inline edit** (naam, phone, email, address, city, state, pincode). Edit audit log me `order.contact_updated` ke roop me jaata hai. "New order" par customer ki purani details khud bhar jaati hain. |
| "Step 3: UTR ya phone ke last 4 digit, payment ho gaya to submit, warna WhatsApp par screenshot" | ✅ **Ho gaya.** Payment page par: UTR **ya** sirf mobile ke **last 4 digit** → submit (status `processing`, admin verify karega). UTR na mile to naya button **"UTR nahi mila — payment hui hai"** (galat last-4 par reject hota hai, dobara claim safe hai). WhatsApp screenshot ka option **har haal me** dikhta hai — number pehle se bhara hua () aur order ki detail message me. Scan karke pay karne par bhi wahi page kaam karta hai. |

---

## 2. Sheet — kaun si sheet, aur aaj kya ready kar diya

**Sheet pehchaan (important).** Aapne jo `pub?output=csv` links bheje the
(`2PACX-1vTLs42cuo-…`, gid 0 / 1135948941 / 1261780310 / 644814285 / 380856753) wo
**purane account ki copy** ke hain — un gid ka koi tab naye file me nahi hai. Website se judne
wala sheet **ye** hai:

| | |
| --- | --- |
| Naam | **Noor Ethnic Wear — Store (Orders · Payments · Settings)** |
| Sheet id | `1k8fsea04WpbrGjiyXuDrrS2Eewt9W7wx9X2lUQc5qMo` |
| Account | `owner ka apna Google account` (owner: James) |
| Link | https://docs.google.com/spreadsheets/d/1k8fsea04WpbrGjiyXuDrrS2Eewt9W7wx9X2lUQc5qMo/edit |

**Aaj maine is sheet me (bina aapke kuch kiye):**

- `Checkout` tab banaya — 8 columns (Timestamp, Event, Step, Order number, Items, Subtotal, Reason, Phone).
- `Audit` tab banaya — 5 columns (Timestamp, Actor, Action, Target, Details).
- Baaki 5 tab (Settings / Orders / Payments / Messages / Newsletter) pehle se sahi header ke saath the — verify kiya.
- Script ke andar isi sheet ke **asli tab-id** daal diye + `SPREADSHEET_ID` (standalone script bhi chalega).

**Ab sirf ek cheez baaki hai (aapke 5 minute):** Apps Script deploy + 2 env var —
`docs/00-overview/apps-script-code.md` (poora code) aur `docs/00-overview/sheet-setup-owner.md` (steps).

## 2b. Sheet kyun nahi bhar rahi thi (asli wajah)

Do cheezein ek saath thi:

1. **Vercel project `noor-clothing` me `GOOGLE_SHEETS_WEBAPP_URL` aur `GOOGLE_SHEETS_TOKEN` naam ki env variables hi nahi thi** (maine env list check ki — sirf DATABASE_URL, ADMIN_API_TOKEN, STORE_UPI_ID/N، OTP wale hain). Function ko URL hi na mile to wo chup-chaap kuch nahi bhejta — isliye sheet bilkul khaali.
2. Aapne sheet account badal diya → purana script/web-app URL kaam ka nahi.

**Kya karna hai (5 minute, sirf aap kar sakte hain):**
👉 **`docs/00-overview/sheet-setup-owner.md`** — 6 step, screenshot-level detail me.

Summary:
1. Naya sheet (ya jo sheet rakhni hai) → **Extensions → Apps Script**.
2. `scripts/google-apps-script/noor-sheets.gs` ka poora code paste + `TOKEN` me apna random word.
3. **Run `setup`** → 6 tab ban jayenge (Settings, Orders, Payments, Checkout, Messages, Newsletter).
4. **Deploy → New deployment → Web app** · Execute as **Me** · Who has access **Anyone** → `/exec` URL copy.
5. Browser me `<URL>?action=health&token=<TOKEN>` → `{"ok":true,...}` aana chahiye.
6. **Mujhe URL + TOKEN bhej dijiye** → main env me daal kar redeploy kar dunga, phir test order karke Orders tab me row dikha dunga.

**Naye script me kya behtar hai** (purane se):

- **Column ka order badalne se data galat jagah nahi jaata** — row header **naam** se map hoti hai.
- Agar sheet me koi column **gayab** hai to script khud add kar deta hai (pehle chup-chaap drop ho jaata tha).
- `health` / `testAppend` / `settings_save` — sabse pehle aap khud test kar sakte hain.
- Tab ka **gid** (URL ka `#gid=`) bhi samajhta hai — tab rename karne se bhi kaam karta rahega.
- Ek hi call me kai rows (Checkout + Orders + Payments) — LockService ke saath, duplicate nahi.

**Bonus (agar Apps Script me time lage):** Settings tab ko **File → Publish to web → CSV** karke link de dijiye — main `GOOGLE_SHEETS_SETTINGS_CSV_URL` me daal dunga, phir phone/UPI/announcement **bina Apps Script ke bhi** site par live rahenge.

---

## 3. Code kahan hai (aapke liye exact location)

### State ↔ pincode
| Kya | File | Kahan |
| --- | --- | --- |
| State list + spelling alias (`J&K`, `Orissa`, `Pondicherry`) | `apps/web/src/lib/state-match.ts` | `INDIAN_STATES`, `statesMatch()`, `canonicalStateName()` |
| Checkout par block + "ek tap se sahi state" | `apps/web/src/components/checkout-form.tsx` | `stateMismatch` (line ~115), message (line ~136), fix button (line ~400, `data-testid="state-fix"`) |
| Server-side reject (400 `state_mismatch`) | `apps/web/src/lib/orders.ts` | `createOrder()` line ~161 |

### Speed
| Kya | File | Kahan |
| --- | --- | --- |
| Order fetch = 1 row (pehle poora table) | `apps/web/src/lib/orders.ts` | `getOrder()` line ~311 |
| Order create = 1 write | `apps/web/src/lib/orders.ts` | `createOrder()` line ~275 (`saveOrders(new Map(), [order])`) |
| Sheet row background me | `apps/web/src/lib/orders.ts` | `runInBackground()` (line ~30 ke paas), use line ~293 |
| Payment/tracking page parallel load | `apps/web/src/app/orders/[orderNumber]/pay/page.tsx` (line ~35), `.../page.tsx` (line ~41) | `Promise.all([...])` |
| Sheet read timeout 5s → 2.5s | `apps/web/src/lib/google-sheets.ts` | `READ_TIMEOUT_MS` line ~39 |
| UPI app auto-open 600ms → 250ms | `apps/web/src/components/upi-payment.tsx` | line ~232 |

### Step 3 (payment)
| Kya | File | Kahan |
| --- | --- | --- |
| UTR ya last-4 input | `apps/web/src/components/upi-payment.tsx` | `data-testid="upi-utr"`, `data-testid="upi-last4"` |
| "UTR nahi mila — payment hui hai" button | `apps/web/src/components/upi-payment.tsx` | `claimPaid()`, `data-testid="upi-claim"` |
| WhatsApp screenshot link | `apps/web/src/components/upi-payment.tsx` | `data-testid="upi-whatsapp-screenshot"` |
| Server: claim (202, processing, audit `payment.claimed`) | `apps/web/src/lib/orders.ts` `claimPayment()`, API `apps/web/src/app/api/payments/claim/route.ts` | — |

### Admin
| Kya | File | Kahan |
| --- | --- | --- |
| Clickable phone (Call + WhatsApp) | `apps/admin/src/components/contact-links.tsx` | `PhoneLinks`, `telHref`, `whatsappHref` |
| Customer detail view + edit | `apps/admin/src/app/(admin)/customers/page.tsx` | `?phone=...` view, `data-testid="customer-detail"` |
| Order page par details edit form | `apps/admin/src/app/(admin)/orders/[id]/page.tsx` | "Details edit kariye" section + `updateContactAction` |
| Edit ka backend | `apps/admin/src/lib/data.ts` `updateOrderContact()` + store API `PATCH /api/admin/orders/:no {action:"contact"}` | audit `order.contact_updated` |

### Sheet
| Kya | File |
| --- | --- |
| Apps Script (naya version) | `scripts/google-apps-script/noor-sheets.gs` |
| Owner ke liye setup guide | `docs/00-overview/sheet-setup-owner.md` |

---

## 4. Live proof (aaj, production par)

| Check | Result |
| --- | --- |
| `/api/health` | `status: ok`, `db: up`, `commit: 8c60324`, products 446 |
| Galat state wala order | **400** + code `state_mismatch` + message me sahi state |
| Sahi state wala order | **201** + order number |
| Order create + payment page + tracking page | **teeno 2s se andar** |
| Payment page par claim / WhatsApp / UTR / last-4 | sab maujood, koi UPI brand naam nahi |
| Galat last-4 par claim | **403** (reject) |
| Sahi last-4 par claim | **202** → payment `processing`, order paid **nahi** (admin verify karega) |
| Dobara claim | safely handle (202/409, kabhi 500 nahi) |
| Live automated flow (production par) | payments **28/0**, R23 checks **18/0** |
| Local (poore suite) | unit **114/0**, integration **40/0**, db **9/0**, payments **35/0**, smoke **87/0**, links **40/0**, responsive **43/0**, round16 **37/0**, breakpoints **48/0**, R23 **31/0** |
| Admin panel | `8c60324` par deploy, login page theek, customers/orders pages par call+WhatsApp links |

---

## 5. Aapse chahiye (bas 2 cheezein)

1. Naye Apps Script ka **Web app URL** (`.../exec`) + **TOKEN** — phir sheet 5 minute me bharne lagegi.
2. (Optional) Settings tab ka **published CSV** link — isse phone/UPI/announcement bina script ke live rahenge.

Baaki jo pehle se pending hai: **domain** (noorethnicwear.in) aur **official mail ID**.
