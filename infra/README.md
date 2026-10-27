# infra

Deployment support files. App code se alag rakhe gaye hain taaki ek nazar me dikhe "production me kya chahiye".

```
infra/
├── nginx/noor.conf        # single-VPS reverse proxy (optional)
├── monitoring/              # uptime check + health script
└── scripts/deploy.sh        # build → verify → deploy hooks
```

## Kya kahan deploy hota hai

| App | Host | Config |
| --- | --- | --- |
| web | Vercel | `docs/10-deployment/vercel.md` |
| admin | Vercel (subdomain) | `docs/10-deployment/vercel.md` |
| api | Render (Node + disk) | `docs/10-deployment/render.md` |
| DNS | registrar | `docs/10-deployment/dns.md` |

## Single VPS alternative

Agar sab ek server par chahiye (ya preview/staging ke liye): root `docker-compose.yml` +
`infra/nginx/noor.conf`. Data volume `noor-data` ko `/app/.data` par mount karo, warna orders restart par udd jayenge.

## Secrets

Koi secret is folder me commit nahi hota. Sab env vars host dashboard se
(`docs/07-security/secrets.md`).
