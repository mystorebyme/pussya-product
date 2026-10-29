# GitHub variables — kahan daalna hai, kahan milega

Short answer: **ye variables GitHub me abhi set nahi hain.** Maine inhe
workflow ke andar **default value** ke roop me likha hai, isliye kaam ho raha
hai. Aapko kuch karna zaroori nahi — par agar badalna ho to neeche diye path par
daal dijiye, default us waqt khud peeche hat jaayega.

## 1. GitHub me kahan milta hai

```
github.com/mystorebyme/pussya-product
  → Settings (repo ke top menu me)
    → Secrets and variables
      → Actions
        → Variables tab   ← yahan (Secrets tab nahi)
          → "New repository variable"
```

- **Name**: table me jo naam hai (exact, capital letters same)
- **Value**: jo value hai
- **Add variable** dabaiye

> `secrets` behtar hote hain jab value chhupi rakhni ho. Yahan jo bhi values hain
> wo public hain (domain, sheet id, Apps Script URL) — isliye **Variables** theek
> hai. Agar aap Secrets tab me daalein to bhi kaam karega (jo variables
> dono jagah dekhe jaate hain: pehle `vars`, phir `secrets`).

## 2. Kaun sa variable kya karta hai + code me kahan hai

| Variable | Default (code me) | Kaam | File |
| --- | --- | --- | --- |
| `GOOGLE_SHEETS_WEBAPP_URL` | aapka Apps Script `/exec` URL | Build ke waqt Sheet se settings padhna (number, announcement, daily special) | `.github/workflows/pages.yml:55` aur `:108` |
| `SHEET_ID` | `1Rw2XO5F3dJup4FRB59N2ZLIsRW0Xe_RhVdI8OhNlXdo` | Sheet ka backup raasta (gviz CSV) + snapshot refresh | `pages.yml:58`, `:111` |
| `SITE_URL` | `https://noorethnicwear.store` | Canonical/OG URL, sitemap, smoke test ka URL, live-check ka base URL | `pages.yml:102`, `:120`, `:173` · `live-check.yml` |
| `CUSTOM_DOMAIN` | `noorethnicwear.store` | Build ke baad `dist/CNAME` file | `pages.yml:103`, `:125` |
| `PAGES_BASE_PATH` | *(khaali = root)* | Site kis path par banti hai. Khaali = `https://noorethnicwear.store/` ke root par. `github.io/pussya-product/` chahiye ho to `/pussya-product` | `pages.yml:101` |
| `STORE_API_URL` | `https://noor-ethnic-wear.vercel.app` | Live store ka API (checkout/tracking Pages se wahan jaate hain) | `pages.yml:61`, `:117` |

Jo variables **nahi** diye gaye (jaise `STORE_WHATSAPP`) unki zaroorat nahi —
Sheet se number aa raha hai. Wo sirf emergency fallback hain.

## 3. Precedence (kaun jeetta hai)

```
vars.NAME   →   secrets.NAME   →   workflow ka default
```

Yaani aap variable daal dein to default apne aap ignore ho jaata hai. Koi code
change nahi karna padega.

## 4. Verify kaise karein ki pick hua ya nahi

1. Push hone par Actions me **GitHub Pages preview** → job **build** →
   step **"Resolve sheet settings (owner's Google Sheet)"** kholiye.
   Wahan lines aati hain:
   ```
   apps-script url set: yes
   published csv set: no
   sheet id set: yes
   apps-script ?action=settings → HTTP 200
     ok: yes · settings keys: 9 · version: 2026-…
     whatsapp: set · daily_special: set · announcement: set
   ```
2. Site par ek chhoti proof file bhi hoti hai:
   `https://noorethnicwear.store/preview-settings.json`
   ```json
   { "attempt": "apps-script: ok", "whatsappSet": true, "numberDigits": 12, ... }
   ```
3. Live check ka report: `docs/09-devops/live-check.md` — "build settings:" line.

## 5. Aapko abhi karna hai ya nahi?

**Nahi.** Site chalu hai, Sheet se live settings aa rahi hain
(`build settings: apps-script: ok`). Ye variables sirf tab chahiye jab:

- Sheet / Apps Script ka URL badle → `GOOGLE_SHEETS_WEBAPP_URL` naya daal dein
- Domain badle → `SITE_URL` + `CUSTOM_DOMAIN`
- Site ko project-page path par wapas chahiye → `PAGES_BASE_PATH=/pussya-product`
- Live store kahin aur shift ho (Netlify/Render) → `STORE_API_URL`
