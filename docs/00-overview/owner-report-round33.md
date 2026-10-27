# Round 33 — naya domain `noorethnicwear.in` + checkout ka sahi flow

Date: 26 Oct 2026 · Branch: `arena/f713eef1-tannu-product` · Live: **`dpl_BcgUzFCWmtbxAWER6VE5zPDwXKym`** (`9704b3b`)

---

## 1. Aapka domain site me lag gaya (code + Vercel)

| Cheez | Ab |
|---|---|
| Website | **https://noorethnicwear.in** |
| `www` | https://www.noorethnicwear.in → apex par 308 redirect |
| Admin panel | **https://admin.noorethnicwear.in** |
| Backup | `noor-ethnic-wear.vercel.app`, `noor-admin.vercel.app` (chalte rahenge) |

Kya-kya apne aap naye domain par hai: canonical tag, `og:url`, **sitemap.xml (467 URLs)**, robots.txt,
product/breadcrumb schema, WhatsApp order message ka product link, invoice links, UPI return URL,
traffic tracking ki "internal" pehchan, privacy/terms policies ka naam.

Code: `apps/web/src/lib/domain.ts` (`CANONICAL_ORIGIN`), `apps/web/src/config/site.ts`,
`apps/web/src/lib/api-base.ts`, `apps/web/src/lib/traffic-format.ts`.
Vercel env bhi set: `NEXT_PUBLIC_SITE_URL=https://noorethnicwear.in`,
`CORS_ALLOWED_ORIGINS` (naya + www + admin + purane URLs), admin ke `STORE_API_URL` /
`NEXT_PUBLIC_STORE_URL` / `NEXT_PUBLIC_STOREFRONT_URL`.

### ⚠️ Sirf ek kaam baaki — DNS (2 minute)

Domain ke nameservers **Cloudflare** ke hain, par **koi record nahi** hai — isliye
`noorethnicwear.in` abhi nahi khul raha (Vercel ne domain verify kar liya hai).

Cloudflare → DNS → Records me **teen record** add kariye:

| Type | Name | Value | Proxy |
|---|---|---|---|
| `A` | `@` | `216.198.79.1` | **DNS only (grey)** |
| `CNAME` | `www` | `1f2fa7f03b754074.vercel-dns-017.com` | DNS only |
| `CNAME` | `admin` | `1f2fa7f03b754074.vercel-dns-017.com` | DNS only |

> Orange cloud (proxy) ON rakha to Vercel SSL me dikkat aayegi — pehle grey rakhiye.
> Record add hone ke 1–5 minute baad site domain par khul jaayegi (Vercel auto SSL).

---

## 2. Checkout ka flow (bilkul jaisa aapne bola)

```
1) Address (Delivery)  →  2) Review  →  3) Payment (alag page)
```

- Checkout karte hi **pehle address**, phir **review** (items + address + total), phir
  **payment** ka alag page — payment ka UPI/QR checkout par kabhi nahi aata.
- **Payment se back** → seedha **review (step 2)** par, address form dobara nahi:
  - payment page par upar **"← Review order"** button (`back-to-review`).
  - **browser ka back button** bhi review par hi laata hai (history me review URL rakha jaata hai).
  - Review me items/address/amount wapas dikhte hain (order ka snapshot `sessionStorage` me,
    tab band hone par khud mit jaata hai — koi payment detail store nahi hoti).
  - Review se aage: **"Continue to payment · ₹499"** → wahi order ka payment page (naya order
    nahi banta, duplicate ka koi risk nahi).

---

## 3. Verification (sab chalaya)

| Check | Result |
|---|---|
| `npm test` (unit) | **209 pass / 0 fail** (naye 13 tests: domain + checkout back) |
| payments e2e | **59 / 0** — payment page par `← Review order` link + no invoice |
| smoke · round16 · responsive · breakpoints · links | 85 · 39 · 43 · 48 · 45 pages — sab 0 fail |
| typecheck (web + admin) · lint · repo-audit | clean · 0 errors · gates ✅ |
| Live | `/api/health` → `commit: 9704b3b`, `db: up`, 446 products; sitemap ke saare URLs `noorethnicwear.in` par; pay page par `← Review order` live |

**Deploy:** storefront `dpl_BcgUzFCWmtbxAWER6VE5zPDwXKym` (PROMOTED), admin `dpl_DqLMhTYqfsL52gpGvgokFP4bqdYK` (PROMOTED).

> Ek build beech me fail hua tha — DB ka `statement timeout` (prerender `/` 60s se zyada le raha tha).
> Code ki galti nahi thi; dobara deploy karte hi READY ho gaya.

---

## 4. Aage (aapke batane par)

- Nav/footer/WhatsApp ke sabhi link **noorethnicwear.in** par automatically hain.
- Google Search Console me naya property `noorethnicwear.in` + sitemap submit karna
  (main kar sakta hoon jab aap kahein — GSC verification code repo me pehle se hai).
- Purane Vercel URLs ko domain par redirect karna ho to bata dein (abhi dono chal rahe hain,
  SEO canonical naye domain par hai).
