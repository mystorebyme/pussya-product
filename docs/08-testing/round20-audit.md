# Round 20 — colour/style merge, GST invoice seller block, 3-step checkout

Date: 2026-10-25 · Branch: `arena/f713eef1-tannu-product`

## 1. "Same product, multiple colours" — 49 duplicate listings merge

Pehle 49 listings ka title same tha, isliye har ek ko `— Edition 2`, `— DKB-265` jaisa suffix
de kar unique kiya gaya tha. Ab unhe **ek product, multiple options** me merge kar diya hai.

| | Pehle | Ab |
| --- | --- | --- |
| Product URLs | 446 | 446 (koi URL nahi toota) |
| Listing cards (grid) | 446 | **388** |
| Colour/style groups | 13 | **42** |
| Titles | 446 unique | 446 unique |

Kaise:

- `scripts/build-catalog.mjs` me naya pass: **same-title merge** — ek hi title + category ke
  listings ek `colourGroup` me jaate hain. Label priority: asli colour → style code (`DKB-265`)
  → `Style 1/2/3…`.
- Representative (sabse zyada photos wala) clean title ke saath listing par dikhta hai; baaki
  options PDP ke swatches se khulte hain ("Colour / style: Style 2").
- Cards duplicate nahi dikhte (server + static preview dono me same behaviour).
- Ye mapping build script me hai, isliye har catalogue sync par bhi merge bana rahega.

## 2. GST invoice — seller address + GSTIN (sirf admin)

Owner ne kaha: GST invoice ke liye seller details wahi banayega — isliye ye values **admin panel →
Settings** me hain, website par kahin nahi dikhtin (public `/api/settings` me bhi nahi).

- Naye fields: `sellerName`, `sellerAddress`, `sellerState`, `GSTIN` (Settings DB me save).
- Invoice (customer ka PDF/print + admin ka manual invoice) inhi values se banta hai; GSTIN khaali
  ho to invoice par **"GSTIN pending"** chhapta hai — koi fake number nahi.
- **Fake data hataya:** admin me pehle `27AAAAA0000A1Z5` (dummy GSTIN) aur "Noor Ethnic Wear · India"
  hard-coded tha — ab hata diya, address missing ho to Settings ka link dikhta hai.
- `sellerState` se CGST+SGST vs IGST decide hota hai (place of supply).

Envs (`SELLER_NAME`, `SELLER_ADDRESS`, `SELLER_GSTIN`, `SELLER_STATE`) sirf fallback hain — asli
source admin Settings hai.

## 3. Checkout — 3 steps (address aur payment alag)

```
1 · Delivery details  →  2 · Review  →  3 · Payment (alag page /orders/<NE-…>/pay)
```

- Step indicator har step par dikhta hai.
- Step 1 me sirf delivery details (+ pincode serviceability check); "Continue to review".
- Step 2 read-only review (naam, address, items, total) + "Edit" — order sirf yahan se place hota hai.
- Step 3 = payment page (UPI QR + UPI ID + UTR). **Checkout par UPI/QR kabhi nahi.**
- Order number payment page par hi banta/dikhta hai; payment confirm hone par hi order confirm.

## 4. Tests

| Suite | Result |
| --- | --- |
| Unit (`npm run test:unit`) | **93 / 0** (4 naye: checkout 3-step guard) |
| Integration | 40 / 0 |
| DB | 9 / 0 |
| Payments E2E (local) | 27 / 0 |
| Smoke · Links · Responsive · Breakpoints · Round16 | 87 · 40 · 42 · 48 · 37 — sab 0 fail |
| Typecheck (web + admin) · Build (web + admin) | 0 errors · success |
| Catalogue verify | `catalog ok` |

## 5. Pending (sirf owner ke paas)

- **Domain** `noorethnicwear.in` → Vercel DNS + `NEXT_PUBLIC_SITE_URL` update.
- **Mail ID** — email bhejne ka setup (Resend/SMTP keys) jab aap decide karein.

## 6. Production verification (live, `noor-ethnic-wear.vercel.app`)

| Check | Result |
| --- | --- |
| Vercel deploy `dpl_zyECRuCg3tfSipgLB1zd7ggbXNPc` (prod, sha `d116230`) | **READY**, alias `noor-ethnic-wear.vercel.app` |
| `/api/health` | `status ok · products 446 · ordersStore postgres · db up` |
| `/api/products?limit=1` → `total` | **388** listing cards (446 URLs intact) |
| PDP `/products/black-cosmo-slit-anarkali-premium-suit-set` | "Colour / style: **Black** (2 available)" + swatches `Black` / `Style 1` |
| PDP price | Rs. 549 (owner-approved), "You save Rs. 1,281" |
| Live payment + tracking workflow (`live-payments.yml`, run 40125338823) | **21 / 0** — order place → pay page → pending → UTR → processing → tracking, unknown order → not-found |
| CI (`ci.yml`, run 40125342883) | success |

## 7. Title polish (automated junk hataya)

Catalogue merge ke baad bache hue "scraped" title bugs fix kiye — 18 titles badle, counts same
(446 products / 388 cards / 42 groups / koi duplicate title nahi):

| Pehle | Ab |
| --- | --- |
| `Premiumreadymadeanarkalisuitset [3 Pis]` | `Premium Readymade Anarkali Suit Set 3 Pieces` |
| `Trendinganarkalisuitset [3 Pis]` | `Trending Anarkali Suit Set 3 Pieces` |
| `PremiumAnarkali Suit Set [3 PIS] 6122` | `Premium Anarkali Suit Set 3 Pieces 6122` |
| `Off whiteTrendy Anarkali Suit Set` | `Off White Trendy Anarkali Suit Set` |
| `Eid Special Premium Readymade off white Anarkali SuitSe 6115` | `… Off White Anarkali Suit Set 6115` |
| `Hazel's Anarkali PartyWear Suit Set` | `Hazel's Anarkali Party Wear Suit Set` |
| `… Anarkali Suit Set [Sleeves Fabric Attached]` (5 titles) | bracket hata diya |
| `Manvi's White … Suit Set — Edition 2` | `… Suit Set — Georgette` (fabric suffix) |

Rules (`scripts/build-catalog.mjs`):

- **Chipke hue words** (`GLUED_WORDS` se poora-token segmentation) — sirf tab todta hai jab token
  poora known words me divide ho, isliye `Sunset`/`Suitcase` jaisa asli word nahi todta.
- `[3 Pis]` / `[3 PIS]` → `3 Pieces`; `[Sleeves Fabric Attached]` → hata diya.
- `off white` → `Off White`, `SuitSe` → `Suit Set`.
- Trailing supplier code (`6122`, `6129`) **rakha** gaya — wahi do alag designs ko alag rakhta hai
  (same title, alag fabric/price/photos; unhe merge karna galat hota).
- Duplicate title pass ka suffix: colour → style code → **fabric** → product type → `Edition N`
  (last resort). Group meta titles representative ke final title se sync.

### 7.1 Spelling fixes (source store ke typos)

| Pehle | Ab | Kitne |
| --- | --- | --- |
| `Waite` | `White` | 3 |
| `Fux` | `Fox` (`Fox Georgette` fabric) | 2 |
| `Plazoo` / `Plazo` | `Palazzo` | 1 + 3 |

Isi se do listing aur merge hui (`Waite…` / `White…` ek hi design the): ab
**446 products / 387 cards / 43 groups**. Koi URL nahi toota, duplicate title 0.
