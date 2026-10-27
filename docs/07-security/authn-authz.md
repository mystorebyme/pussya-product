# Authentication & authorization

## Storefront

Guest-only Phase 1. Koi customer account, koi password storage — risk surface minimal.

## Admin (Phase 1)

- Login: `email + password` (env `ADMIN_EMAIL`, `ADMIN_PASSWORD_HASH` ya plain `ADMIN_PASSWORD` dev).
- Password: bcrypt/argon2 hash recommend; dev me plain comparison (warn log).
- Session cookie: `noor_admin` = `base64url(payload).HMAC-SHA256`, payload `{ sub, role: "owner", exp }`, 8h.
- Cookie flags: `httpOnly; sameSite=lax; secure` (prod), `path=/`.
- Middleware: sab `(admin)` routes protected; `307 /login?next=<path>`.
- Login rate limit: 5 attempts / 15 min / IP + 1s delay.

## RBAC (Phase 2)

| Role | Read | Orders | Products | Settings | Audit |
| --- | --- | --- | --- | --- | --- |
| owner | all | ✅ | ✅ | ✅ | ✅ |
| catalog | catalogue | read | ✅ | ❌ | ❌ |
| dispatch | orders | ✅ | ❌ | ❌ | ❌ |
| support | orders | read + note | ❌ | ❌ | ❌ |

Implementation: `users` table, `POST /auth/login`, `requireRole(...roles)` middleware,
same audit pipeline.

## Server actions

Har action ke andar `requireSession()` — middleware bypass (direct POST) se bachaav.
Action name aur result audit log me.

## API

`requireAdmin` middleware: `Authorization: Bearer` compare with `timingSafeEqual`.

## Logout / revoke

Logout = cookie delete. Emergency revoke = `ADMIN_SESSION_SECRET` rotate + redeploy (sab sessions invalid).
