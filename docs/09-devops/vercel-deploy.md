# Vercel par deploy (5 minute) — Noor Ethnic Wear

Ye doc batata hai ki storefront aur owner panel **Vercel** par kaise chadhte hain,
aur GitHub par ek **button** dabakar deploy kaise hota hai.

> Store ka data Google Sheet me rehta hai, code me nahi — isliye deploy ke baad
> phone / WhatsApp / UPI badalne par **dobara deploy ki zaroorat nahi** padti.

---

## 0. Ek baar ka kaam — 3 cheezein

| Kya | Kahan | Kyun |
| --- | --- | --- |
| Vercel account (GitHub se login) | [vercel.com/signup](https://vercel.com/signup) | hosting |
| Repo import | Vercel → **Add New → Project → Import Git Repository** | build |
| Env variables | Vercel → Project → **Settings → Environment Variables** | Sheet + domain |

---

## 1. Button dabakar deploy (sabse aasan)

Neeche wale button se ye repo clone hokar Vercel par chadh jaata hai:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/mystorebyme/pussya-product&root-directory=apps/web&project-name=noor-ethnic-wear&repository-name=pussya-product)

**Root Directory: `apps/web`** rakhna zaroori hai (monorepo hai) — button isi setting
ke saath khulta hai. `apps/admin` ke liye dobara wahi button, sirf
`root-directory=apps/admin` aur `project-name=noor-admin`.

### Button dabane ke baad env me ye bhariye

```
NEXT_PUBLIC_SITE_URL      = https://<project>.vercel.app   (baad me apna domain)
GOOGLE_SHEETS_WEBAPP_URL  = <Apps Script /exec URL>
GOOGLE_SHEETS_TOKEN       = <lamba random token>
SHEET_EXPECTED_ID         = <sheet URL ka id>
DATABASE_URL              = <Supabase pooler URL>          (recommended)
ADMIN_API_TOKEN           = <lamba random token>
UPI_RETURN_SECRET         = <lamba random token>
```

Poori list: [`.env.example`](../../.env.example).

---

## 2. GitHub par "ek button" se deploy (Actions)

Repo → **Actions** tab → left me **Deploy** → **Run workflow** → target chuniye:

| Target | Kya deploy hota hai |
| --- | --- |
| `all` | web + admin + api (Render hook) |
| `web` | sirf storefront (Vercel) |
| `admin` | sirf owner panel (Vercel) |
| `api` | sirf REST API (Render) |

Pehle ek baar repo secrets daalni padti hain — **Settings → Secrets and variables → Actions**:

| Secret | Kahan se milta hai |
| --- | --- |
| `VERCEL_TOKEN` | Vercel → Account Settings → Tokens → Create |
| `VERCEL_ORG_ID` | Vercel project → Settings → General → Team ID (ya `vercel link` ke baad `.vercel/project.json`) |
| `VERCEL_PROJECT_ID_WEB` | `vercel link` ke baad `.vercel/project.json` → `projectId` (web project) |
| `VERCEL_PROJECT_ID_ADMIN` | wahi cheez admin project ke liye |
| `RENDER_DEPLOY_HOOK` | Render → Service → Settings → Deploy Hook (sirf API ke liye) |

`main` par har push par bhi `deploy.yml` khud chalta hai. Workflow pehle
`catalog:verify` + `typecheck` + `test:all` chalata hai — test fail ho to deploy rukta hai
(yahi "koi scam na ho" ka pehla gate hai).

---

## 3. GitHub Pages preview (optional, free)

`.github/workflows/pages.yml` static preview banata hai — cart/checkout/payment ke liye
nahi (Pages par Node server nahi chalta), sirf browse ke liye.

Ek baar: **Settings → Pages → Source: GitHub Actions**. Uske baad **Actions → GitHub Pages
preview → Run workflow**.

Live API se jodne ke liye repo variable rakhiye: **Settings → Secrets and variables →
Actions → Variables → `STORE_API_URL` = aapka Vercel URL**. Pages ka checkout tab
seedha live API par jaata hai.

---

## 4. Deploy ke baad check (2 minute)

```bash
curl -s https://<site>/api/health | head -c 200        # {"ok":true...}
curl -s "https://<site>/api/settings?fresh=1" | head -c 400
```

`meta.sheetSource` me `apps-script` dikhna chahiye aur `upiId` sheet wali value honi chahiye.
Nahi dikhe to: Apps Script deployment "Anyone" access par hai? env save karne ke baad
**Redeploy** kiya? (Vercel env change purani build par nahi lagta.)

---

## 5. Common galtiyan

| Problem | Wajah | Fix |
| --- | --- | --- |
| Build fail: `@noor/types` not found | Root Directory galat | Project root = `apps/web` (ya `apps/admin`) |
| Site chal rahi hai par UPI/phone khaali | Sheet env missing ya Apps Script private | `GOOGLE_SHEETS_WEBAPP_URL` + `GOOGLE_SHEETS_TOKEN`; deploy access **Anyone** |
| Order place hua par sheet me row nahi | `DATABASE_URL` missing (data /tmp me) + script down | Supabase URL daaliye, `/api/sheet-health` dekhiye |
| Purana number dikh raha hai | browser cache / build purani | `?fresh=1` kholiye, phir Vercel → Redeploy (env ke baad) |
