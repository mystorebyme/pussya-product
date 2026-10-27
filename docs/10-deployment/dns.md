# DNS & domains

## Records

| Name | Type | Value | TTL |
| --- | --- | --- | --- |
| `@` | A | Vercel (76.76.21.21) | 300 |
| `www` | CNAME | `cname.vercel-dns.com` | 300 |
| `admin` | CNAME | `cname.vercel-dns.com` | 300 |
| `api` | CNAME | `noor-api.onrender.com` | 300 |
| `_dmarc` | TXT | `v=DMARC1; p=none; rua=mailto:…` | 3600 |
| `@` | TXT | SPF / Resend verification | 3600 |

## Steps

1. Registrar (GoDaddy/Cloudflare) → DNS panel.
2. Vercel project → Domains → add `noorethnicwear.in` + `www` (redirect www → apex ya vice versa, ek chuno).
3. Admin subdomain separate Vercel project me add.
4. HTTPS auto (Let's Encrypt via Vercel); `www` par 308 redirect.
5. Email deliverability: Resend domain verify (SPF + DKIM + DMARC), `EMAIL_FROM = orders@noorethnicwear.in`.

## Old deployments

`noorclothing.onrender.com` (purana), `clone-noor-clothing-website` (reference app) — DNS se point nahi karte.
Purana deploy band karne se pehle 301 redirect: purana host → naya domain (2-4 hafte), phir shutdown.

## Verify

```bash
dig +short noorethnicwear.in
curl -I https://noorethnicwear.in | head -5
curl -I https://admin.noorethnicwear.in   # 200 login, noindex header
```
