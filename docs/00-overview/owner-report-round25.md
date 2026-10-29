# Round 25 — aapke 5 sawaalon ka seedha jawab

_25 Oct 2026 · sab kuch live site par check karke likha gaya hai_

---

## 1. "Ye render nahi ho raha" / domain

| Cheez | Sach |
| --- | --- |
| `https://noorethnicwear.in` | **Aapka nahi hai.** Wo ek purana Shopify store hai (kisi aur ka). Isliye waha aapko purani site dikhti hai, hamari nahi. |
| Hamari asli site | **https://noor-ethnic-wear.vercel.app** (abhi yahi chal rahi hai — 446 products, order, payment, invoice, tracking sab) |
| Admin panel | **https://noor-admin.vercel.app** (login: `admin@noorethnicwear.in`, password Vercel env `ADMIN_PASSWORD` me) |
| Maine domain change kiya? | **Nahi.** Jab tak aap apna domain na batayein, kuch nahi chheda. `ekguru.in` aapke Vercel account me pada hai par wo bhi store ka nahi hai. |

**Aapko kya karna hai:** apna domain naam bataiye (jo aapne khareeda ho). Uske baad main
Vercel me add karke DNS steps de dunga — 10 minute ka kaam. Pehle domain kharidna hai to
`.com` ~₹900/saal (Hostinger/GoDaddy/Namecheap).

---

## 2. "Message kaam nahi kar raha" — ✅ fix ho gaya

Contact form (`/pages/contact` → **Send us a message**) ab **database me save ho raha hai**:

```json
"message": { "ok": true, "rowInDb": true, "dbCount": 3, "sheetMirror": false }
```

- Message DB me: **3 messages** saved (live count).
- Jo toota hua tha: WhatsApp button ka link `wa.me/` (country code ke bina) —
  WhatsApp usse "invalid number" bolta tha. Ab `wa.me/` — **8/8 links sahi**
  (contact page par test kiya).
- Sheet me message isliye nahi ja raha kyunki Apps Script purana code chala raha hai (point 3).

---

## 3. "Sheet kaam kar rahi hai? data save ho raha?"

**Aadha hai.** Website se data **database me** ja raha hai, par **sheet me ek bhi row nahi gayi**.

| Check | Result |
| --- | --- |
| Sheet ke tabs (`Orders`, `Payments`, `Messages`, `Checkout`, `Audit`) | sab me **sirf header row**, 0 data rows |
| Vercel → Apps Script request | pahunch rahi hai (HTTP 200, token sahi) |
| Script ka jawab | `{"ok":false,"error":"ReferenceError: SPREADSHEET_ID is not defined"}` |
| Matlab | aapke Apps Script me **purana/aadha code** chal raha hai — *New version* deploy nahi hua |
| Website ka database | orders **53**, checkout events **33**, messages **3** — sab safe |

### Fix — 60 second (sirf ye 3 step)

1. Sheet → **Extensions → Apps Script** → `Code.gs` ka **poora code select karke delete** kariye.
2. `docs/00-overview/apps-script-code.md` (ya `scripts/google-apps-script/noor-sheets.gs`) se
   **poora naya code** copy karke paste → **Ctrl+S**.
   Token `CHANGE-ME-noor-token` **na badliye** (Vercel me wahi set hai).
3. **Deploy → Manage deployments → ✏️ pencil → Version: `New version` → Deploy.**
   *Sirf Ctrl+S se purana code hi chalta rehta hai — ye step hi asli fix hai.*

Agar "Sheet khul nahi rahi" error aaye → sheet → **Share** → `owner ka apna Google account` →
**Editor** → Send (sirf ek baar).

**Verify (aap khud):** `https://noor-ethnic-wear.vercel.app/api/sheet-selftest?key=lk-st-9f3k2m-7hq4rt-2026`
→ `book.codeVersion: "r25-1"`, `write.ok: true`, `book.match: true`.

---

## 4. "Saare site ke function work nahi kar rahe" — ✅ ab sab pass

Production par poora automatic audit chalaya (`Live site audit` GitHub workflow):

| Test | Kya check karta hai | Result |
| --- | --- | --- |
| `smoke.mjs` | home, collection, product, reviews, search, cart, checkout, order create, pay page, **GST invoice PDF**, track order, contact form, newsletter, admin APIs | ✅ pass |
| `links.mjs` | header/footer/collections ka har internal link (40 pages) | ✅ 0 broken |
| `round16.mjs` | stock guard, order-not-found, size guide, review trust | ✅ pass |
| `round23.mjs` | state↔pincode guard, order page speed, payment claim, WhatsApp CTA | ✅ pass |

Aage jab bhi test karana ho: commit message me `[audit]` likhne par ye khud chal jaata hai.

---

## 5. Free plan — 1 mahina+ chalega, koi paisa nahi

| Service | Plan | Free limit | Hum kitna use kar rahe hain |
| --- | --- | --- | --- |
| **Vercel** (site + admin) | Hobby | 100 GB bandwidth/mahina, 100k function calls | abhi ~1% bhi nahi |
| **GitHub** (code + Actions) | Free | public repo par Actions **unlimited** | audit daily chal sakta hai |
| **Supabase / Postgres** | Free | 500 MB database | 53 orders = ~1 MB |
| **Google Sheets + Apps Script** | Free | 15 GB Drive, 20k requests/din | sheet me likhna free |
| **Domain** | — | ₹800–1000/saal (ye ek hi kharch) | — |

Limit kab padegi: ~10,000+ order/mahina, ya 100 GB se zyada video/image traffic, ya 500 MB
se zyada data. Us waqt tak Vercel Pro ($20) ka option hai — abhi zaroorat nahi.

---

## Is round me code me kya badla

| File | Kya |
| --- | --- |
| `scripts/google-apps-script/noor-sheets.gs` | `CODE_VERSION = 'r25-1'` (pata chale naya code chala), `book_()` ReferenceError-proof, error me "Editor access dijiye" hint |
| `apps/web/src/lib/google-sheets.ts` | Apps Script fail → published CSV fallback; settings write me `{ok:false}` ko fail maana |
| `apps/web/src/app/api/sheet-selftest/route.ts` | `&stats=1` → DB counts; `book.codeVersion` |
| `apps/web/src/lib/phone.ts` | WhatsApp number me country code (91) — `wa.me/` |
| `tests/unit/apps-script.test.ts` | owner ki galti (SPREADSHEET_ID line delete) simulate karke test — **120 tests pass** |
| `.github/workflows/live-audit.yml` | poora live audit ek command me |
| `.github/workflows/keep-warm.yml` | 10 min me 4 halki request → cold start kam, page fast |

---

## 🔧 25 Oct (shaam) — "message kaam nahi kar raha" ke 3 asli bug (fix ho gaye)

| # | Bug | Kya hota tha | Fix |
| --- | --- | --- | --- |
| 1 | Contact form sheet mirror `void promise` se bhejta tha | Vercel response ke baad function freeze → **sheet me row kabhi nahi jaati** (DB me chala jaata) | `after()` (Next.js) — response ke baad bhi kaam poora hota hai |
| 2 | Sheet ka jawab HTML error page aane par bhi "success" | Admin/owner ko lagta "mirror ho gaya", asal me kuch nahi | ab JSON na aaye to **fail** (log + `false`) |
| 3 | Postgres pooler: `EMAXCONNSESSION max clients reached` | DB connection limit khatam → order page / contact form / UTR **500** ("kuch bhi kaam nahi kar raha") | pool 1 connection, 1s idle, **transaction-mode pooler (6543)**, pool reset + 5 retries |

Saath me:

- **Admin → Messages** me ab **New / Replied / All** tabs hain (count ke saath) — naya message
  default view me sabse upar.
- Admin aur storefront ka `ADMIN_API_TOKEN` **same** set kar diya (pehle mismatch ho sakta tha →
  admin me message dikhta hi nahi).
- Saare WhatsApp links ab `wa.me/91XXXXXXXXXX` (country code ke bina link invalid hota tha).
- DB down hone par bhi form **kabhi chup-chaap fail nahi** hota — error + WhatsApp/email
  fallback dikhta hai.
