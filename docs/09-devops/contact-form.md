# Contact form — "Send us a message" (kahan jaata hai)

Website ke `/pages/contact` par form hai. Submit karte hi:

1. **Message save** — Postgres `contact_messages` (migration `0005`); `DATABASE_URL` na ho to
   `.data/messages.json`. Redeploy par kuch nahi khota.
2. **Owner ko email** — neeche diye provider se (best effort).
3. **Admin panel** → **Messages** page par message turant dikhta hai, "Mark handled" bhi hota hai.
4. **Direct fallback** — form par "or email owner ka apna Google account" (static `mailto:`) aur
   success screen par WhatsApp button hamesha kaam karta hai, chahe koi service band ho.

## Email provider — bina key, unlimited (default)

**FormSubmit** use hota hai: `POST https://formsubmit.co/ajax/<CONTACT_EMAIL>`.

- Koi account/API key nahi, unlimited free.
- **Ek baar activation**: pehli submission par `owner ka apna Google account` ke inbox me
  "Activate" mail aata hai — usme click kar dein. Uske baad har message seedhe mail me aayega.
- Band karna ho: `CONTACT_FORMSUBMIT=off`.

## Resend (optional, zyada control)

| Env | Value |
| --- | --- |
| `RESEND_API_KEY` | Resend dashboard → API Keys (**Sensitive**) |
| `EMAIL_FROM` | `Noor Website <orders@yourdomain.com>` (domain verify hone ke baad) |

`RESEND_API_KEY` set hone par FormSubmit skip ho jaata hai.

## Apna webhook (optional)

`CONTACT_FORM_ENDPOINT` — koi bhi URL jo JSON POST leta hai (Google Apps Script, Zapier, Make).
Body: `{ to, subject, name, email, phone, subject, message }`.

## Env summary

| Key | Kahan set karein |
| --- | --- |
| `CONTACT_EMAIL` | Render/Vercel env (plain) |
| `RESEND_API_KEY` | Render/Vercel env (**Sensitive**) |
| `EMAIL_FROM` | plain |
| `CONTACT_FORM_ENDPOINT` | optional, Sensitive agar secret ho |
| `CONTACT_FORMSUBMIT` | `off` = FormSubmit band |

## Test

```bash
curl -X POST localhost:3000/api/contact -H 'content-type: application/json' \
  -d '{"name":"Test","email":"t@example.com","message":"Size guide chahiye"}'
# 201 + { ok: true, channels: { mailto, whatsapp } }

curl -H "authorization: Bearer $ADMIN_API_TOKEN" localhost:3000/api/admin/messages
```
