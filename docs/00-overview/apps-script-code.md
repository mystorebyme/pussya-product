# Apps Script v3 — poora code (copy-paste)

> Ye file `scripts/google-apps-script/noor-sheets.gs` se **automatic** bani hai
> (`node scripts/apps-script:export` → `node scripts/export-apps-script.mjs`).
> Yahan se copy kariye, code hamesha latest rahega.
>
> **Step-by-step guide:** [`apps-script-setup-steps.md`](./apps-script-setup-steps.md)
> (permission, deploy, Vercel env, troubleshooting — sab detail me)

**Kya karta hai:** website ke sab events Google Sheet me likhta hai (16 tabs) —

| Tab | Kya aata hai |
| --- | --- |
| **Settings** | phone, WhatsApp, email, UPI ID, UPI name, announcement, free shipping, GSTIN |
| **Dashboard** | aaj ke orders, revenue, pending payment, naye messages (script khud bharta hai) |
| **Orders** | har order + har status change (append-only timeline) |
| **OrderItems** | order ki har item alag row (size, colour, qty, price) |
| **Payments** | UTR submit, "payment hui hai" claim, verify, fail, reverse |
| **Invoices** | GST invoice (taxable value, CGST/SGST/IGST, total) |
| **Shipments** | courier, AWB, tracking URL, dispatch/delivery status |
| **Checkout** | funnel: checkout khula → review → order placed → order fail (reason ke saath) |
| **Messages** | contact form (+ replied status) |
| **Newsletter** | email subscribers (duplicate apne aap skip) |
| **Reviews** | customer reviews (rating, verified, approve/pending) |
| **Coupons** | coupon codes, uses, limit, active |
| **Inventory** | stock ka har change (kisne, kitna, kyun) |
| **Audit** | admin panel ki activity |
| **Errors** | website/script ki error (debug ke liye) |
| **Sync** | har sync call ka hisaab (kab, kya, kitni rows) |

---

## Steps (ek baar, ~4 minute)

1. Google Sheet kholein → **Extensions → Apps Script**.
2. `Code.gs` ka purana code **poora delete** kariye (Ctrl+A → Delete) →
   neeche wala **poora code** paste kariye.
3. Sabse upar `var TOKEN = 'CHANGE-ME-noor-token';` me apna lamba random word daaliye
   (jaise `noor-9f3k2m-2026`). **Yahi token Vercel me daalna hai** — dono jagah same.
4. **Ctrl+S** (save).
5. Editor me upar function dropdown → **`setup`** → **Run** → permission maange to
   **Review permissions → apna account → Advanced → Go to … (unsafe) → Allow**.
   → Sheet me 16 tab + headers + default settings ban jayenge.
6. **Deploy → New deployment → (cog) Web app**
   - Description: `noor v3`
   - **Execute as: Me**
   - **Who has access: Anyone**   ⚠️ ("Anyone with a Google account" **nahi**)
   - **Deploy** → **Web app URL** copy kariye (`.../exec` par khatam hota hai).
7. Test: browser me
   `<Web app URL>?action=health&token=<TOKEN>`
   → `{"ok":true,"version":"r27-2","spreadsheet":"…","sheets":[…]}` aana chahiye.
   (version purana dikhe to Step 6 dobara — sirf Ctrl+S se code nahi chalta.)
8. **2 value Vercel me daaliye** (project `noor-clothing` → Settings → Environment
   Variables → **Redeploy**):

   | Variable | Value |
   | --- | --- |
   | `GOOGLE_SHEETS_WEBAPP_URL` | aapka `/exec` URL |
   | `GOOGLE_SHEETS_TOKEN` | aapka token |

9. Verify: website par test message + test order → Messages / Orders / OrderItems tabs me
   rows. Ya `node scripts/sheets-selfcheck.mjs "<URL>" "<TOKEN>"`.

**Optional:** function `installTriggers` → Run (roz 9 PM Dashboard + Sunday backup),
`testSelf` (poora check), `repairHeaders` (header repair), `backupNow` (Drive me copy).

---

## Code badalne par (yaad rakhiye)

Apps Script me code update karne ke baad **naya version deploy** karna padta hai:
**Deploy → Manage deployments → (pencil) Edit → Version: New version → Deploy**.
Warna purana code hi chalta rehta hai — owner ke saath yahi hua tha.

## Sheet ke rules

- **Header row (pehli row) na hataayein.** Script column ko **naam** se dhoondhta hai,
  isliye column ka order badalna theek hai; header ka naam badalna/hatana nahi.
- Naya column add karna theek hai (script khud bhi missing column add kar deta hai).
- `Who has access: Anyone` rakhein — website anonymous request bhejti hai. Data safe hai
  kyunki token ke bina script kuch read/write nahi karta.
- `/exec` URL aur TOKEN kisi ko na dein — inse sheet me row daali ja sakti hai.

---

## Poora code (2560 lines)

```javascript
/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * NOOR / NOOR ETHNIC WEAR — Google Sheet ↔ website bridge   (Apps Script v3)
 * ═══════════════════════════════════════════════════════════════════════════════
 *
 * Ye ek **poora backend** hai jo website aur owner ki Google Sheet ke beech me
 * baithta hai. Website isse HTTP par baat karti hai, aur ye sheet me rows likhta
 * hai / sheet se settings padhta hai. Koi 3rd party service nahi, koi paid tool
 * nahi — sirf Google Apps Script (free).
 *
 * ── KAAM (16 tabs) ────────────────────────────────────────────────────────────
 *   Settings    → phone / WhatsApp / email / UPI / announcement / GSTIN (site 15s me padhti hai)
 *   Orders      → har order + har status change (append-only timeline)
 *   OrderItems  → order ki har item alag row me (size, colour, qty, price)
 *   Payments    → payment pending / UTR submitted / claimed / verified / failed
 *   Invoices    → GST invoice (taxable value, CGST/SGST/IGST, invoice number)
 *   Shipments   → courier, AWB, tracking URL, dispatch/delivery status
 *   Checkout    → funnel: checkout khula → review → order placed → order failed
 *   Messages    → contact form ke messages (+ replied status)
 *   Newsletter  → email subscribers (duplicate email apne aap skip)
 *   Reviews     → customer reviews (rating, verified, approve/pending)
 *   Coupons     → coupon codes, uses, limit, active
 *   Inventory   → stock ka har change (kisne, kitna, kyun)
 *   Audit       → admin panel ki har important activity
 *   Errors      → website/script ki error ka log (debug ke liye)
 *   Dashboard   → aaj ka summary (orders, revenue, pending, messages) — script khud bharta hai
 *   Sync        → har sync call ka hisaab (kab, kya, kitni rows)
 *
 * ── SETUP (ek baar, 4 minute) ─────────────────────────────────────────────────
 *  1. Apni Google Sheet kholiye (jisme data chahiye — owner: prkigothwal@gmail.com).
 *  2. Extensions → Apps Script.
 *  3. `Code.gs` ka poora purana code **delete** karke niche ka poora code paste kijiye.
 *     (`TOKEN` line jaisi hai waisi rehne dijiye — asli token ab **Script Properties**
 *     me rehta hai, step 7 me ek baar set hota hai, code dobara paste karne par bhi nahi tootta.)
 *  4. Save (Ctrl + S).
 *  5. Upar function dropdown me `setup` chuniye → **Run** → permission maange to
 *     apna hi account chuniye → "Advanced" → "Go to … (unsafe)" → **Allow**.
 *     (Ye "unsafe" warning har personal script par aata hai — normal hai.)
 *     → Sheet me saare tabs + headers apne aap ban jayenge.
 *  6. **Deploy → Manage deployments → ✏️ (pencil) → Version: New version → Deploy.**
 *     Pehli baar: New deployment → gear → Web app → Execute as **Me** →
 *     Who has access **Anyone** → Deploy → /exec URL copy kariye.
 *     Naya URL ban gaya ho to Vercel me `GOOGLE_SHEETS_WEBAPP_URL` bhi wahi daaliye.
 *  7. Token set (ek hi baar zindagi me): browser me kholiye
 *       <webapp URL>?action=set_token&token=<Vercel ke GOOGLE_SHEETS_TOKEN ki value>
 *     Jawab {"ok":true,…} aana chahiye. Iske baad code kitni baar bhi paste ho,
 *     token Script Properties me safe rehta hai.
 *  8. Health check (kabhi bhi, browser se):
 *       <webapp URL>?action=health        → "problems":["sab green ✔"]
 *       https://noorethnicwear.in/api/sheet-health → website ki taraf ka check
 *  9. Sheet ke **Settings** tab me `upi_id` row me apna UPI ID bhariye —
 *     website ka payment **sirf sheet** se UPI padhta hai (koi hardcoded default nahi).
 *
 * ── ZAROORI BAATEIN ───────────────────────────────────────────────────────────
 *  • Code badalne ke baad **naya version** deploy karna padta hai:
 *    Deploy → Manage deployments → ✏️ (pencil) → Version: **New version** → Deploy.
 *    Sirf Ctrl+S karne se code save hota hai, **chalta purana hi rehta hai**.
 *    (Owner ke saath yahi galti hui thi — isliye `?action=health` me `version`
 *    dikhta hai; wahan purana version aaye to matlab naya deploy nahi hua.)
 *  • "Who has access: Anyone" hi rakhein — website anonymous request bhejti hai.
 *  • TOKEN kisi ko na dein. Isse aapki sheet me row daali ja sakti hai.
 *  • Sheet ka naam badalne par bhi kaam karta hai (gid + naam dono se dhoondhta hai).
 *  • Ye script sheet ke bahar kuch nahi bhejta — sirf aapki sheet likhta/padhta hai.
 * ═══════════════════════════════════════════════════════════════════════════════
 */

/* ═══════════════════════════ 1. CONFIG (yahi badalna hota hai) ═══════════════ */

/**
 * Fallback token — asli token **Script Properties** me rehta hai (naam `TOKEN`),
 * jo `?action=set_token&token=…` URL se ek baar set hota hai. Code dobara paste
 * karne par Properties nahi mitte, isliye baar-baar token bharne ki zaroorat nahi.
 * Is line ko default ('CHANGE-ME-noor-token') par hi rehne dijiye — default
 * public repo me likha hai, isliye script use "token hi nahi" maanti hai.
 */
var TOKEN = 'CHANGE-ME-noor-token';

/** Wahi public placeholder — isse kabhi bhi authorize nahi hona chahiye. */
var TOKEN_PLACEHOLDER = 'CHANGE-ME-noor-token';

/** Code ka version — `?action=health` me dikhta hai. Code badle to isse badhaayein. */
var CODE_VERSION = 'r39-1';

/**
 * Sheet ka id (URL me `/d/<ID>/edit`).
 * Extensions → Apps Script se banaya ho to ye line zaroori nahi, par standalone
 * script me kaam aati hai. (Neeche fallback bhi hai — delete karne par crash nahi.)
 */
/** Owner ki FINAL sheet (27 Oct) — script isi ko padhta hai; site `SHEET_EXPECTED_ID` env se verify karti hai. */
// Khaali = script jis sheet me bandha hai (container-bound) wahi use hoti hai.
// Doosri sheet chahiye to yahan id daaliye ya Script Property `SHEET_ID` set kariye.
var SPREADSHEET_ID = '';

/** Safety net — agar upar ki line galti se delete ho jaye. */
var SHEET_ID_FALLBACK = '';

/** Sheet ke tab-id (URL me `#gid=…`) — optional, naam badalne par bhi kaam aate hain. */
var GIDS = {
  Settings: 1827766020,
  Orders: 19757621,
  Payments: 1008049319,
  Messages: 750680779,
  Newsletter: 1223926652,
  // ye tabs script khud banata hai (gid Google deta hai)
  OrderItems: null,
  Invoices: null,
  Shipments: null,
  Checkout: null,
  Reviews: null,
  Coupons: null,
  Inventory: null,
  Audit: null,
  Errors: null,
  Dashboard: null,
  Sync: null,
};

/** Timezone / paise ka format */
var TIMEZONE = 'Asia/Kolkata';
var MONEY_FORMAT = '₹#,##0.00';

/** Ek call me kitni rows (Vercel se batch aata hai; bahut badi call block na kare) */
var MAX_ROWS_PER_CALL = 300;
/** Ek cell me itne se zyada characters na jaayein */
var MAX_CELL_CHARS = 5000;
/** Sheet ka lock kitni der wait kare (do requests ek saath aayein to) */
var LOCK_WAIT_MS = 25000;
/** Errors tab me sirf itni hi purani rows rakhein (warna tab bhaari ho jata hai) */
var ERRORS_KEEP = 2000;

/* ═══════════════════════════ 2. TAB HEADERS ══════════════════════════════════ */

/**
 * Har tab ke columns.
 *   • Append **naam se** hota hai (position se nahi) — column ka order badle,
 *     beech me naya column aaye, tab bhi data sahi jagah jaata hai.
 *   • Purani sheet me koi column missing ho to script header khud repair karta hai.
 *   • Naya column yahan add karne par purani sheet me bhi apne aap jud jaata hai.
 */
var HEADERS = {
  Orders: [
    'Timestamp', 'Event', 'Order number', 'Order status', 'Payment status', 'Payment method',
    'Payment reference', 'UPI ID', 'Total', 'Subtotal', 'Discount', 'Coupon', 'Items',
    'Item details', 'Customer', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode',
    'Tracking courier', 'AWB', 'Tracking URL', 'Notes', 'Admin Note', 'Source', 'Device',
  ],
  Payments: [
    'Timestamp', 'Event', 'Order number', 'Order status', 'Payment status', 'Payment method',
    'Payment reference', 'UPI ID', 'Total', 'Subtotal', 'Discount', 'Coupon', 'Items',
    'Item details', 'Customer', 'Phone', 'Email', 'Address', 'City', 'State', 'Pincode',
    'Tracking courier', 'AWB', 'Tracking URL', 'Notes', 'Verified by', 'Verified at',
  ],
  OrderItems: [
    'Timestamp', 'Order number', 'Product', 'Handle', 'SKU', 'Size', 'Colour',
    'Quantity', 'Price', 'Line total', 'Category', 'Image URL', 'Status',
  ],
  Invoices: [
    'Timestamp', 'Invoice number', 'Order number', 'Type', 'Customer', 'Phone', 'Email',
    'GSTIN', 'Address', 'State', 'Taxable value', 'CGST', 'SGST', 'IGST',
    'Shipping', 'Discount', 'Total', 'Notes',
  ],
  Shipments: [
    'Timestamp', 'Order number', 'Courier', 'AWB', 'Tracking URL', 'Status',
    'Expected delivery', 'Note', 'Updated by',
  ],
  Checkout: [
    'Timestamp', 'Event', 'Step', 'Order number', 'Items', 'Subtotal', 'Reason', 'Phone',
    'Session', 'City', 'State', 'Pincode',
  ],
  Messages: [
    'Timestamp', 'Name', 'Email', 'Phone', 'Subject', 'Message', 'Status',
    'Replied', 'Replied at', 'Source page', 'Message ID',
  ],
  Newsletter: ['Timestamp', 'Email', 'Source', 'Status'],
  Reviews: [
    'Timestamp', 'Product', 'Handle', 'Customer', 'Rating', 'Title', 'Review',
    'Verified', 'Status', 'Photo URL', 'Order number',
  ],
  Coupons: [
    'Timestamp', 'Code', 'Type', 'Value', 'Min order', 'Max uses', 'Used',
    'Active', 'Expires', 'Note',
  ],
  Inventory: [
    'Timestamp', 'Product', 'Handle', 'SKU', 'Size', 'Stock', 'Change', 'Reason',
    'Updated by', 'Low stock alert',
  ],
  Audit: ['Timestamp', 'Actor', 'Action', 'Target', 'Details', 'IP'],
  Errors: ['Timestamp', 'Context', 'Message', 'Payload', 'Version'],
  Dashboard: ['Timestamp', 'Metric', 'Value', 'Note'],
  Sync: ['Timestamp', 'Direction', 'Sheet', 'Rows', 'Status', 'Detail'],
};

/** Settings tab ke default rows (sirf tab khaali ho tab likhe jaate hain). */
var DEFAULT_SETTINGS = [
  ['support_phone', ''],
  ['whatsapp', ''],
  // Owner rule: support email site/admin par kahin dikhta nahi — khaali rakha hai.
  ['support_email', ''],
  // UPI **sirf owner bharta hai** — koi default nahi. Khaali hai to website
  // payment rok deti hai aur /api/sheet-health par "upiSet:false" dikhta hai.
  ['upi_id', ''],
  ['upi_name', 'Noor Ethnic Wear'],
  ['announcement', 'Order in the bag, confirm on WhatsApp in one tap'],
  // R50 — Daily Special ribbon under the header. Empty = the ribbon is hidden.
  // Example: 'Daily Special · Rose Dew Daily Wear ₹599 · Free delivery today only'
  ['daily_special', ''],
  ['gstin', ''],
  ['free_shipping', 'true'],
  ['admin_url', 'https://admin.noorethnicwear.in'],
  ['store_url', 'https://noorethnicwear.in'],
  ['store_name', 'Noor Ethnic Wear'],
  ['order_prefix', 'NE'],
  ['prepaid_only', 'true'],
  ['support_hours', 'Monday to Saturday, 10:00 AM – 8:00 PM IST'],
  ['return_window_days', '7'],
  ['instagram', 'https://www.instagram.com/noorethnicwear'],
  // R48 — YouPI PG (UPI payment gateway). Values ka matlab:
  //   youpi_pay_url        = gateway ka public https address (jaise https://pay.yourdomain.com)
  //   youpi_merchant_id    = Publishable Merchant ID (UUID, data-youpi-key / X-Merchant-Id)
  //   youpi_merchant_key   = Secret Merchant API Key (X-Merchant-Key) — SIRF server
  //   youpi_webhook_secret = webhook ka HMAC signing secret — SIRF server
  // Dono secrets website/public API me kabhi nahi jaate.
  // Keys kahan se aati hain: gateway ka "Merchant Admin" panel → Settings →
  // "Merchant API Keys, Webhook Endpoints & Cryptographic Secrets" card.
  ['youpi_enabled', 'true'],
  ['youpi_pay_url', ''],          // gateway ka public URL (pay.yourdomain.com)
  ['youpi_merchant_id', ''],      // Publishable Merchant ID (UUID)
  ['youpi_merchant_key', ''],     // Secret Merchant API Key (mk_live_…) — server only
  ['youpi_webhook_secret', ''],   // Webhook signing secret (64 hex) — server only
];

/** Dashboard me jo metrics har baar likhe jaate hain. */
var DASHBOARD_METRICS = [
  'Orders (total)', 'Orders (today)', 'Revenue (paid)', 'Pending payment',
  'Messages (new)', 'Newsletter subscribers', 'Reviews (pending)', 'Low stock SKUs',
];

/** Money columns — in par ₹ format lagta hai (sirf naye tab banne par). */
var MONEY_COLUMNS = {
  Orders: ['Total', 'Subtotal', 'Discount'],
  Payments: ['Total', 'Subtotal', 'Discount'],
  OrderItems: ['Price', 'Line total'],
  Invoices: ['Taxable value', 'CGST', 'SGST', 'IGST', 'Shipping', 'Discount', 'Total'],
  Inventory: ['Stock'],
};

/** Timestamp column — date format lagta hai. */
var TIMESTAMP_COLUMN = 'Timestamp';

/* ═══════════════════════════ 3. CHHOTE HELPERS ═══════════════════════════════ */

/** JSON response — Apps Script ka `ContentService` sirf text bhej sakta hai. */
function json_(payload) {
  return ContentService.createTextOutput(JSON.stringify(payload)).setMimeType(
    ContentService.MimeType.JSON,
  );
}

/** Abhi ka time (ISO string) */
function now_() {
  return new Date().toISOString();
}

/** Sheet me dikhne wala time — IST me, padhne me aasan. */
function istNow_() {
  try {
    return Utilities.formatDate(new Date(), TIMEZONE, 'dd-MMM-yyyy HH:mm:ss');
  } catch (error) {
    return now_();
  }
}

/** Aaj ki date `YYYY-MM-DD` (IST) — "aaj ke orders" ginne ke liye. */
function todayKey_() {
  try {
    return Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd');
  } catch (error) {
    return new Date().toISOString().slice(0, 10);
  }
}

/** Kisi bhi value ko number me (paise/rupees dono handle). */
function num_(value) {
  if (typeof value === 'number' && isFinite(value)) return value;
  var cleaned = String(value === null || value === undefined ? '' : value).replace(/[^0-9.\-]/g, '');
  var parsed = Number(cleaned);
  return isFinite(parsed) ? parsed : 0;
}

/** Text ko saaf karo — extra spaces hatao, lambai cap karo. */
function text_(value) {
  if (value === null || value === undefined) return '';
  var clean = String(value).replace(/\s+/g, ' ').trim();
  return clean.length > MAX_CELL_CHARS ? clean.slice(0, MAX_CELL_CHARS) : clean;
}

/** Chhota stable hash (dedupe ke liye) */
function hash_(value) {
  var text = String(value === null || value === undefined ? '' : value);
  var hash = 0;
  for (var i = 0; i < text.length; i += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }
  return 'h' + Math.abs(hash).toString(36);
}

/** `true/1/yes/haan` → true */
function truthy_(value) {
  if (typeof value === 'boolean') return value;
  if (value === null || value === undefined) return false;
  return /^(true|yes|y|1|on|haan|ha)$/i.test(String(value).trim());
}

/** Array ko chhote tukdon me baanto (bahut badi call ko todne ke liye) */
function chunk_(list, size) {
  var out = [];
  for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
  return out;
}

/* ═══════════════════ 3b. TOKEN (Script Properties me rehta hai) ══════════════ */

/** Script Properties — yahin TOKEN aur SHEET_ID rehte hain (code paste se nahi mitte). */
function props_() {
  try {
    return PropertiesService.getScriptProperties();
  } catch (error) {
    return null;
  }
}

/**
 * Asli token = Script Properties `TOKEN`, warna code wali `var TOKEN`.
 * Public placeholder ('CHANGE-ME-noor-token') **token hi nahi** maana jaata —
 * wo public repo me likha hai, usse koi bhi sheet me likh paata.
 */
function effectiveToken_() {
  var fromProps = '';
  var store = props_();
  if (store) {
    try {
      fromProps = String(store.getProperty('TOKEN') || '').trim();
    } catch (error) {}
  }
  var fromCode = String((typeof TOKEN === 'string' && TOKEN) || '').trim();
  var token = fromProps || fromCode;
  if (!token || token === TOKEN_PLACEHOLDER) return '';
  return token;
}

/** Token match hua? Token set hi nahi → false (protected action kabhi nahi chalega). */
function tokenOk_(given) {
  var token = effectiveToken_();
  if (!token) return false;
  return String(given === null || given === undefined ? '' : given) === token;
}

/** Token error ke saath insaano layak FIX — owner khud theek kar sakta hai. */
function tokenFix_() {
  if (!effectiveToken_()) {
    return 'Script ka TOKEN set nahi hai. Browser me kholiye: <webapp URL>?action=set_token&token=<Vercel ke GOOGLE_SHEETS_TOKEN ki value>';
  }
  return 'Vercel ka GOOGLE_SHEETS_TOKEN aur script ka token same hone chahiye. Badalna ho: <webapp URL>?action=set_token&token=<nayi value>&old=<abhi wali value>';
}

/**
 * `set_token` — naya token Script Properties me save karo (ek baar ka setup).
 * Safety: token pehle se set hai to sirf `old` match karne par hi badalta hai.
 * Fresh install (placeholder/unset) par sahi value wala koi bhi set kar sakta hai —
 * warna setup hi kabhi shuru nahi hoga.
 */
function setToken_(next, old) {
  var token = String(next || '').trim();
  if (token.length < 20) return { ok: false, error: 'token kam se kam 20 character ka hona chahiye' };
  if (token === TOKEN_PLACEHOLDER) {
    return { ok: false, error: 'ye public placeholder hai — apna random token daaliye (terminal me: openssl rand -hex 24)' };
  }
  var current = effectiveToken_();
  if (current && String(old || '') !== current) {
    return { ok: false, error: 'token pehle se set hai — badalne ke liye old=<abhi wali value> bhi bhejiye' };
  }
  var store = props_();
  if (!store) return { ok: false, error: 'Script Properties available nahi' };
  store.setProperty('TOKEN', token);
  return {
    ok: true,
    tokenSet: true,
    tokenLength: token.length,
    note: 'Token Script Properties me save — code dobara paste karne par bhi nahi tootega. Vercel ka GOOGLE_SHEETS_TOKEN bhi yahi hona chahiye.',
  };
}

/** Bina token ke dikhne layak settings keys (admin_url/support_email jaisi private cheezein nahi). */
var PUBLIC_SETTING_KEYS = [
  'store_name', 'announcement', 'support_phone', 'phone', 'whatsapp', 'whatsapp_number',
  'upi_id', 'upi_name', 'gstin', 'free_shipping', 'order_prefix', 'prepaid_only',
  'support_hours', 'return_window_days', 'instagram',
  // R48 — YouPI ka public hissa (browser youpi.js embed karta hai). Secret
  // (`youpi_webhook_secret`) jaan-boojhkar is list me **nahi** hai.
  'youpi_enabled', 'youpi_pay_url', 'youpi_merchant_id',
];

/* ═══════════════════════════ 4. SHEET ACCESS ════════════════════════════════ */

/**
 * Kaun si sheet? — pehle `SPREADSHEET_ID`, phir Script Property `SHEET_ID`,
 * phir (last me) jis sheet ke saath script bana hai.
 *
 * Order jaan-boojhkar aisa hai: agar script kisi "copy" sheet ke saath bound ho
 * gaya ho to `getActiveSpreadsheet()` galat jagah likh deta tha (owner ke saath
 * yahi hua tha — asli sheet khaali dikh rahi thi).
 *
 * `typeof` ka use: agar `SPREADSHEET_ID` line delete ho jaye to crash na ho.
 */
function book_() {
  var store = props_();
  var id = '';
  if (store) {
    try {
      id = String(store.getProperty('SHEET_ID') || '').trim();
    } catch (error) {}
  }
  if (!id) id = (typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID) || SHEET_ID_FALLBACK || '';

  if (id) {
    try {
      return SpreadsheetApp.openById(id);
    } catch (error) {
      // is account ko configured sheet par access nahi — neeche bound sheet try hoti hai
      Logger.log('book_: could not open "' + id + '" (' + error.message + ')');
    }
  }

  // Script kisi sheet ke andar se bani hai (Extensions → Apps Script) → wahi use karo
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) return active;
  } catch (ignored) {}

  /**
   * R38: chup-chaap nayi sheet **kabhi nahi** banate. Purana behaviour
   * (`SpreadsheetApp.create` fallback) owner ke orders ek anaath sheet me daal
   * deta tha — website par sab "ok" dikhta, sheet khaali rehti. Ab loud error:
   * `?action=health` aur `doctor` fix bataate hain. Nayi sheet chahiye to
   * `createOwnSheet` **jaan-boojh kar** chalaiye.
   */
  throw new Error(
    'sheet_access_denied — na configured sheet khuli, na script kisi sheet se bound hai. FIX: ' +
    'apni sheet → Share → ' + (executingEmail_() || 'script ke account') + ' → Editor, ' +
    'ya script apni sheet se banaiye (Sheet → Extensions → Apps Script) aur ?action=adopt kholiye.',
  );
}

/**
 * `createOwnSheet` — owner ke liye: **isi Google account me nayi sheet** banao aur
 * wahi website ke liye use karo (purani sheet kisi doosre account ki ho to).
 *
 * Kya karta hai:
 *   1. nayi spreadsheet banti hai ("Noor Ethnic Wear — Store"),
 *   2. uska id Script Properties me save hota hai (aage yahi use hogi),
 *   3. saare 16 tabs + headers + formatting + default settings ban jaate hain,
 *   4. **URL** log me + toast me milta hai.
 *
 * Purani sheet ko chheda nahi jaata (data safe rehta hai).
 */
function createOwnSheet() {
  return guard_('createOwnSheet', function () {
    var created = SpreadsheetApp.create('Noor Ethnic Wear — Store (website data)');
    PropertiesService.getScriptProperties().setProperty('SHEET_ID', created.getId());
    var created2 = setup_();
    Logger.log('✅ New sheet created: ' + created.getUrl());
    Logger.log('   (id: ' + created.getId() + ') — this is now the sheet the website uses.');
    Logger.log('   Tabs: ' + (created2.join(', ') || 'all already existed'));
    try {
      created.toast('Sheet ready ✔ URL: ' + created.getUrl(), 'createOwnSheet', 20);
    } catch (ignored) {}
    return { url: created.getUrl(), id: created.getId(), tabs: created2 };
  });
}

/**
 * Kis Google account se script chal rahi hai?
 *
 * Ye sabse zaroori sawaal hai jab "You do not have permission to access the
 * requested document" aata hai — sheet kisi **doosre** account ki hoti hai aur
 * is account ko us par Editor access nahi hota.
 */
function executingEmail_() {
  try {
    if (typeof Session !== 'undefined' && Session.getEffectiveUser) {
      var effective = Session.getEffectiveUser().getEmail();
      if (effective) return effective;
    }
  } catch (ignored) {}
  try {
    if (typeof Session !== 'undefined' && Session.getActiveUser) return Session.getActiveUser().getEmail() || '';
  } catch (ignored) {}
  return '';
}

/**
 * `whoAmI` — function dropdown se Run kariye, **Execution log** me dikhega:
 * kaun sa account chal raha hai, aur us account ko sheet mil rahi hai ya nahi.
 * Permission wali error me sabse pehle yahi chalaiye.
 */
function whoAmI() {
  var id = (typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID) || SHEET_ID_FALLBACK;
  var info = { version: CODE_VERSION, effectiveUser: executingEmail_(), sheetId: id, sheetAccess: false, sheetName: '', error: '' };
  try {
    var book = SpreadsheetApp.openById(id);
    info.sheetAccess = true;
    info.sheetName = book.getName();
  } catch (error) {
    info.error = String(error && error.message ? error.message : error);
  }
  Logger.log(JSON.stringify(info, null, 2));
  try {
    book_().toast(
      info.sheetAccess ? 'Sheet mil gayi ✔ (' + info.sheetName + ')' : 'Sheet access nahi — Share → Editor kariye',
      'whoAmI',
      8,
    );
  } catch (ignored) {}
  return info;
}

/**
 * `doctor` — poora health check ek jagah (log me padhne layak):
 * account, sheet access, tabs, settings, token length, version.
 * Kuch bhi fail ho to yahin pata chal jayega — pehle isi ko chalaiye.
 */
function doctor() {
  var report = {
    version: CODE_VERSION,
    time: istNow_(),
    account: executingEmail_(),
    tokenSet: Boolean(effectiveToken_()),
    tokenLength: effectiveToken_().length,
    sheetId: (typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID) || SHEET_ID_FALLBACK,
    sheetAccess: false,
    sheetName: '',
    tabs: [],
    settingsKeys: 0,
    problems: [],
  };
  try {
    var book = SpreadsheetApp.openById(report.sheetId);
    report.sheetAccess = true;
    report.sheetName = book.getName();
  } catch (error) {
    report.problems.push(
      'Configured sheet khul nahi rahi (' + (error && error.message ? error.message : error) + ') — ' +
      'koi baat nahi: script apni nayi sheet bana kar usme likh legi. ' +
      'Apni sheet abhi banani ho to function `createOwnSheet` chalaiye (isi account me ban jayegi). ' +
      'Purani sheet me hi likhna ho to Sheet → Share → ' + (report.account || 'script ka account') + ' → Editor.',
    );
  }
  if (report.sheetAccess) {
    try {
      report.tabs = sheetCounts_().map(function (row) {
        return row.name + '(' + row.rows + ')';
      });
      report.settingsKeys = Object.keys(readSettings_()).length;
    } catch (error) {
      report.problems.push('Tabs/settings padhne me dikkat: ' + (error && error.message ? error.message : error) + ' → `setup` chalaiye');
    }
  }
  if (!report.tokenSet) report.problems.push('TOKEN set nahi hai — browser me ?action=set_token&token=<Vercel GOOGLE_SHEETS_TOKEN> kholiye');
  if (!report.problems.length) report.problems.push('koi problem nahi mili ✔');
  Logger.log(JSON.stringify(report, null, 2));
  return report;
}

/**
 * Owner-facing functions ko saaf error ke saath chalane wala wrapper.
 *
 * Kyun: "You do not have permission to access the requested document" jaisi
 * Google ki error samajhna mushkil hoti hai. Ye wrapper usko seedha FIX me
 * badal deta hai — Apps Script ke **Execution log** me padhne layak.
 */
function guard_(name, fn) {
  try {
    return fn();
  } catch (error) {
    var message = String(error && error.message ? error.message : error);
    var fix = /permission|access|document/i.test(message)
      ? 'FIX: Sheet kholein → Share → ' + (executingEmail_() || 'jo account script chala raha hai') +
        ' → Editor → Send. (Script isi account se chal rahi hai, sheet doosre account ki hai.)'
      : 'Detail ke liye function `doctor` chalaiye (log me poora report aayega).';
    Logger.log('❌ ' + name + ' failed: ' + message);
    Logger.log('👉 ' + fix);
    try {
      book_().toast(name + ' fail: ' + fix, name, 10);
    } catch (ignored) {}
    throw new Error(name + ' fail: ' + message + ' — ' + fix);
  }
}

/** Naam ya gid se tab dhoondho; na mile to (khaali naam ke liye) bana do. */
function findSheet_(book, name) {
  var gid = GIDS[name];
  if (gid !== null && gid !== undefined && gid !== '') {
    var sheets = book.getSheets();
    for (var i = 0; i < sheets.length; i += 1) {
      if (sheets[i].getSheetId() === Number(gid)) return sheets[i];
    }
  }
  return book.getSheetByName(name);
}

/** Tab lo — na ho to headers ke saath bana do. */
function sheet_(name) {
  var book = book_();
  var sheet = findSheet_(book, name);
  if (!sheet) {
    sheet = book.insertSheet(name);
    if (HEADERS[name]) {
      sheet.appendRow(HEADERS[name]);
      sheet.setFrozenRows(1);
      sheet.getRange(1, 1, 1, HEADERS[name].length).setFontWeight('bold');
      applyFormatting_(sheet, name);
    }
  }
  ensureHeaders_(sheet, name);
  return sheet;
}

/**
 * Header row ko sahi karo: purani sheet me kam columns hain to missing column
 * jod diye jaate hain — warna naye fields (jaise `Reason`) chup-chaap drop ho
 * jaate the aur owner ko "data nahi aaya" dikhta tha.
 */
function ensureHeaders_(sheet, name) {
  var headers = HEADERS[name];
  if (!headers) return;
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold');
    applyFormatting_(sheet, name);
    return;
  }
  var width = Math.max(1, sheet.getLastColumn());
  var current = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (value) {
    return String(value || '').trim();
  });
  var missing = headers.filter(function (header) {
    return current.indexOf(header) === -1;
  });
  if (missing.length) {
    sheet.getRange(1, width + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    applyFormatting_(sheet, name);
  }
}

/**
 * Column widths — owner ne kaha "columns fix kar do taaki manually kaam karne me
 * dikkat na ho". Har column ki fixed width (pixels) hai; lambe text wale columns
 * (Item details, Message, Review, Address) me wrap lagta hai, isliye kuch bhi
 * kata hua nahi dikhta.
 */
var COLUMN_WIDTHS = {
  Timestamp: 130, Event: 150, 'Order number': 120, 'Order status': 100,
  'Payment status': 105, 'Payment method': 95, 'Payment reference': 140,
  'UPI ID': 150, Total: 90, Subtotal: 90, Discount: 85, Coupon: 90,
  Items: 70, 'Item details': 260, Customer: 120, Phone: 105, Email: 165,
  Address: 230, City: 95, State: 100, Pincode: 80, 'Tracking courier': 110,
  AWB: 120, 'Tracking URL': 170, Notes: 200, Source: 90, Device: 90,
  'Verified by': 100, 'Verified at': 120, Product: 190, Handle: 140, SKU: 130,
  Size: 70, Colour: 90, Quantity: 70, Price: 90, 'Line total': 95,
  Category: 110, 'Image URL': 170, Status: 95, 'Invoice number': 120, Type: 70,
  GSTIN: 130, 'Taxable value': 105, CGST: 80, SGST: 80, IGST: 80, Shipping: 85,
  Courier: 110, 'Expected delivery': 110, 'Updated by': 100, Step: 90,
  Reason: 150, Session: 120, Name: 120, Subject: 130, Message: 320, Replied: 80,
  'Replied at': 120, 'Source page': 110, 'Message ID': 130, Rating: 65,
  Title: 150, Review: 300, Verified: 75, 'Photo URL': 150, Code: 100, Value: 70,
  'Min order': 85, 'Max uses': 75, Used: 60, Active: 60, Expires: 90,
  Note: 160, Stock: 65, Change: 65, 'Low stock alert': 95, Actor: 110,
  Action: 150, Target: 120, Details: 260, IP: 110, Context: 130,
  Payload: 260, Version: 70, Metric: 150, Direction: 110, Rows: 60,
  Detail: 180, Total: 90,
};

/**
 * Text columns — in par `@` (plain text) format lagta hai, warna phone/pincode
 * number ban jaate hain (aage ka 0 gayab, `303325` me se sort me gadbad) aur
 * owner ko manually dikkat hoti hai.
 */
var TEXT_COLUMNS = ['Phone', 'Pincode', 'AWB', 'Order number', 'Invoice number', 'SKU', 'Code', 'Message ID', 'GSTIN', 'UPI ID', 'Payment reference'];

/** Wrap wale columns (lambe text) */
var WRAP_COLUMNS = ['Item details', 'Notes', 'Message', 'Review', 'Address', 'Details', 'Payload', 'Note', 'Title'];

/** Money columns — in par ₹ format lagta hai (sirf naye tab banne par). */
var MONEY_COLUMNS = {
  Orders: ['Total', 'Subtotal', 'Discount'],
  Payments: ['Total', 'Subtotal', 'Discount'],
  OrderItems: ['Price', 'Line total'],
  Invoices: ['Taxable value', 'CGST', 'SGST', 'IGST', 'Shipping', 'Discount', 'Total'],
  Inventory: ['Stock'],
};

/**
 * Tab ki formatting — header bold + freeze, column widths fixed, wrap, ₹ format,
 * aur filter (dropdown) taaki owner manually sort/filter kar sake.
 */
function applyFormatting_(sheet, name) {
  try {
    var headers = HEADERS[name];
    if (!headers) return;
    // header row: bold + grey + freeze
    var headerRange = sheet.getRange(1, 1, 1, headers.length);
    headerRange.setFontWeight('bold');
    headerRange.setBackground('#f1ece4');
    headerRange.setVerticalAlignment('middle');
    sheet.setFrozenRows(1);
    if (sheet.getMaxColumns() > headers.length) {
      sheet.deleteColumns(headers.length + 1, sheet.getMaxColumns() - headers.length);
    }

    headers.forEach(function (column, index) {
      var width = COLUMN_WIDTHS[column] || 110;
      try {
        sheet.setColumnWidth(index + 1, width);
      } catch (ignored) {}
    });

    // filter (dropdown) — sirf ek hi baar
    try {
      if (!sheet.getFilter()) sheet.getRange(1, 1, Math.max(2, sheet.getLastRow()), headers.length).createFilter();
    } catch (ignored) {}

    // money + date formats (poori column)
    var rows = Math.max(2, sheet.getMaxRows());
    (MONEY_COLUMNS[name] || []).forEach(function (column) {
      var index = headers.indexOf(column);
      if (index >= 0) sheet.getRange(2, index + 1, rows - 1, 1).setNumberFormat(MONEY_FORMAT);
    });
    var stamp = headers.indexOf(TIMESTAMP_COLUMN);
    if (stamp >= 0) sheet.getRange(2, stamp + 1, rows - 1, 1).setNumberFormat('dd-MMM-yyyy HH:mm');

    // phone / pincode / AWB / order number — plain text (leading 0 aur bade number safe)
    TEXT_COLUMNS.forEach(function (column) {
      var index = headers.indexOf(column);
      if (index >= 0) sheet.getRange(2, index + 1, rows - 1, 1).setNumberFormat('@');
    });

    // lambe text wrap + top align (poori sheet ek hi call me — fast)
    var wrapRange = sheet.getRange(2, 1, rows - 1, headers.length);
    wrapRange.setWrapStrategy(SpreadsheetApp.WrapStrategy ? SpreadsheetApp.WrapStrategy.CLIP : 'clip');
    wrapRange.setVerticalAlignment('top');
    WRAP_COLUMNS.forEach(function (column) {
      var index = headers.indexOf(column);
      if (index >= 0) {
        sheet
          .getRange(2, index + 1, rows - 1, 1)
          .setWrapStrategy(SpreadsheetApp.WrapStrategy ? SpreadsheetApp.WrapStrategy.WRAP : 'wrap');
      }
    });
  } catch (error) {
    // formatting fail ho to data likhna nahi rukna chahiye
  }
}

/** Sabhi tabs par formatting dobara lagao (owner ka manual trigger `formatAll`) */
function formatAll() {
  return guard_('formatAll', function () {
    ['Settings'].concat(Object.keys(HEADERS)).forEach(function (name) {
      if (name === 'Settings') return;
      applyFormatting_(sheet_(name), name);
    });
    book_().toast('Column width and formats are set ✔', 'formatAll', 6);
    return true;
  });
}

/** Tab ke headers (trimmed) */
function headersOf_(sheet) {
  var width = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, 1, width).getValues()[0].map(function (value) {
    return String(value || '').trim();
  });
}

/** Sheet ki saari values (header ke saath) */
function allValues_(sheet) {
  var last = sheet.getLastRow();
  if (last === 0) return [];
  var width = Math.max(1, sheet.getLastColumn());
  return sheet.getRange(1, 1, last, width).getValues();
}

/* ═══════════════════════════ 5. LOGGING / ERRORS ════════════════════════════ */

/** Error ko `Errors` tab me likho — debug ke liye (khud fail ho to chup raho). */
function logError_(context, error, payload) {
  try {
    var sheet = sheet_('Errors');
    var message = error && error.message ? error.message : String(error);
    sheet.appendRow([
      istNow_(),
      text_(context),
      text_(message).slice(0, 900),
      text_(payload ? JSON.stringify(payload) : '').slice(0, 900),
      CODE_VERSION,
    ]);
    trimTab_(sheet, ERRORS_KEEP);
  } catch (ignored) {
    Logger.log('logError_ failed: ' + context + ' — ' + error);
  }
}

/** Bahut badi tab ko limit tak kaato (purani rows delete). */
function trimTab_(sheet, keep) {
  try {
    var last = sheet.getLastRow();
    if (last <= keep) return;
    sheet.deleteRows(2, last - keep);
  } catch (ignored) {}
}

/** `Sync` tab me ek line — kya aaya, kitni rows likhi gayi. */
function noteSync_(direction, sheetName, rows, status, detail) {
  try {
    sheet_('Sync').appendRow([istNow_(), direction, sheetName || '-', rows || 0, status || 'ok', text_(detail)]);
  } catch (ignored) {}
}

/** Audit tab me admin/website ki activity */
function noteAudit_(actor, action, target, details) {
  try {
    sheet_('Audit').appendRow([istNow_(), text_(actor), text_(action), text_(target), text_(details), '']);
  } catch (ignored) {}
}

/* ═══════════════════════════ 6. ONE-TIME SETUP ══════════════════════════════ */

/**
 * Ek baar chalaiye — saare tabs, headers, formatting aur default settings bana
 * deta hai. Dobara chalane par purana data **nahi** mitta (sirf missing cheezein
 * add hoti hain).
 */
function setup() {
  return guard_('setup', setup_);
}

function setup_() {
  var created = [];
  Object.keys(HEADERS).forEach(function (name) {
    var before = findSheet_(book_(), name);
    sheet_(name);
    if (!before) created.push(name);
  });

  seedSettings_();

  refreshDashboard_();
  noteSync_('script', 'setup', created.length, 'ok', 'tabs: ' + created.join(', '));
  try {
    book_().toast('Noor sheets ready ✔ (' + Object.keys(HEADERS).length + ' tabs)', 'setup', 6);
  } catch (ignored) {}
  Logger.log('setup done. new tabs: ' + (created.join(', ') || 'none'));
  Logger.log('next: Deploy → Manage deployments → ✏️ → New version → Deploy');
  return created;
}

/** Owner ke liye — kabhi header toot jaye to dobara theek kar deta hai. */
function repairHeaders() {
  return guard_('repairHeaders', repairHeaders_);
}

function repairHeaders_() {
  var fixed = [];
  Object.keys(HEADERS).forEach(function (name) {
    var sheet = sheet_(name);
    var before = headersOf_(sheet).join('|');
    ensureHeaders_(sheet, name);
    if (headersOf_(sheet).join('|') !== before) fixed.push(name);
  });
  book_().toast('Headers checked ✔ (' + (fixed.length ? fixed.join(', ') : 'all correct') + ')', 'repair', 6);
  return fixed;
}

/**
 * Settings tab: header row + har missing default key (values kabhi overwrite
 * nahi hote). `setup()` aur `migrate()` dono isi ko call karte hain, isliye
 * naya key (jaise `daily_special`) purani sheet me bhi apne aap aa jaata hai.
 */
function seedSettings_() {
  var settings = sheet_('Settings');
  if (settings.getLastRow() === 0) {
    settings.appendRow(['key', 'value']);
    settings.setFrozenRows(1);
    settings.getRange(1, 1, 1, 2).setFontWeight('bold');
  }
  var existing = {};
  if (settings.getLastRow() > 1) {
    settings
      .getRange(2, 1, settings.getLastRow() - 1, 2)
      .getValues()
      .forEach(function (row) {
        existing[String(row[0]).trim().toLowerCase()] = true;
      });
  }
  var added = [];
  DEFAULT_SETTINGS.forEach(function (entry) {
    if (!existing[entry[0]]) {
      settings.appendRow(entry);
      added.push(entry[0]);
    }
  });
  return added;
}

/**
 * Migrate — purane/naye sab tabs ka header sahi karta hai, Settings ki missing

 * keys add karta hai, aur Dashboard bhar deta hai. `setup()` ise khud call karta
 * hai, isliye alag chalane ki zaroorat nahi.
 */
function migrate() {
  return guard_('migrate', function () {
    return { settings: seedSettings_(), headers: repairHeaders_(), dashboard: refreshDashboard_() };
  });
}

/* ═══════════════════════════ 7. SETTINGS ════════════════════════════════════ */

/** Settings tab: key/value rows → object (website isse padhti hai). */
function readSettings_() {
  var sheet = sheet_('Settings');
  var values = sheet.getDataRange().getValues();
  var out = {};
  for (var i = 0; i < values.length; i += 1) {
    var key = String(values[i][0] || '').trim().toLowerCase();
    var raw = values[i][1];
    var value = String(raw === null || raw === undefined ? '' : raw).trim();
    if (!key || !value) continue;
    if (key === 'key' || key === 'store' || key === 'admin' || key === 'preview') continue;
    out[key] = value;
  }
  // website in dono naam se bhi padh sakti hai
  if (out.whatsapp && !out.whatsapp_number) out.whatsapp_number = out.whatsapp;
  if (out.support_phone && !out.phone) out.phone = out.support_phone;
  return out;
}

/** Settings tab me values likho (purani key update, nayi key add). */
function writeSettings_(settings) {
  var sheet = sheet_('Settings');
  var values = sheet.getDataRange().getValues();
  var index = {};
  for (var i = 0; i < values.length; i += 1) {
    index[String(values[i][0] || '').trim().toLowerCase()] = i + 1;
  }
  var written = 0;
  Object.keys(settings || {}).forEach(function (key) {
    var cleanKey = String(key).trim().toLowerCase();
    if (!cleanKey || cleanKey === 'key') return;
    var value = settings[key];
    if (value === undefined || value === null) return;
    var cell = typeof value === 'boolean' ? (value ? 'true' : 'false') : text_(value);
    if (index[cleanKey]) sheet.getRange(index[cleanKey], 2).setValue(cell);
    else sheet.appendRow([cleanKey, cell]);
    written += 1;
  });
  return written;
}

/* ═══════════════════════════ 8. READ HELPERS ════════════════════════════════ */

/** Last N rows, header ke naam par object bana kar (latest pehle). */
function recentRows_(name, limit) {
  if (!HEADERS[name]) return [];
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = headersOf_(sheet);
  var start = Math.max(2, last - limit + 1);
  var values = sheet.getRange(start, 1, last - start + 1, headers.length).getValues();
  return values.reverse().map(function (row) {
    var object = {};
    for (var i = 0; i < headers.length; i += 1) {
      object[headers[i]] = row[i] === null || row[i] === undefined ? '' : row[i];
    }
    return object;
  });
}

/** Kisi ek column me value dhoondho (order number, email, coupon code…) */
function findRows_(name, column, value, limit) {
  if (!HEADERS[name]) return [];
  var sheet = sheet_(name);
  var last = sheet.getLastRow();
  if (last < 2) return [];
  var headers = headersOf_(sheet);
  var index = headers.indexOf(column);
  if (index < 0) return [];
  var from = Math.max(2, last - 4000 + 1); // bahut badi sheet me poori scan na kare
  var values = sheet.getRange(from, 1, last - from + 1, headers.length).getValues();
  var needle = String(value).trim().toLowerCase();
  var out = [];
  for (var i = values.length - 1; i >= 0 && out.length < (limit || 50); i -= 1) {
    if (String(values[i][index]).trim().toLowerCase() === needle) {
      var object = {};
      for (var c = 0; c < headers.length; c += 1) {
        object[headers[c]] = values[i][c] === null || values[i][c] === undefined ? '' : values[i][c];
      }
      out.push(object);
    }
  }
  return out;
}

/** Ek order ki poori kahani — Orders + Items + Payments + Shipments + Invoices. */
function orderStory_(orderNumber) {
  var wanted = String(orderNumber || '').trim();
  if (!wanted) return null;
  var sheets = ['Orders', 'OrderItems', 'Payments', 'Shipments', 'Invoices'];
  var story = { orderNumber: wanted, rows: {} };
  var found = false;
  sheets.forEach(function (name) {
    var rows = findRows_(name, 'Order number', wanted, 40);
    story.rows[name] = rows;
    if (rows.length) found = true;
  });
  return found ? story : null;
}

/* ───────────────────────────── TRACKING TIMELINE ─────────────────────────────
 * 5 step + har update ki history. Site wala same logic (apps/web/src/lib/tracking.ts)
 * yahan bhi hai — sheet se seedha jawab mil jaata hai, site down ho to bhi.
 */

var TIMELINE_STEPS = ['placed', 'confirmed', 'packed', 'shipped', 'delivered'];

/** kisi bhi status text ko 5-step me baant deta hai (purane/hindi text bhi) */
function timelineStepFor_(status) {
  var value = String(status || '').toLowerCase();
  if (!value) return -1;
  if (/cancel|return|refund|rto/.test(value)) return -1;
  if (/out for deliver/.test(value)) return 3;
  if (/deliver|complete|handover/.test(value)) return 4;
  if (/ship|dispatch|transit|courier|awb/.test(value)) return 3;
  if (/pack|ready|label/.test(value)) return 2;
  if (/confirm|process|accept|prepar/.test(value)) return 1;
  return 0;
}

/** courier + AWB se tracking link (admin URL na ho to bhi customer atke nahi) */
function trackingUrlFor_(courier, awb) {
  var number = String(awb || '').replace(/[^A-Za-z0-9-]/g, '').toUpperCase();
  if (!number) return '';
  var name = String(courier || '');
  if (/delhivery/i.test(name)) return 'https://www.delhivery.com/track/package/' + number;
  if (/blue\s*dart|bluedart/i.test(name)) {
    return 'https://www.bluedart.com/web/guest/trackdartresultthirdparty?trackFor=0&trackNo=' + number;
  }
  if (/dtdc/i.test(name)) return 'https://www.dtdc.in/tracking/tracking_results.asp?strCnno=' + number + '&TrkType=1';
  if (/india\s*post|speed\s*post|registered\s*post/i.test(name)) {
    return 'https://www.indiapost.gov.in/_layouts/15/dop.portal.tracking/trackconsignment?consignmentno=' + number;
  }
  if (/ekart|flipkart/i.test(name)) return 'https://ekartlogistics.com/track/' + number;
  if (/xpress\s*bees|xpressbees/i.test(name)) return 'https://www.xpressbees.com/shipment/tracking?awbNo=' + number;
  if (/shadowfax/i.test(name)) return 'https://tracker.shadowfax.in/#/track/' + number;
  if (/ecom/i.test(name)) return 'https://ecomexpress.in/tracking/?awb_field=' + number;
  if (/shiprocket/i.test(name)) return 'https://shiprocket.co/tracking/' + number;
  if (/professional/i.test(name)) return 'https://www.tpcindia.com/Tracking.aspx?type=0&id=' + number;
  if (/amazon|ats/i.test(name)) return 'https://track.amazon.in/tracking/' + number;
  if (/fedex/i.test(name)) return 'https://www.fedex.com/fedextrack/?trknbr=' + number;
  if (/dhl/i.test(name)) return 'https://www.dhl.com/in-en/home/tracking.html?tracking-id=' + number;
  return '';
}

/** event/status se customer-friendly message (sheet me Notes khaali ho to) */
function updateMessageFor_(event, status) {
  var value = (String(event || '') + ' ' + String(status || '')).toLowerCase();
  if (/payment\.claim/.test(value)) return 'Payment confirm request mili — team UPI statement se verify kar rahi hai.';
  if (/payment\.(verified|confirmed|paid)/.test(value)) return 'Payment confirm ho gaya — order confirm.';
  if (/deliver/.test(value)) return 'Parcel deliver ho gaya.';
  if (/return/.test(value)) return 'Return mark ho gaya.';
  if (/cancel/.test(value)) return 'Order cancel ho gaya.';
  if (/tracking/.test(value)) return 'Courier details update hui.';
  if (/ship/.test(value)) return 'Parcel courier ko de diya — AWB se track kariye.';
  if (/pack/.test(value)) return 'Packing ho gayi — jaldi courier ko jaayega.';
  if (/confirm/.test(value)) return 'Order confirm ho gaya — packing shuru.';
  if (/placed|created/.test(value)) return 'Order mil gaya — payment ka intezaar hai.';
  return '';
}

/**
 * Sheet se poora timeline.
 * Phone lazmi hai (jis order ka phone match kare wahi jawab) — warna order number
 * jaan lene se kisi ka data nahi khulta.
 */
function timeline_(orderNumber, phone) {
  var wanted = String(orderNumber || '').trim().toUpperCase();
  if (!wanted) return { ok: false, error: 'order chahiye', code: 'order_required' };
  var rows = findRows_('Orders', 'Order number', wanted, 300);
  if (!rows.length) return { ok: false, error: 'order nahi mila', code: 'order_not_found', orderNumber: wanted };

  rows.sort(function (a, b) {
    return String(a.Timestamp || '').localeCompare(String(b.Timestamp || ''));
  });

  var storedPhone = '';
  var status = '';
  var paymentStatus = '';
  var courier = '';
  var awb = '';
  var url = '';
  var note = '';
  var adminNote = '';
  var updates = [];
  for (var i = 0; i < rows.length; i += 1) {
    var row = rows[i];
    var rowPhone = String(row.Phone || '').replace(/[^0-9]/g, '').slice(-10);
    if (!storedPhone && rowPhone) storedPhone = rowPhone;
    if (text_(row['Order status'])) status = text_(row['Order status']);
    if (text_(row['Payment status'])) paymentStatus = text_(row['Payment status']);
    if (text_(row['Tracking courier'])) courier = text_(row['Tracking courier']);
    if (text_(row.AWB)) awb = text_(row.AWB);
    if (text_(row['Tracking URL'])) url = text_(row['Tracking URL']);
    if (text_(row.Notes)) note = text_(row.Notes);
    // R39 (owner): Orders ke `Admin Note` column me jo likha hai wahi customer
    // ke order page ke note-box me dikhta hai (default: Waiting for confirmation).
    if (text_(row['Admin Note'])) adminNote = text_(row['Admin Note']);
    var event = text_(row.Event);
    var message = text_(row.Notes, 300) || updateMessageFor_(event, text_(row['Order status']));
    updates.push({
      at: text_(row.Timestamp),
      status: text_(row['Order status']),
      event: event,
      message: message,
    });
  }

  var digits = String(phone || '').replace(/[^0-9]/g, '').slice(-10);
  if (!digits) {
    return { ok: false, error: 'phone chahiye', code: 'phone_required', orderNumber: wanted };
  }
  if (storedPhone && digits !== storedPhone) {
    return { ok: false, error: 'phone match nahi hua', code: 'phone_mismatch', orderNumber: wanted };
  }
  if (!storedPhone) {
    return { ok: false, error: 'is order ka phone sheet me nahi hai', code: 'phone_missing', orderNumber: wanted };
  }

  var steps = TIMELINE_STEPS.map(function (step) {
    var index = TIMELINE_STEPS.indexOf(step);
    var current = timelineStepFor_(status);
    var stopped = /cancel|return/.test(String(status).toLowerCase());
    return { step: step, done: stopped ? false : index <= current };
  });

  return {
    ok: true,
    version: CODE_VERSION,
    orderNumber: wanted,
    status: status || 'placed',
    step: timelineStepFor_(status),
    steps: steps,
    paymentStatus: paymentStatus,
    courier: courier,
    awb: awb,
    trackingUrl: url || trackingUrlFor_(courier, awb),
    note: note,
    adminNote: adminNote,
    updates: updates.slice(-12).reverse(),
    time: now_(),
  };
}

/** Har tab kitni rows — health/stats me (Settings sabse pehle). */
function sheetCounts_() {
  var names = ['Settings'].concat(Object.keys(HEADERS));
  return names.map(function (name) {
    var sheet = sheet_(name);
    return { name: name, tab: sheet.getName(), rows: Math.max(0, sheet.getLastRow() - 1) };
  });
}

/** Aaj kitne orders/events aaye (Orders tab ke Timestamp se) */
function todaysCount_(rows) {
  var today = todayKey_();
  var count = 0;
  (rows || []).forEach(function (row) {
    var stamp = String(row.Timestamp || '');
    if (stamp.indexOf(today) === 0 || stamp.indexOf(today.slice(8, 10) + '-' + today.slice(5, 7)) === 0) count += 1;
  });
  return count;
}

/* ═══════════════════════════ 9. STATS / DASHBOARD ═══════════════════════════ */

/**
 * Poora business snapshot — website ke `/api/sheet-selftest` aur admin panel
 * dono ise use karte hain. Har value sheet se **live** aati hai.
 */
function stats_() {
  var orders = recentRows_('Orders', 500);
  var paid = 0;
  var pending = 0;
  var revenue = 0;
  var todayOrders = 0;
  var today = todayKey_();
  var seenOrders = {};

  orders.forEach(function (row) {
    var number = String(row['Order number'] || '').trim();
    var isToday = String(row.Timestamp || '').indexOf(today) === 0 ||
      String(row.Timestamp || '').indexOf(today.slice(8, 10) + '-' + today.slice(5, 7)) === 0;
    if (isToday && String(row.Event || '').indexOf('order.') === 0) todayOrders += 1;
    if (!number) return;
    // har order ki latest row hi final status maani jaati hai (timeline append-only hai)
    if (seenOrders[number]) return;
    seenOrders[number] = true;
    var status = String(row['Payment status'] || '').toLowerCase();
    if (status === 'paid' || status === 'verified' || status === 'success') {
      paid += 1;
      revenue += num_(row.Total);
    } else {
      pending += 1;
    }
  });

  var messages = recentRows_('Messages', 200);
  var newMessages = messages.filter(function (row) {
    var status = String(row.Status || '').toLowerCase();
    return !status || status === 'new' || status === 'unread';
  }).length;

  var newsletter = sheet_('Newsletter');
  var reviews = recentRows_('Reviews', 200);
  var pendingReviews = reviews.filter(function (row) {
    return String(row.Status || '').toLowerCase() === 'pending';
  }).length;

  return {
    time: now_(),
    today: today,
    orders: { totalEvents: orders.length, today: todayOrders, paid: paid, pending: pending, revenue: revenue },
    messages: { total: messages.length, new: newMessages },
    newsletter: { total: Math.max(0, newsletter.getLastRow() - 1) },
    reviews: { total: reviews.length, pending: pendingReviews },
    sheets: sheetCounts_(),
  };
}

/** Dashboard tab ko refresh karo (8 metrics, latest snapshot). */
function refreshDashboard_() {
  try {
    var stats = stats_();
    var sheet = sheet_('Dashboard');
    var rows = [
      ['Orders (total)', stats.orders.paid + stats.orders.pending, 'paid + pending orders'],
      ['Orders (today)', stats.orders.today, 'IST ' + stats.today],
      ['Revenue (paid)', stats.orders.revenue, '₹ (paid orders ka total)'],
      ['Pending payment', stats.orders.pending, 'payment pending orders'],
      ['Messages (new)', stats.messages.new, 'contact form'],
      ['Newsletter subscribers', stats.newsletter.total, 'footer signup'],
      ['Reviews (pending)', stats.reviews.pending, 'approve karna baaki'],
      ['Low stock SKUs', lowStock_(), 'inventory tab se'],
    ];
    if (typeof sheet.clearContents === 'function') sheet.clearContents();
    ensureHeaders_(sheet, 'Dashboard');
    var values = rows.map(function (row) {
      return [istNow_(), row[0], row[1], row[2]];
    });
    sheet.getRange(2, 1, values.length, 4).setValues(values);
    return rows.length;
  } catch (error) {
    logError_('refreshDashboard_', error, null);
    return null;
  }
}

/** Inventory tab se low stock kitne hain (latest row per SKU) */
function lowStock_() {
  try {
    var rows = recentRows_('Inventory', 500);
    var latest = {};
    rows.forEach(function (row) {
      var key = String(row.SKU || row.Handle || '') + '|' + String(row.Size || '');
      if (key !== '|' && latest[key] === undefined) latest[key] = num_(row.Stock);
    });
    var low = 0;
    Object.keys(latest).forEach(function (key) {
      if (latest[key] <= 3) low += 1;
    });
    return low;
  } catch (error) {
    return 0;
  }
}

/* ═══════════════════════════ 10. WRITE HELPERS ══════════════════════════════ */

/** Ek cell ki value ready karo — undefined/null khaali, text saaf, number number. */
function cell_(value) {
  if (value === null || value === undefined) return '';
  if (typeof value === 'number') return isFinite(value) ? value : '';
  if (typeof value === 'boolean') return value ? 'yes' : 'no';
  if (value instanceof Date) return value;
  return text_(value);
}

/**
 * Rows append — header **naam** se column dhoondha jaata hai, isliye column ka
 * order badalne ya beech me naya column jodne se data galat jagah nahi jaata.
 *
 * Speed: ek sheet ki saari rows ek hi `setValues` call me likhi jaati hain
 * (`appendRow` ek-ek karke likhta hai — 20 rows me ~10x slow).
 */
function appendRows_(rows) {
  var lock = LockService.getScriptLock();
  lock.waitLock(LOCK_WAIT_MS);
  var written = 0;
  var skipped = 0;
  try {
    var bySheet = {};
    var order = [];
    (rows || []).forEach(function (entry) {
      var name = String((entry && entry.sheet) || 'Orders');
      if (!HEADERS[name]) {
        skipped += 1;
        return;
      }
      if (!bySheet[name]) {
        bySheet[name] = [];
        order.push(name);
      }
      bySheet[name].push((entry && entry.row) || {});
    });

    order.forEach(function (name) {
      var sheet = sheet_(name);
      var headers = headersOf_(sheet);
      var values = bySheet[name].map(function (row) {
        return headers.map(function (column) {
          return cell_(row[column]);
        });
      });
      if (!values.length) return;
      var start = Math.max(2, sheet.getLastRow() + 1);
      sheet.getRange(start, 1, values.length, headers.length).setValues(values);
      written += values.length;
    });
  } catch (error) {
    logError_('appendRows_', error, { count: (rows || []).length });
    throw error;
  } finally {
    lock.releaseLock();
  }
  if (skipped) Logger.log('appendRows_: unknown tab name on ' + skipped + ' rows');
  return written;
}

/** Ek column me value update karo (pehli matching row) — messages/coupons ke liye. */
function updateWhere_(sheetName, keyColumn, keyValue, updates) {
  var sheet = sheet_(sheetName);
  var headers = headersOf_(sheet);
  var keyIndex = headers.indexOf(keyColumn);
  if (keyIndex < 0) return 0;
  var last = sheet.getLastRow();
  if (last < 2) return 0;
  var values = sheet.getRange(2, 1, last - 1, headers.length).getValues();
  var needle = String(keyValue).trim().toLowerCase();
  var updated = 0;
  for (var i = 0; i < values.length; i += 1) {
    if (String(values[i][keyIndex]).trim().toLowerCase() !== needle) continue;
    Object.keys(updates).forEach(function (column) {
      var index = headers.indexOf(column);
      if (index >= 0) sheet.getRange(i + 2, index + 1).setValue(cell_(updates[column]));
    });
    updated += 1;
    break; // pehli matching row kaafi hai
  }
  return updated;
}

/** Newsletter — duplicate email skip */
function subscribe_(email, source) {
  var clean = String(email || '').trim().toLowerCase();
  if (!clean || clean.indexOf('@') < 0) return { ok: false, error: 'invalid email' };
  var existing = findRows_('Newsletter', 'Email', clean, 1);
  if (existing.length) return { ok: true, duplicate: true, written: 0 };
  var written = appendRows_([
    { sheet: 'Newsletter', row: { Timestamp: istNow_(), Email: clean, Source: source || 'website', Status: 'subscribed' } },
  ]);
  return { ok: true, duplicate: false, written: written };
}

/** Review — same product + same customer + same text dobara na aaye */
function addReview_(body) {
  var product = text_(body.product || body.handle || '');
  var customer = text_(body.customer || body.name || '');
  var review = text_(body.review || body.message || '');
  var key = hash_(product + '|' + customer + '|' + review);
  var sheet = sheet_('Reviews');
  var headers = headersOf_(sheet);
  var last = sheet.getLastRow();
  if (last > 1) {
    // last 500 rows me hi check (bahut badi sheet me slow na ho)
    var from = Math.max(2, last - 500 + 1);
    var values = sheet.getRange(from, 1, last - from + 1, headers.length).getValues();
    var productIndex = headers.indexOf('Product');
    var customerIndex = headers.indexOf('Customer');
    var reviewIndex = headers.indexOf('Review');
    for (var i = values.length - 1; i >= 0; i -= 1) {
      var existingKey = hash_(
        String(values[i][productIndex]) + '|' + String(values[i][customerIndex]) + '|' + String(values[i][reviewIndex]),
      );
      if (existingKey === key) return { ok: true, duplicate: true, written: 0 };
    }
  }
  var written = appendRows_([
    {
      sheet: 'Reviews',
      row: {
        Timestamp: istNow_(),
        Product: product,
        Handle: text_(body.handle || ''),
        Customer: customer,
        Rating: num_(body.rating),
        Title: text_(body.title || ''),
        Review: review,
        Verified: truthy_(body.verified) ? 'yes' : 'no',
        Status: text_(body.status || 'pending'),
        'Photo URL': text_(body.photo || ''),
        'Order number': text_(body.orderNumber || ''),
      },
    },
  ]);
  return { ok: true, duplicate: false, written: written };
}

/** Coupon — naya ho to add, purana ho to update (code unique) */
function upsertCoupon_(body) {
  var code = String(body.code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: 'code chahiye' };
  var row = {
    Timestamp: istNow_(),
    Code: code,
    Type: text_(body.type || 'percent'),
    Value: num_(body.value),
    'Min order': num_(body.minOrder),
    'Max uses': num_(body.maxUses),
    Used: num_(body.used),
    Active: truthy_(body.active === undefined ? true : body.active) ? 'yes' : 'no',
    Expires: text_(body.expires || ''),
    Note: text_(body.note || ''),
  };
  var existing = findRows_('Coupons', 'Code', code, 1);
  if (existing.length) {
    updateWhere_('Coupons', 'Code', code, row);
    return { ok: true, updated: true, written: 0 };
  }
  return { ok: true, updated: false, written: appendRows_([{ sheet: 'Coupons', row: row }]) };
}

/** Order status / tracking change — timeline + shipments dono me */
function orderUpdate_(body) {
  var number = String(body.orderNumber || '').trim();
  if (!number) return { ok: false, error: 'orderNumber chahiye' };
  var event = text_(body.event || 'order.updated');
  var rows = [
    {
      sheet: 'Orders',
      row: {
        Timestamp: istNow_(),
        Event: event,
        'Order number': number,
        'Order status': text_(body.status || ''),
        'Payment status': text_(body.paymentStatus || ''),
        'Tracking courier': text_(body.courier || ''),
        AWB: text_(body.awb || ''),
        'Tracking URL': text_(body.trackingUrl || ''),
        Notes: text_(body.note || ''),
        Source: 'admin',
      },
    },
  ];
  if (body.courier || body.awb || body.trackingUrl) {
    rows.push({
      sheet: 'Shipments',
      row: {
        Timestamp: istNow_(),
        'Order number': number,
        Courier: text_(body.courier || ''),
        AWB: text_(body.awb || ''),
        'Tracking URL': text_(body.trackingUrl || ''),
        Status: text_(body.status || 'shipped'),
        'Expected delivery': text_(body.expected || ''),
        Note: text_(body.note || ''),
        'Updated by': text_(body.actor || 'admin'),
      },
    });
  }
  if (body.paymentStatus) {
    rows.push({
      sheet: 'Payments',
      row: {
        Timestamp: istNow_(),
        Event: event,
        'Order number': number,
        'Payment status': text_(body.paymentStatus),
        'Payment reference': text_(body.reference || ''),
        'Verified by': text_(body.actor || 'admin'),
        'Verified at': istNow_(),
      },
    });
  }
  return { ok: true, written: appendRows_(rows) };
}

/** GST invoice row */
function saveInvoice_(body) {
  var number = String(body.invoiceNumber || body.number || '').trim();
  if (!number) return { ok: false, error: 'invoiceNumber chahiye' };
  var written = appendRows_([
    {
      sheet: 'Invoices',
      row: {
        Timestamp: istNow_(),
        'Invoice number': number,
        'Order number': text_(body.orderNumber || ''),
        Type: text_(body.type || 'gst'),
        Customer: text_(body.customer || body.name || ''),
        Phone: text_(body.phone || ''),
        Email: text_(body.email || ''),
        GSTIN: text_(body.gstin || ''),
        Address: text_(body.address || ''),
        State: text_(body.state || ''),
        'Taxable value': num_(body.taxable),
        CGST: num_(body.cgst),
        SGST: num_(body.sgst),
        IGST: num_(body.igst),
        Shipping: num_(body.shipping),
        Discount: num_(body.discount),
        Total: num_(body.total),
        Notes: text_(body.notes || ''),
      },
    },
  ]);
  return { ok: true, written: written };
}

/** Inventory change (stock +1 / -2, reason ke saath) */
function stockUpdate_(body) {
  var handle = text_(body.handle || body.sku || '');
  if (!handle) return { ok: false, error: 'handle/sku chahiye' };
  var stock = num_(body.stock);
  var written = appendRows_([
    {
      sheet: 'Inventory',
      row: {
        Timestamp: istNow_(),
        Product: text_(body.product || ''),
        Handle: handle,
        SKU: text_(body.sku || ''),
        Size: text_(body.size || ''),
        Stock: stock,
        Change: num_(body.change),
        Reason: text_(body.reason || 'manual update'),
        'Updated by': text_(body.actor || 'admin'),
        'Low stock alert': stock <= 3 ? 'yes' : 'no',
      },
    },
  ]);
  return { ok: true, written: written };
}

/* ═══════════════════════════ 10b. DEMO DATA (poori sheet test) ══════════════ */

/**
 * DEMO_* — test ke liye "asli user" jaisa data. Owner ne kaha: "jitni bhi sheet
 * hai, ek baar poora data se bhar do, har column, real user jaisa".
 *
 * Har demo row me DEMO ka nishaan hai (naam/note me), isliye asli data se alag
 * pehchana ja sakta hai aur `clearDemoData` se ek hi baar me hata bhi sakte hain.
 * Demo order numbers `NE-DEMO…` se shuru hote hain.
 */
var DEMO_CUSTOMERS = [
  { name: 'Demo — Priya Sharma', phone: '9876500011', email: 'priya.demo@example.com', address: '12, Civil Lines, Near Jain Mandir', city: 'Jaipur', state: 'Rajasthan', pincode: '302006' },
  { name: 'Demo — Anjali Verma', phone: '9876500012', email: 'anjali.demo@example.com', address: 'B-44, Sector 15, Near Metro', city: 'Noida', state: 'Uttar Pradesh', pincode: '201301' },
  { name: 'Demo — Ritu Agarwal', phone: '9876500013', email: 'ritu.demo@example.com', address: 'Flat 302, Lake View Apartments, Powai', city: 'Mumbai', state: 'Maharashtra', pincode: '400076' },
  { name: 'Demo — Neha Gupta', phone: '9876500014', email: 'neha.demo@example.com', address: 'House 8, Model Town, Near Bus Stand', city: 'Ludhiana', state: 'Punjab', pincode: '141002' },
  { name: 'Demo — Kavita Yadav', phone: '9876500015', email: 'kavita.demo@example.com', address: '22, Vaishali Nagar, Block C', city: 'Jaipur', state: 'Rajasthan', pincode: '302021' },
];

var DEMO_PRODUCTS = [
  { title: 'Creme Coloured Organza Suit', handle: 'creme-coloured-organza-suit', sku: 'ORGANZA-CREME-M', size: 'M', colour: 'Creme', price: 599, category: 'anarkali', image: 'https://noorethnicwear.in/images/brand/logo-desktop.png' },
  { title: 'Wine Silk Anarkali Set', handle: 'wine-silk-anarkali-set', sku: 'ANARK-WINE-L', size: 'L', colour: 'Wine', price: 649, category: 'anarkali', image: 'https://noorethnicwear.in/images/brand/logo-desktop.png' },
  { title: 'Sea Green Lehenga Choli', handle: 'sea-green-lehenga-choli', sku: 'LEH-SEAGREEN-XL', size: 'XL', colour: 'Sea Green', price: 699, category: 'lehenga', image: 'https://noorethnicwear.in/images/brand/logo-desktop.png' },
  { title: 'Rani Pink Sharara Set', handle: 'rani-pink-sharara-set', sku: 'SHARARA-PINK-S', size: 'S', colour: 'Rani Pink', price: 549, category: 'sharara', image: 'https://noorethnicwear.in/images/brand/logo-desktop.png' },
  { title: 'Ivory Chikankari Kurta Set', handle: 'ivory-chikankari-kurta-set', sku: 'CHIKAN-IVORY-XS', size: 'XS', colour: 'Ivory', price: 499, category: 'kurta', image: 'https://noorethnicwear.in/images/brand/logo-desktop.png' },
];

var DEMO_MESSAGES = [
  { subject: 'Order enquiry', message: 'Maine kal order kiya tha, delivery kab tak hogi? Shaadi ke liye chahiye.' },
  { subject: 'Sizing help', message: 'Mera bust 36 hai, M size theek rahega ya L lena chahiye? Height 5 foot 4.' },
  { subject: 'Replacement request', message: 'Suit mil gaya par size chhota hai — exchange ka process bata dijiye.' },
  { subject: 'Bulk / wholesale', message: 'Mujhe 20 pieces chahiye boutique ke liye. Wholesale rate milega?' },
  { subject: 'Other', message: 'Payment ho gaya par status pending dikha raha hai, screenshot bhej diya WhatsApp par.' },
];

/** Demo order number */
function demoOrderNumber_(index) {
  return 'NE-DEMO' + String(1000 + index);
}

/**
 * `seedDemoData` — har tab me **poora demo data** (har column bhara hua).
 * Owner ne maanga: "poori sheet real user jaise data se bhar do, test ke liye".
 *
 * `?action=seed&token=…` se bhi chalta hai (website/agent se trigger).
 */
function seedDemoData() {
  return guard_('seedDemoData', seedDemoData_);
}

function seedDemoData_() {
  // Pehle saare tabs + Settings ki default values pakki karo — owner ne kaha
  // "jitni bhi sheet hai, poore data se bhar do". Settings khaali reh jaata tha.
  try {
    setup_();
  } catch (setupError) {
    Logger.log('seedDemoData: setup_ skip — ' + setupError);
  }
  var rows = [];
  var stamp = istNow_();
  var iso = now_();

  DEMO_CUSTOMERS.forEach(function (customer, index) {
    var orderNumber = demoOrderNumber_(index + 1);
    var product = DEMO_PRODUCTS[index % DEMO_PRODUCTS.length];
    var second = DEMO_PRODUCTS[(index + 1) % DEMO_PRODUCTS.length];
    var qty = (index % 2) + 1;
    var secondQty = index % 2 === 0 ? 1 : 0;
    var subtotal = product.price * qty + (secondQty ? second.price : 0);
    var discount = index % 3 === 0 ? 50 : 0;
    var shipping = subtotal - discount >= 499 ? 0 : 49;
    var total = subtotal - discount + shipping;
    var paid = index < 3;
    var status = ['confirmed', 'shipped', 'delivered', 'placed', 'packed'][index];
    var paymentStatus = paid ? 'paid' : index === 3 ? 'pending' : 'processing';
    var courier = index === 1 ? 'Delhivery' : index === 2 ? 'Blue Dart' : '';
    var awb = index === 1 ? 'DL77120' + index : index === 2 ? 'BD55440' + index : '';
    var trackingUrl = awb ? 'https://www.delhivery.com/track/package/' + awb : '';
    var itemDetails = product.title + ' (' + product.size + ') x' + qty + (secondQty ? ' | ' + second.title + ' (' + second.size + ') x1' : '');

    rows.push({
      sheet: 'Orders',
      row: {
        Timestamp: iso, Event: 'order.placed', 'Order number': orderNumber,
        'Order status': 'placed', 'Payment status': 'pending', 'Payment method': 'prepaid',
        'Payment reference': '', 'UPI ID': '', Total: total, Subtotal: subtotal,
        Discount: discount, Coupon: discount ? 'DEMO50' : '', Items: qty + secondQty,
        'Item details': itemDetails, Customer: customer.name, Phone: customer.phone, Email: customer.email,
        Address: customer.address, City: customer.city, State: customer.state, Pincode: customer.pincode,
        'Tracking courier': '', AWB: '', 'Tracking URL': '',
        Notes: 'DEMO row — test data (clearDemoData se hataayein)', Source: 'demo', Device: 'mobile',
      },
    });
    rows.push({
      sheet: 'Orders',
      row: {
        Timestamp: iso, Event: paid ? 'payment.paid' : 'payment.pending', 'Order number': orderNumber,
        'Order status': status, 'Payment status': paymentStatus, 'Payment method': 'prepaid',
        'Payment reference': paid ? 'UTRDEMO' + (900000 + index) : '',
        'UPI ID': '', Total: total, Subtotal: subtotal,
        Discount: discount, Coupon: discount ? 'DEMO50' : '', Items: qty + secondQty,
        'Item details': itemDetails, Customer: customer.name, Phone: customer.phone, Email: customer.email,
        Address: customer.address, City: customer.city, State: customer.state, Pincode: customer.pincode,
        'Tracking courier': courier, AWB: awb, 'Tracking URL': trackingUrl,
        Notes: 'DEMO — payment ' + paymentStatus, Source: 'demo', Device: 'mobile',
      },
    });

    rows.push({
      sheet: 'OrderItems',
      row: {
        Timestamp: iso, 'Order number': orderNumber, Product: product.title, Handle: product.handle,
        SKU: product.sku, Size: product.size, Colour: product.colour, Quantity: qty,
        Price: product.price, 'Line total': product.price * qty, Category: product.category,
        'Image URL': product.image, Status: status,
      },
    });
    if (secondQty) {
      rows.push({
        sheet: 'OrderItems',
        row: {
          Timestamp: iso, 'Order number': orderNumber, Product: second.title, Handle: second.handle,
          SKU: second.sku, Size: second.size, Colour: second.colour, Quantity: secondQty,
          Price: second.price, 'Line total': second.price * secondQty, Category: second.category,
          'Image URL': second.image, Status: status,
        },
      });
    }

    rows.push({
      sheet: 'Payments',
      row: {
        Timestamp: iso, Event: 'payment.' + paymentStatus, 'Order number': orderNumber,
        'Order status': status, 'Payment status': paymentStatus, 'Payment method': 'prepaid',
        'Payment reference': paid ? 'UTRDEMO' + (900000 + index) : '', 'UPI ID': '',
        Total: total, Subtotal: subtotal, Discount: discount, Coupon: discount ? 'DEMO50' : '',
        Items: qty + secondQty, 'Item details': itemDetails, Customer: customer.name,
        Phone: customer.phone, Email: customer.email, Address: customer.address, City: customer.city,
        State: customer.state, Pincode: customer.pincode, 'Tracking courier': courier, AWB: awb,
        'Tracking URL': trackingUrl, Notes: 'DEMO payment row',
        'Verified by': paid ? 'admin (demo)' : '', 'Verified at': paid ? stamp : '',
      },
    });

    if (courier) {
      rows.push({
        sheet: 'Shipments',
        row: {
          Timestamp: iso, 'Order number': orderNumber, Courier: courier, AWB: awb,
          'Tracking URL': trackingUrl, Status: status, 'Expected delivery': '29-Oct-2026',
          Note: 'DEMO — pickup ho gaya, transit me', 'Updated by': 'demo',
        },
      });
    }

    if (paid) {
      var taxable = Math.round(total / 1.05);
      var gst = total - taxable;
      var interState = customer.state !== 'Rajasthan';
      rows.push({
        sheet: 'Invoices',
        row: {
          Timestamp: iso, 'Invoice number': 'INV-DEMO' + (100 + index), 'Order number': orderNumber,
          Type: 'gst', Customer: customer.name, Phone: customer.phone, Email: customer.email,
          GSTIN: '', Address: customer.address, State: customer.state, 'Taxable value': taxable,
          CGST: interState ? 0 : Math.round(gst / 2), SGST: interState ? 0 : Math.round(gst / 2),
          IGST: interState ? gst : 0, Shipping: shipping, Discount: discount, Total: total,
          Notes: 'DEMO — ' + (interState ? 'Inter-state (IGST)' : 'Intra-state (CGST+SGST)'),
        },
      });
    }

    rows.push({
      sheet: 'Checkout',
      row: {
        Timestamp: iso, Event: 'checkout.started', Step: 'details', 'Order number': '',
        Items: qty + secondQty, Subtotal: subtotal, Reason: '', Phone: customer.phone,
        Session: 'demo-' + (1000 + index), City: customer.city, State: customer.state, Pincode: customer.pincode,
      },
    });
    rows.push({
      sheet: 'Checkout',
      row: {
        Timestamp: iso, Event: 'order.placed', Step: 'review', 'Order number': orderNumber,
        Items: qty + secondQty, Subtotal: subtotal, Reason: '', Phone: customer.phone,
        Session: 'demo-' + (1000 + index), City: customer.city, State: customer.state, Pincode: customer.pincode,
      },
    });

    rows.push({
      sheet: 'Inventory',
      row: {
        Timestamp: iso, Product: product.title, Handle: product.handle, SKU: product.sku,
        Size: product.size, Stock: Math.max(0, 12 - index * 2), Change: 0 - qty,
        Reason: 'order ' + orderNumber + ' (DEMO)', 'Updated by': 'demo',
        'Low stock alert': Math.max(0, 12 - index * 2) <= 3 ? 'yes' : 'no',
      },
    });
  });

  DEMO_MESSAGES.forEach(function (message, index) {
    var customer = DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length];
    rows.push({
      sheet: 'Messages',
      row: {
        Timestamp: stamp, Name: customer.name, Email: customer.email, Phone: customer.phone,
        Subject: message.subject, Message: message.message,
        Status: index < 2 ? 'new' : 'replied', Replied: index < 2 ? '' : 'yes',
        'Replied at': index < 2 ? '' : stamp, 'Source page': '/pages/contact',
        'Message ID': 'demo-msg-' + (100 + index),
      },
    });
  });

  DEMO_CUSTOMERS.slice(0, 4).forEach(function (customer, index) {
    rows.push({
      sheet: 'Newsletter',
      row: {
        Timestamp: stamp, Email: customer.email,
        Source: index % 2 === 0 ? 'footer' : 'checkout', Status: 'subscribed',
      },
    });
  });

  var demoReviews = [
    { rating: 5, title: 'Fabric bahut accha', review: 'Organza ka fall bahut sundar hai, stitching bhi neat. Shaadi me pehna, sabne poochha kahan se liya.' },
    { rating: 5, title: 'Perfect fit', review: 'Size chart sahi hai, M mera exact fit hua. Colour photo jaisa hi hai.' },
    { rating: 4, title: 'Delivery time par', review: '3 din me mil gaya, packing acchi thi. Bas dupatta thoda chhota laga.' },
    { rating: 5, title: 'Value for money', review: 'Is price me itna accha suit — dobara order karungi.' },
  ];
  demoReviews.forEach(function (review, index) {
    var product = DEMO_PRODUCTS[index % DEMO_PRODUCTS.length];
    var customer = DEMO_CUSTOMERS[index % DEMO_CUSTOMERS.length];
    rows.push({
      sheet: 'Reviews',
      row: {
        Timestamp: stamp, Product: product.title, Handle: product.handle, Customer: customer.name,
        Rating: review.rating, Title: review.title, Review: review.review, Verified: 'yes',
        Status: index === 3 ? 'pending' : 'approved', 'Photo URL': '',
        'Order number': demoOrderNumber_(index + 1),
      },
    });
  });

  var demoCoupons = [
    { code: 'DEMO50', type: 'flat', value: 50, minOrder: 499, maxUses: 100, used: 12, active: true, expires: '31-Dec-2026', note: 'DEMO — flat ₹50 off' },
    { code: 'DIWALI10', type: 'percent', value: 10, minOrder: 999, maxUses: 500, used: 84, active: true, expires: '15-Nov-2026', note: 'DEMO — Diwali sale' },
    { code: 'EXPIRED5', type: 'percent', value: 5, minOrder: 0, maxUses: 50, used: 50, active: false, expires: '01-Jan-2026', note: 'DEMO — band coupon' },
  ];
  demoCoupons.forEach(function (coupon) {
    rows.push({
      sheet: 'Coupons',
      row: {
        Timestamp: stamp, Code: coupon.code, Type: coupon.type, Value: coupon.value,
        'Min order': coupon.minOrder, 'Max uses': coupon.maxUses, Used: coupon.used,
        Active: coupon.active ? 'yes' : 'no', Expires: coupon.expires, Note: coupon.note,
      },
    });
  });

  var demoAudit = [
    { action: 'settings_save', target: 'Settings', details: 'announcement + upi_id' },
    { action: 'order_update', target: demoOrderNumber_(2), details: 'shipped · Delhivery' },
    { action: 'invoice_save', target: 'INV-DEMO100', details: demoOrderNumber_(1) },
    { action: 'stock_update', target: 'creme-coloured-organza-suit', details: '-1 (order)' },
  ];
  demoAudit.forEach(function (entry) {
    rows.push({
      sheet: 'Audit',
      row: { Timestamp: stamp, Actor: 'demo', Action: entry.action, Target: entry.target, Details: entry.details, IP: '103.0.0.1' },
    });
  });

  rows.push({
    sheet: 'Errors',
    row: { Timestamp: stamp, Context: 'demo/sample', Message: 'DEMO — sample error row (asli error nahi)', Payload: '{"sample":true}', Version: CODE_VERSION },
  });

  var written = appendRows_(rows);
  refreshDashboard_();
  noteSync_('demo→sheet', 'all', written, 'ok', 'seedDemoData');
  Logger.log('✅ seedDemoData: wrote ' + written + ' demo rows.');
  Logger.log('   To remove them, run the `clearDemoData` function.');
  try {
    book_().toast('Demo data written ✔ (' + written + ' rows)', 'seedDemoData', 8);
  } catch (ignored) {}
  return { written: written, time: stamp };
}

/**
 * `clearDemoData` — sirf demo rows hataao (asli data safe).
 * Pehchan: DEMO / Demo — / NE-DEMO / demo-msg- / seedDemoData.
 */
function clearDemoData() {
  return guard_('clearDemoData', clearDemoData_);
}

function clearDemoData_() {
  var removed = 0;
  Object.keys(HEADERS).forEach(function (name) {
    if (name === 'Settings' || name === 'Dashboard') return;
    var sheet = sheet_(name);
    var last = sheet.getLastRow();
    if (last < 2) return;
    var values = sheet.getRange(2, 1, last - 1, Math.max(1, sheet.getLastColumn())).getValues();
    for (var i = values.length - 1; i >= 0; i -= 1) {
      var line = values[i].join(' | ');
      if (/DEMO|Demo —|demo-msg-|NE-DEMO|seedDemoData/i.test(line)) {
        sheet.deleteRow(i + 2);
        removed += 1;
      }
    }
  });
  refreshDashboard_();
  Logger.log('🧹 clearDemoData: removed ' + removed + ' demo rows.');
  try {
    book_().toast('Removed ' + removed + ' demo rows ✔', 'clearDemoData', 8);
  } catch (ignored) {}
  return removed;
}

/* ═══════════════════════════ 11. SELF-TEST (owner ke liye) ══════════════════ */

/**
 * Extensions → Apps Script → function `testAppend` → Run.
 * Do test rows likhta hai (Orders + Checkout) taaki owner ko turant dikhe ki
 * likhna kaam kar raha hai. Baad me in rows ko delete kar sakte hain.
 */
function testAppend() {
  return guard_('testAppend', testAppend_);
}

function testAppend_() {
  var stamp = istNow_();
  var written = appendRows_([
    {
      sheet: 'Orders',
      row: {
        Timestamp: stamp,
        Event: 'test.from_apps_script',
        'Order number': 'NE-TEST-' + Math.floor(Math.random() * 9000 + 1000),
        'Order status': 'test',
        'Payment status': 'pending',
        Customer: 'Apps Script test',
        Total: 499,
        Notes: 'test row — delete kar sakte hain',
        Source: 'apps-script',
      },
    },
    {
      sheet: 'Checkout',
      row: {
        Timestamp: stamp,
        Event: 'checkout.test',
        Step: 'test',
        Items: 1,
        Subtotal: 499,
        Reason: 'apps-script self test',
      },
    },
  ]);
  Logger.log('rows written: ' + written);
  book_().toast('Test rows written (' + written + ') ✔', 'testAppend', 6);
  return written;
}

/**
 * `testSelf` — poora check: kaun si sheet khul rahi hai, kitne tabs/rows, settings
 * padhi ja rahi hain ya nahi, aur write chal raha hai ya nahi. Log me dikhta hai.
 */
function testSelf() {
  return guard_('testSelf', testSelf_);
}

function testSelf_() {
  var report = { version: CODE_VERSION, time: now_(), checks: [] };
  function check(name, fn) {
    try {
      var value = fn();
      report.checks.push({ name: name, ok: true, value: value });
    } catch (error) {
      report.checks.push({ name: name, ok: false, error: String(error && error.message ? error.message : error) });
    }
  }

  check('sheet khul rahi hai', function () {
    return { name: book_().getName(), id: book_().getId() };
  });
  check('tabs', function () {
    return sheetCounts_().map(function (row) {
      return row.name + ':' + row.rows;
    });
  });
  check('settings padhi ja rahi hain', function () {
    var settings = readSettings_();
    return { keys: Object.keys(settings).length, whatsapp: settings.whatsapp || '', upi_id: settings.upi_id || '' };
  });
  check('write chal raha hai', function () {
    return appendRows_([
      { sheet: 'Audit', row: { Timestamp: istNow_(), Actor: 'testSelf', Action: 'self_test', Target: CODE_VERSION, Details: 'ok' } },
    ]);
  });

  Logger.log(JSON.stringify(report, null, 2));
  book_().toast('Self test: ' + report.checks.filter(function (c) { return c.ok; }).length + '/' + report.checks.length + ' pass', 'testSelf', 6);
  return report;
}

/**
 * Sheet ki backup (Drive me copy). Trigger se hafte me ek baar chalti hai.
 * Folder na mile to Drive ke root me copy banti hai.
 */
function backupNow() {
  return guard_('backupNow', backupNow_);
}

function backupNow_() {
  try {
    var book = book_();
    var name = 'Noor backup ' + Utilities.formatDate(new Date(), TIMEZONE, 'yyyy-MM-dd HHmm');
    var file = DriveApp.getFileById(book.getId());
    var copy = file.makeCopy(name);
    Logger.log('backup created: ' + copy.getUrl());
    noteSync_('script', 'backup', 1, 'ok', name);
    return copy.getUrl();
  } catch (error) {
    logError_('backupNow', error, null);
    return 'backup fail: ' + (error && error.message ? error.message : error);
  }
}

/* ───────────────────────── SHEET = DB (owner, R37) ─────────────────────────
 * Owner sheet me seedha edit kare to website turant wahi dikhati hai —
 * trends-sheets.gs wala "ek box me sab" pattern:
 *   • Orders!`Order status` cell badla → timeline row append
 *     (`order.status_sheet`) → site ka status + timeline + customer message
 *     update (placed / confirmed / packed / shipped / delivered / cancelled).
 *   • Messages!`Status` me "replied" / "done" / "closed" likha → `Replied` = YES
 *     + `Replied at` = abhi (marked-reply).
 * Simple trigger hai — install ki zaroorat nahi, sirf **user** edits par chalta
 * hai (script ke apne writes par nahi), aur error kabhi sheet nahi toda.
 */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var tab = e.range.getSheet();
    if (!tab || e.range.getRow() < 2) return;
    var head = headersOf_(tab);
    var column = head[e.range.getColumn() - 1];
    if (!column) return;
    var name = tab.getName();
    var row = e.range.getRow();

    if (name === 'Orders' && column === 'Order status') {
      var idCol = head.indexOf('Order number') + 1;
      var orderNumber = idCol ? text_(tab.getRange(row, idCol).getValue()) : '';
      var status = text_(e.value);
      if (!orderNumber || !status) return;
      appendRows_([
        {
          sheet: 'Orders',
          row: {
            Timestamp: now_(),
            Event: 'order.status_sheet',
            'Order number': orderNumber,
            'Order status': status,
            Notes: 'Sheet se status update (owner)',
            Source: 'sheet-edit',
          },
        },
      ]);
      return;
    }

    // R39: owner ne kisi order ka `Admin Note` badla → ek event row aur, taaki
    // timeline me dikhe aur site ka note-box turant (2s TTL) update ho.
    if (name === 'Orders' && column === 'Admin Note') {
      var noteIdCol = head.indexOf('Order number') + 1;
      var noteOrderNumber = noteIdCol ? text_(tab.getRange(row, noteIdCol).getValue()) : '';
      var noteText = text_(e.value);
      if (!noteOrderNumber || !noteText) return;
      var noteStatusCol = head.indexOf('Order status') + 1;
      appendRows_([
        {
          sheet: 'Orders',
          row: {
            Timestamp: now_(),
            Event: 'order.admin_note',
            'Order number': noteOrderNumber,
            'Order status': noteStatusCol ? text_(tab.getRange(row, noteStatusCol).getValue()) : '',
            'Admin Note': noteText,
            Notes: noteText,
            Source: 'sheet-edit',
          },
        },
      ]);
      return;
    }

    if (name === 'Messages' && column === 'Status') {
      var value = String(e.value || '').trim().toLowerCase();
      var repliedCol = head.indexOf('Replied') + 1;
      var atCol = head.indexOf('Replied at') + 1;
      if (!repliedCol) return;
      var replied = /repl|done|closed|answer|resolve/.test(value) ? 'YES' : 'NO';
      tab.getRange(row, repliedCol).setValue(replied);
      if (atCol) tab.getRange(row, atCol).setValue(replied === 'YES' ? now_() : '');
    }
  } catch (error) {
    // onEdit kabhi sheet na tode
  }
}

/** Daily dashboard refresh + weekly backup ke triggers laga do (ek hi baar). */
function installTriggers() {
  return guard_('installTriggers', installTriggers_);
}

function installTriggers_() {
  var existing = ScriptApp.getProjectTriggers();
  existing.forEach(function (trigger) {
    var handler = trigger.getHandlerFunction();
    if (handler === 'dailyRefresh' || handler === 'weeklyBackup') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('dailyRefresh').timeBased().atHour(21).everyDays(1).create();
  ScriptApp.newTrigger('weeklyBackup').timeBased().onWeekDay(ScriptApp.WeekDay.SUNDAY).atHour(2).create();
  book_().toast('Triggers installed: daily 9 PM dashboard + Sunday 2 AM backup ✔', 'installTriggers', 6);
  return true;
}

/** Trigger se chalta hai — Dashboard refresh + Sync note */
function dailyRefresh() {
  return guard_('dailyRefresh', function () {
    var rows = refreshDashboard_();
    noteSync_('script', 'Dashboard', rows || 0, 'ok', 'daily refresh');
    return rows;
  });
}

/** Trigger se chalta hai — hafte me ek backup */
function weeklyBackup() {
  return backupNow();
}

/** Zaroorat pade to triggers hata do */
function removeTriggers() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    var handler = trigger.getHandlerFunction();
    if (handler === 'dailyRefresh' || handler === 'weeklyBackup') ScriptApp.deleteTrigger(trigger);
  });
  return true;
}

/* ═══════════════════════════ 12. HTTP API — doGet ══════════════════════════ */

/**
 * Health report — `?action=health` (token ke bina bhi, browser se khulne layak).
 *
 * Public (bina token): version, tokenSet/tokenOk, sheetFound, sheetId, idMatch,
 * bound, upiSet, problems — diagnose ke liye kaafi, private kuch nahi.
 * Token match ho to extra: sheet ka naam/URL + tab-wise row counts.
 */
function healthReport_(authed, tokenGiven) {
  var report = {
    ok: true,
    version: CODE_VERSION,
    codeVersion: CODE_VERSION,
    time: now_(),
    timezone: TIMEZONE,
    tokenSet: Boolean(effectiveToken_()),
    tokenOk: Boolean(authed),
    sheetFound: false,
    sheetId: '',
    spreadsheetId: '',
    idMatch: false,
    bound: false,
    boundId: '',
    upiSet: false,
    settingsKeys: 0,
    sheets: [],
    spreadsheet: '',
    spreadsheetUrl: '',
    problems: [],
  };
  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      report.bound = true;
      report.boundId = active.getId();
    }
  } catch (ignored) {}
  try {
    var book = book_();
    report.sheetFound = true;
    report.sheetId = book.getId();
    // website ka selftest/admin `spreadsheetId` padhta hai — same value dono naam se
    report.spreadsheetId = report.sheetId;
    report.idMatch = report.sheetId === ((typeof SPREADSHEET_ID === 'string' && SPREADSHEET_ID) || SHEET_ID_FALLBACK);
    var settings = readSettings_();
    report.settingsKeys = Object.keys(settings).length;
    report.upiSet = Boolean(String(settings.upi_id || '').trim());
    if (authed) {
      report.spreadsheet = book.getName();
      report.spreadsheetUrl = book.getUrl();
      report.sheets = sheetCounts_();
    }
  } catch (error) {
    report.problems.push('Sheet access nahi: ' + String(error && error.message ? error.message : error));
  }
  if (!report.tokenSet) {
    report.problems.push('TOKEN set nahi — browser me kholiye: <webapp URL>?action=set_token&token=<Vercel GOOGLE_SHEETS_TOKEN>');
  } else if (!report.tokenOk && tokenGiven) {
    report.problems.push('Ye request ka token script ke token se match nahi hua (website ke writes fail honge — Vercel env aur script same rakhiye)');
  } else if (!report.tokenOk) {
    report.problems.push('Ye request anonymous thi (token nahi bheja) — website hamesha token bhejti hai, isliye ye line website ke liye problem nahi');
  }
  if (report.sheetFound && !report.upiSet) {
    report.problems.push('Settings tab me upi_id khaali hai — website par payment ruk jaayega; apna UPI ID bhariye');
  }
  if (!report.problems.length) report.problems.push('sab green ✔');
  return report;
}

/** HTML escape — panel me sheet/settings se aaya text safe rakho. */
function esc_(value) {
  return String(value === null || value === undefined ? '' : value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * R39: `/exec` browser me kholne par ek screen me poora sach — version, token,
 * sheet, UPI, problems + seedhe button (website / admin / sheet). Purana mega
 * script yahan poora admin dikhata tha; ab admin `admin_url` par hai aur ye
 * panel sirf script ki sehat dikhata hai (har line ka matlab: diagnose karo).
 */
function controlPanel_() {
  var report = healthReport_(false, false);
  var settings = {};
  try {
    settings = readSettings_();
  } catch (ignored) {}
  var storeUrl = String(settings.store_url || 'https://noorethnicwear.in');
  var adminUrl = String(settings.admin_url || '');
  var dot = function (good, label, detail) {
    return (
      '<div class="row"><span class="dot" style="background:' + (good ? '#22c55e' : '#ef4444') + '"></span>' +
      '<div><b>' + esc_(label) + '</b><br><span class="muted">' + esc_(detail) + '</span></div></div>'
    );
  };
  var problems = (report.problems || []).map(function (line) {
    return '<li>' + esc_(line) + '</li>';
  }).join('');
  var html = '' +
    '<!DOCTYPE html><html lang="hi"><head><meta charset="utf-8">' +
    '<title>Noor sheet panel · ' + esc_(report.version) + '</title>' +
    '<style>' +
    'body{font:14px/1.6 -apple-system,Segoe UI,Roboto,Arial,sans-serif;background:#faf8f5;color:#241d18;margin:0;padding:24px}' +
    '.card{max-width:560px;margin:0 auto;background:#fff;border:1px solid #e9dfd4;border-radius:12px;padding:20px 22px}' +
    'h1{font-size:18px;margin:0 0 2px}.sub{color:#8a8078;font-size:12px;margin:0 0 14px}' +
    '.row{display:flex;gap:10px;align-items:flex-start;padding:7px 0;border-top:1px solid #f4efe9}' +
    '.dot{width:10px;height:10px;border-radius:50%;margin-top:6px;flex:none}' +
    '.muted{color:#8a8078;font-size:12px;word-break:break-all}' +
    'ul{margin:8px 0 0;padding-left:18px;color:#8a3a2a;font-size:12.5px}' +
    '.btns{margin-top:16px;display:flex;flex-wrap:wrap;gap:8px}' +
    'a.btn{display:inline-block;border:1px solid #862222;color:#862222;text-decoration:none;font-size:12px;font-weight:600;padding:8px 14px;border-radius:8px}' +
    'a.btn.solid{background:#862222;color:#fff}' +
    '.hint{margin-top:14px;font-size:12px;color:#5c534b;background:#faf6f0;border:1px dashed #e0d5c8;border-radius:8px;padding:10px 12px}' +
    '</style></head><body><div class="card">' +
    '<h1>Noor Clothing — sheet control panel</h1>' +
    '<p class="sub">Apps Script ' + esc_(report.version) + ' · ' + esc_(report.time) + ' · timezone ' + esc_(report.timezone) + '</p>' +
    dot(report.sheetFound, 'Sheet', report.sheetFound ? ('ID ' + esc_(report.sheetId) + (report.idMatch ? ' (expected se match ✔)' : ' (expected se MATCH NAHI — adopt kariye)')) : 'sheet nahi mili — access/URL dekhiye') +
    dot(report.tokenSet, 'Token (script)', report.tokenSet ? 'set hai ✔ — website wale token se match website ke /api/sheet-health par dikhta hai' : 'set nahi — ?action=set_token&token=… chalaiye') +
    dot(report.upiSet, 'UPI (sheet Settings)', report.upiSet ? 'upi_id bhara hai ✔ — payment chalu' : 'upi_id khaali — payment page paused rahega') +
    (report.problems && report.problems.length && report.problems[0] !== 'sab green ✔' ? '<ul>' + problems + '</ul>' : '') +
    '<div class="btns">' +
    '<a class="btn solid" href="' + esc_(storeUrl) + '">Website kholo</a>' +
    (adminUrl ? '<a class="btn" href="' + esc_(adminUrl) + '">Admin panel</a>' : '') +
    '<a class="btn" href="' + esc_(storeUrl) + '/api/sheet-health">Site ka sheet-health</a>' +
    '</div>' +
    '<div class="hint">Order ke liye customer ko message dikhana ho to sheet ke <b>Orders</b> tab me us order ki row ka <b>Admin Note</b> column bhar dijiye — 2 second me order page par dikhega (khaali ho to default “Waiting for confirmation”). Status badalna ho to <b>Order status</b> column edit kariye.</div>' +
    '</div></body></html>';
  return HtmlService.createHtmlOutput(html)
    .setTitle('Noor sheet panel')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

/**
 * GET actions:
 *   public (token nahi):  settings (public keys) · version · ping · health · set_token · adopt(fresh)
 *   token-gated:          settings (poora) · recent · search · order · timeline · stats ·
 *                         dashboard · seed · clear-demo · health (poora)
 */
function doGet(e) {
  var params = (e && e.parameter) || {};
  var action = String(params.action || '');
  var authed = tokenOk_(params.token);

  // R39: browser se seedha /exec kholne par JSON nahi — chhota HTML control
  // panel (status + links). Website hamesha ?action=… bhejti hai, isliye uska
  // contract (settings/version/health/…) bilkul nahi badla.
  if (!action) return controlPanel_();

  // Token ek baar set karne ka URL — safety guard setToken_ ke andar hai.
  if (action === 'set_token') {
    return json_(setToken_(params.token, params.old));
  }

  // Script ko apni bound sheet par switch karo (SHEET_ID property) — fresh ya authed.
  if (action === 'adopt') {
    if (!authed && effectiveToken_()) {
      return json_({ ok: false, version: CODE_VERSION, error: 'unauthorized — token match nahi hua', fix: tokenFix_() });
    }
    var bound = null;
    try {
      bound = SpreadsheetApp.getActiveSpreadsheet();
    } catch (ignored) {}
    if (!bound) {
      return json_({ ok: false, version: CODE_VERSION, error: 'script kisi sheet se bound nahi — Sheet → Extensions → Apps Script se script banaiye, tabhi adopt chalega' });
    }
    var store = props_();
    if (!store) return json_({ ok: false, version: CODE_VERSION, error: 'Script Properties available nahi' });
    store.setProperty('SHEET_ID', bound.getId());
    return json_({
      ok: true,
      version: CODE_VERSION,
      adopted: { id: bound.getId(), name: bound.getName(), url: bound.getUrl() },
      note: 'Ab website isi sheet ko padhegi/usme likhegi.',
    });
  }

  /**
   * Public actions — website ko settings token set hone se pehle bhi padhni hai,
   * aur owner `?action=health` browser me khol kar khud diagnose kar sakta hai.
   */
  var isPublic = action === 'settings' || action === 'version' || action === 'ping' || action === 'health';
  if (!isPublic && !authed) {
    return json_({ ok: false, version: CODE_VERSION, error: 'unauthorized — token match nahi hua', fix: tokenFix_() });
  }

  try {
    if (action === 'settings') {
      var all = readSettings_();
      if (authed) return json_({ ok: true, version: CODE_VERSION, settings: all, time: now_() });
      var pub = {};
      PUBLIC_SETTING_KEYS.forEach(function (key) {
        if (all[key] !== undefined) pub[key] = all[key];
      });
      return json_({ ok: true, version: CODE_VERSION, settings: pub, public: true, time: now_() });
    }

    if (action === 'version') {
      return json_({ ok: true, version: CODE_VERSION, time: now_() });
    }

    if (action === 'ping') {
      return json_({ ok: true, pong: true, version: CODE_VERSION, time: now_() });
    }

    if (action === 'health') {
      return json_(healthReport_(authed, Boolean(params.token)));
    }

    if (action === 'recent' || action === 'rows' || action === 'sheet') {
      var name = String(params.sheet || 'Orders');
      var limit = Math.min(200, Math.max(1, Number(params.limit || 20)));
      if (!HEADERS[name]) return json_({ ok: false, error: 'unknown sheet: ' + name });
      return json_({ ok: true, sheet: name, rows: recentRows_(name, limit), time: now_() });
    }

    if (action === 'search') {
      var searchSheet = String(params.sheet || 'Orders');
      var column = String(params.column || 'Order number');
      var value = String(params.value || params.q || '');
      if (!HEADERS[searchSheet]) return json_({ ok: false, error: 'unknown sheet: ' + searchSheet });
      if (!value) return json_({ ok: false, error: 'value chahiye' });
      return json_({
        ok: true,
        sheet: searchSheet,
        column: column,
        rows: findRows_(searchSheet, column, value, Math.min(100, Number(params.limit || 20))),
      });
    }

    if (action === 'order') {
      var story = orderStory_(params.orderNumber || params.order || '');
      if (!story) return json_({ ok: false, error: 'order nahi mila' });
      return json_({ ok: true, order: story });
    }

    /**
     * Tracking timeline — order number + registered mobile se.
     *   ?action=timeline&order=NE-XXXX&phone=98XXXXXXXX
     * (site ka tracking DB se chalta hai; ye sheet se hi jawab deta hai — owner
     *  ke self-test aur DB-down fallback ke liye.)
     */
    if (action === 'timeline' || action === 'order_status' || action === 'tracking') {
      return json_(timeline_(params.order || params.orderNumber || '', params.phone || params.mobile || ''));
    }

    if (action === 'stats') {
      return json_({ ok: true, stats: stats_() });
    }

    if (action === 'dashboard') {
      var rows = refreshDashboard_();
      return json_({ ok: true, dashboardRows: rows, stats: stats_() });
    }

    // demo data (test ke liye) — token ke bina nahi chalta
    if (action === 'seed') {
      return json_({ ok: true, seeded: seedDemoData_() });
    }

    if (action === 'clear-demo') {
      return json_({ ok: true, removed: clearDemoData_() });
    }

    return json_({ ok: false, error: 'unknown action: ' + action });
  } catch (error) {
    logError_('doGet/' + action, error, params);
    var getMessage = String(error && error.message ? error.message : error);
    return json_({
      ok: false,
      version: CODE_VERSION,
      error: getMessage,
      hint: /permission|access/i.test(getMessage)
        ? 'Sheet → Share → ' + (executingEmail_() || 'script ka account') + ' → Editor. Phir `setup` Run kariye.'
        : undefined,
    });
  }
}

/* ═══════════════════════════ 13. HTTP API — doPost ══════════════════════════ */

/**
 * POST body (JSON, token har call me):
 *   { token, action: "append",  rows: [{ sheet, row }] }        ← website ka main raasta
 *   { token, action: "settings_save", settings: {…} }           ← admin panel
 *   { token, action: "order_update", orderNumber, status, courier, awb, trackingUrl, note }
 *   { token, action: "invoice_save", invoiceNumber, orderNumber, taxable, cgst, sgst, igst, total }
 *   { token, action: "stock_update", handle, size, stock, change, reason }
 *   { token, action: "coupon_save", code, type, value, minOrder, maxUses, active }
 *   { token, action: "review_add", product, handle, customer, rating, review, verified }
 *   { token, action: "subscribe", email }
 *   { token, action: "message_status", id, status: "replied" | "handled" }
 *   { token, action: "dashboard" }   { token, action: "setup" }   { token, action: "repair" }
 */
function doPost(e) {
  var body = {};
  try {
    body = JSON.parse((e && e.postData && e.postData.contents) || '{}');
  } catch (error) {
    return json_({ ok: false, version: CODE_VERSION, error: 'invalid json' });
  }
  if (!tokenOk_(body.token)) {
    return json_({ ok: false, version: CODE_VERSION, error: 'unauthorized — token match nahi hua', fix: tokenFix_() });
  }

  var action = String(body.action || '');
  try {
    if (action === 'append' || action === 'appendMany') {
      var rows = Array.isArray(body.rows) ? body.rows : body.row ? [{ sheet: body.sheet, row: body.row }] : [];
      if (!rows.length) return json_({ ok: false, error: 'no rows' });
      if (rows.length > MAX_ROWS_PER_CALL) rows = rows.slice(0, MAX_ROWS_PER_CALL);
      var written = appendRows_(rows);
      var sheetNames = {};
      rows.forEach(function (row) {
        sheetNames[row.sheet || 'Orders'] = true;
      });
      noteSync_('website→sheet', Object.keys(sheetNames).join(','), written, 'ok', '');
      return json_({ ok: true, written: written, time: now_() });
    }

    if (action === 'settings_save') {
      var count = writeSettings_(body.settings || {});
      noteAudit_(body.actor || 'admin', 'settings_save', 'Settings', String(count) + ' keys');
      return json_({ ok: true, written: count, settings: readSettings_() });
    }

    if (action === 'order_update') {
      var result = orderUpdate_(body);
      if (result.ok) noteAudit_(body.actor || 'admin', 'order_update', body.orderNumber || '', body.event || '');
      return json_(result);
    }

    if (action === 'invoice_save') {
      var invoice = saveInvoice_(body);
      if (invoice.ok) noteAudit_(body.actor || 'admin', 'invoice_save', body.invoiceNumber || '', body.orderNumber || '');
      return json_(invoice);
    }

    if (action === 'stock_update') {
      var stock = stockUpdate_(body);
      if (stock.ok) refreshDashboard_();
      return json_(stock);
    }

    if (action === 'coupon_save') {
      return json_(upsertCoupon_(body));
    }

    if (action === 'review_add') {
      var review = addReview_(body);
      if (review.ok) refreshDashboard_();
      return json_(review);
    }

    if (action === 'subscribe') {
      return json_(subscribe_(body.email, body.source));
    }

    if (action === 'message_status') {
      var id = String(body.id || '').trim();
      if (!id) return json_({ ok: false, error: 'id chahiye' });
      var status = String(body.status || 'replied').toLowerCase();
      var updated = updateWhere_('Messages', 'Message ID', id, {
        Status: status,
        Replied: status === 'replied' ? 'yes' : 'no',
        'Replied at': status === 'replied' ? istNow_() : '',
      });
      return json_({ ok: updated > 0, updated: updated });
    }

    if (action === 'dashboard') {
      var dashboardRows = refreshDashboard_();
      return json_({ ok: true, dashboardRows: dashboardRows, stats: stats_() });
    }

    if (action === 'seed') {
      return json_({ ok: true, seeded: seedDemoData_() });
    }

    if (action === 'clear_demo') {
      return json_({ ok: true, removed: clearDemoData_() });
    }

    if (action === 'setup') {
      var created = setup();
      return json_({ ok: true, version: CODE_VERSION, created: created });
    }

    if (action === 'repair') {
      return json_({ ok: true, fixed: repairHeaders() });
    }

    if (action === 'test') {
      return json_({ ok: true, written: testAppend() });
    }

    return json_({ ok: false, error: 'unknown action: ' + action });
  } catch (error) {
    logError_('doPost/' + action, error, { action: action });
    var postMessage = String(error && error.message ? error.message : error);
    return json_({
      ok: false,
      version: CODE_VERSION,
      error: postMessage,
      hint: /permission|access/i.test(postMessage)
        ? 'Sheet → Share → ' + (executingEmail_() || 'script ka account') + ' → Editor. Phir `setup` Run kariye.'
        : undefined,
    });
  }
}

/* ═══════════════════════════ 14. OWNER CHEAT-SHEET ══════════════════════════
 *
 * Sheet me kabhi kuch toot jaye to:
 *   • `seedDemoData` → har tab me poora demo data (test) · `clearDemoData` → hataao
 *   • `createOwnSheet` → isi account me **nayi sheet** banao aur website wahi use kare
 *   • `formatAll`    → columns ki width/format dobara set karo (manually kaam karne me aasan)
 *   • `whoAmI`       → kaun sa Google account chal raha hai + sheet mil rahi hai?
 *   • `doctor`       → poora health check (permission error me sabse pehle yahi)
 *   • `testSelf`     → poora check, log me jawab
 *   • `setup`        → missing tabs/headers/settings add
 *   • `repairHeaders`→ sirf header repair
 *   • `testAppend`   → 2 test rows
 *   • `refreshDashboard` ke liye `dailyRefresh` ya `?action=dashboard`
 *   • `backupNow`    → Drive me copy
 *   • `installTriggers` → daily 9 PM dashboard + Sunday backup
 *
 * Websity se check: <webapp URL>?action=health&token=<TOKEN>
 * Kuch bhi "purana" lag raha ho to: Deploy → Manage deployments → ✏️ →
 * Version: **New version** → Deploy. (Sirf Ctrl+S kaafi nahi hota.)
 * ═════════════════════════════════════════════════════════════════════════════ */
```
