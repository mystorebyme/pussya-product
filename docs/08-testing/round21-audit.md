# Round 21 — checkout se UPI hataya, payment step 3 par apps, funnel DB + Sheet

Date: 2026-10-25 · Branch: `arena/f713eef1-tannu-product` · Owner report: "address wale par place
order karte hi UPI/waha code aa jata hai — wo sirf payment ke 3rd step par aana chahiye, aur
checkout/order/success/failed sab DB (Google Sheet) me store hona chahiye."

## 1. Bug: checkout par UPI block (root cause + fix)

Checkout ke **Order summary** me purana WhatsApp/UPI block bacha hua tha. Wo jab `whatsappHref`
set hota tha tab dikhta tha — matlab jab order **server par save nahi hota**:

1. **GitHub Pages preview** par `NEXT_PUBLIC_API_BASE_URL` repo variable me **purana Render URL**
   tha (Render service dead). Isliye preview se `/api/orders` call dead host par jaati thi →
   order fail → fallback block (UPI ID + QR + "Send order on WhatsApp") checkout par hi dikh jaata tha.
2. Live store par bhi transient API error par wahi block dikhta tha.

Fix:

| Pehle | Ab |
| --- | --- |
| Checkout ke aside me UPI QR + UPI ID + "Send order on WhatsApp" block | **Poore block hata diya** |
| UPI ID order ke WhatsApp text me (`prepaid, UPI: `) | Text me UPI ka zikr nahi |
| Page se "QR se ya UPI ID par pay karein" copy | "Payment ka alag page khulega — payment wahan" |
| Pages preview ka API base = dead Render URL | `https://noor-ethnic-wear.vercel.app` hard-code (CORS allowlist me Pages origin pehle se hai) |
| Fail par UPI wala fallback | Fail par **Try again** + WhatsApp help (UPI ke bina); static preview par **live store checkout** ka link |

Order place hone par ab seedha `…/orders/<NE-…>/pay?pay=1` khulta hai (step 3).

## 2. Payment page (step 3) — phone ke saare UPI apps

`/orders/<NE-…>/pay` par ab:

- **App buttons:** Google Pay (`tez://upi/pay`), PhonePe (`phonepe://pay`), Paytm (`paytmmp://pay`),
  Any UPI app (`upi://pay`) — amount (`am`), payee (`pa`/`pn`), order note (`tn`), txn ref (`tr`) aur
  return callback (`url`) pehle se bhare hue, taaki app me sirf PIN daalna pade.
- **QR** (laptop) + UPI ID + **Copy UPI ID** + **Check status** button.
- **Auto-detect:** `PaymentStatusWatcher` har 6s (processing par 5s) status poll karta hai, UPI app se
  wapas aane par (`visibilitychange` / window `focus`) turant check, aur UPI return token se
  server-side auto-confirm. States: `pending → processing → paid` / `failed` — teeno DB me.

## 3. Checkout funnel — DB + Google Sheet

Owner: "koi checkout tak pahuncha, order kiya, fail kiya, success kiya — wo store hona chahiye,
taaki order number Track Order me kaam kare."

- Naya table `checkout_events` (migration `0007`): event, step, order number, items, subtotal,
  fail reason, phone, user agent, session.
- API: `POST /api/checkout/events` (public, CORS-enabled, sirf 4 event allow) aur
  `GET /api/admin/checkout-events` (admin token).
- Client events: `checkout.started` (checkout khula), `checkout.review` (address bhar kar review tak),
  `order.placed` (order number bana), `order.failed` (error ke saath).
- Google Sheet: naya **Checkout** tab (`Timestamp · Event · Step · Order number · Items · Subtotal ·
  Reason · Phone`). Payment stages pehle se **Payments** tab me jaate hain.
- Admin → Orders page par **Checkout funnel** card: started / review / placed / failed + last 5 failures
  (reason + phone).

## 4. Tests

| Suite | Result |
| --- | --- |
| Unit | **95 / 0** (checkout guard: koi UPI ID/QR/brand checkout par nahi, `?pay=1`, funnel event, UPI app links) |
| Integration | 40 / 0 |
| DB | 9 / 0 |
| Smoke | 87 / 0 |
| Links | 40 pages / 0 |
| Responsive | 43 / 0 |
| Breakpoints | 48 / 0 |
| Round 16 | 37 / 0 |
| Payments E2E | **34 / 0** (payment page apps + deep link, tracking case-insensitive, order not-found, funnel API) |
| Typecheck (web + admin) · Build (web + admin) · Pages export | clean |

## 5. Owner ke liye

- Checkout par ab koi UPI detail nahi — sirf step indicator + address + review + "Place order".
- Payment page par app buttons (GPay/PhonePe/Paytm/any) + QR + UPI ID.
- Sheet me naya **Checkout** tab milega (Apps Script dobara deploy karein taaki tab ban jaye —
  `scripts/google-apps-script/noor-sheets.gs` → Deploy → Manage deployments → New version).
