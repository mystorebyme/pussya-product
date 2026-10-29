# Custom domain setup — `noorethnicwear.store`

> GitHub error jo aapko dikha: **"Both noorethnicwear.store and its alternate name are improperly configured — Domain does not resolve to the GitHub Pages server (NotServedByPagesError)"**
> Alternate name = `www.noorethnicwear.store`.

## 1. Abhi DNS me kya hai (29 Oct, Google DNS se poocha gaya)

| name | type | value | sahi? |
| --- | --- | --- | --- |
| `noorethnicwear.store` | A | 185.199.108.153 | ✅ GitHub Pages |
| `noorethnicwear.store` | A | 185.199.109.153 | ✅ GitHub Pages |
| `noorethnicwear.store` | A | 185.199.110.153 | ✅ GitHub Pages |
| `noorethnicwear.store` | A | 185.199.111.153 | ✅ GitHub Pages |
| `www.noorethnicwear.store` | A | 104.21.43.105 | ❌ **Cloudflare proxy** |
| `www.noorethnicwear.store` | A | 172.67.178.35 | ❌ **Cloudflare proxy** |

**Matlab:** apex (bina www) theek hai, par `www` Cloudflare ke "orange cloud" proxy
se guzar raha hai. GitHub ko `www` par apna server nahi dikhta, isliye wo domain
verify nahi karta — aur jab tak verify na ho, **HTTPS certificate bhi nahi banta**
(yahi wajah hai ki `https://noorethnicwear.store` nahi khulta).

## 2. Kahan badalna hai

Aapke domain ke **nameservers Cloudflare par** hain (IPs `104.21.x` / `172.67.x`
Cloudflare ke hain). To records **Cloudflare dashboard** me badlenge:

**Cloudflare → apna domain `noorethnicwear.store` → DNS → Records**

### Apex (`noorethnicwear.store`) — A records

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| A | `@` (ya `noorethnicwear.store`) | `185.199.108.153` | **DNS only** (grey cloud) |
| A | `@` | `185.199.109.153` | **DNS only** |
| A | `@` | `185.199.110.153` | **DNS only** |
| A | `@` | `185.199.111.153` | **DNS only** |

(Optional, IPv6 — same table me AAAA: `2606:50c0:8000::153`, `2606:50c0:8001::153`,
`2606:50c0:8002::153`, `2606:50c0:8003::153`, sab DNS only)

### `www` — purane A records hata kar ek CNAME

1. `www` ke **do A records delete** karein (`104.21.43.105`, `172.67.178.35`).
2. Naya record:

| Type | Name | Content | Proxy status |
| --- | --- | --- | --- |
| CNAME | `www` | `mystorebyme.github.io` | **DNS only** (grey cloud) |

> ⚠️ **Orange cloud (Proxied) mat rakhiye.** GitHub Pages apna certificate khud
> banata hai; Cloudflare proxy beech me aa jaata hai to GitHub domain verify hi
> nahi kar paata — yahi aapki current problem hai. Grey cloud = "DNS only".

### Cloudflare me ye bhi dekh lein

- **SSL/TLS → Overview** → agar "Flexible" hai to baad me "Full" kar dein (GitHub
  ka apna cert aane ke baad).
- **Rules → Redirect Rules / Page Rules**: koi "Always Use HTTPS" ya
  "Forwarding" rule jo `www` ko kahin aur bhej raha ho, band kar dein.
- Apex par **CNAME flattening** wala CNAME na banayein — apex ke liye A records hi
  theek hain (GitHub ki official setting).

## 3. GitHub side (2 minute)

1. Repo → **Settings → Pages**
2. **Custom domain** me `noorethnicwear.store` likh kar **Save**.
   (Repo me `dist/CNAME` already is naam ke saath build hota hai — `pages.yml` me.)
3. 1–10 minute rukiye; GitHub "DNS check successful" dikhaye.
4. Phir **Enforce HTTPS** ✅ tick kar dein.
   - Ye option tab tak disabled rehta hai jab tak certificate na bane.
   - Certificate aam taur par 15–60 minute me ban jaata hai, kabhi 24 ghante tak
     lag sakte hain. GitHub khud retry karta rehta hai.
5. Agar 24 ghante baad bhi na bane: Pages me custom domain **Remove** karke dobara
   **Save** karein — isse certificate dobara maanga jaata hai.

## 4. Verify kaise karein (khud dekh lein)

- <https://dnschecker.org/#CNAME/www.noorethnicwear.store> → `mystorebyme.github.io`
  dikhna chahiye.
- <https://dnschecker.org/#A/noorethnicwear.store> → chaar `185.199.108–111.153`.
- Terminal me:
  ```bash
  dig +short A noorethnicwear.store
  dig +short CNAME www.noorethnicwear.store
  curl -I https://noorethnicwear.store
  ```

## 5. Ye repo khud check karta hai

`.github/workflows/live-check.yml` har push par DNS records Google DNS se pooch
kar `docs/09-devops/live-check.md` me likhta hai (A / AAAA / CNAME, apex + www).
Wahan dekh kar pata chal jaayega ki record theek hua ya nahi — koi extra tool
nahi chahiye.

## 6. Achha option: bina custom domain ke bhi site chalti hai

Agar DNS set karne me der lage, to site hamesha yahan live rehti hai:

<https://mystorebyme.github.io/pussya-product/>

(lekin custom domain Pages me set hone ke baad GitHub is URL ko domain par
redirect kar deta hai — to DNS theek hona zaroori hai.)
