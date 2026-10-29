# Domain live: `noorethnicwear.in` (R33)

Owner ne domain khareed liya — ab **poori site isi domain par** chalti hai.
Purana `noor-ethnic-wear.vercel.app` sirf backup URL hai (kaam karta rahega, par
canonical/SEO me nahi).

## 1. Kaun si URL kahan hai

| Kaam | URL |
| --- | --- |
| Website (customer) | **https://noorethnicwear.in** |
| `www` | https://www.noorethnicwear.in → apex par 308 redirect |
| Admin panel | **https://admin.noorethnicwear.in** |
| Backup (Vercel) | `noor-ethnic-wear.vercel.app`, `noor-admin.vercel.app` |
| GitHub Pages preview | `mystorebyme.github.io/tannu-product-/` (static preview, order save nahi hota) |

`noorethnicwear.in` **hamari site nahi** hai (wo reference store hai) — us par
kabhi canonical/link nahi banta.

## 2. DNS — sirf 3 record (Cloudflare / GoDaddy / jo bhi ho)

Domain ke nameservers **Cloudflare** ke hain (`karsyn/duke.ns.cloudflare.com`), aur
abhi koi record nahi hai — isliye site domain par nahi khul rahi.

| Type | Name | Value | Proxy |
| --- | --- | --- | --- |
| `A` | `@` (apex) | `216.198.79.1` | **DNS only (grey cloud)** |
| `CNAME` | `www` | `1f2fa7f03b754074.vercel-dns-017.com` | DNS only |
| `CNAME` | `admin` | `1f2fa7f03b754074.vercel-dns-017.com` | DNS only |

> Cloudflare proxy **orange cloud** ON rakha to Vercel ka SSL issue karega — pehle
> grey (DNS only) rakhiye, site chalne ke baad chahein to orange kar sakte hain.
>
> Vercel dashboard me bhi yahi values dikhengi: Project → Settings → Domains.
> Doosra option: nameservers hi Vercel ke (`ns1.vercel-dns.com`, `ns2.vercel-dns.com`)
> par shift kar dein — phir Vercel khud records manage karega.

## 3. Vercel environment (already set)

| Project | Key | Value |
| --- | --- | --- |
| `noor-clothing` (storefront) | `NEXT_PUBLIC_SITE_URL` | `https://noorethnicwear.in` |
| `noor-clothing` | `CORS_ALLOWED_ORIGINS` | naya domain + `www` + admin + purane Vercel URLs |
| `noor-admin` | `STORE_API_URL`, `NEXT_PUBLIC_STORE_URL`, `NEXT_PUBLIC_STOREFRONT_URL` | `https://noorethnicwear.in` |
| `noor-admin` | `ADMIN_EMAIL` | `admin@noorethnicwear.in,admin@noorethnicwear.in` (dono chalenge) |

Code me fallback bhi naya domain hai — `apps/web/src/lib/domain.ts` → `CANONICAL_ORIGIN`,
isliye local/preview par bhi canonical `noorethnicwear.in` hi banta hai.

## 4. Kya-kya usi se ban jaata hai (automatic)

canonical tags · `og:url` · sitemap.xml · robots.txt · product/breadcrumb JSON-LD ·
WhatsApp order message ka product link · invoice ke links · UPI return URL ·
traffic tracking me "internal" pehchan (`isOwnHost`).

## 5. Domain lagne ke baad ek baar

1. Google Search Console me **naya property** `noorethnicwear.in` add → sitemap
   `https://noorethnicwear.in/sitemap.xml` submit.
2. Vercel → Project → Settings → Domains me dono (`noorethnicwear.in`,
   `www.noorethnicwear.in`) green "Valid Configuration" dikhna chahiye.
3. Test: `/api/health` → `commit` naya, `db: "up"`; `/sitemap.xml` me URLs naye domain par.
