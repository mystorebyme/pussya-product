---
name: admin-panel
description: Build or extend a screen in apps/admin — auth, server actions, audit logging, tables, and status updates. Use for anything the store owner operates.
---

# Admin panel

## Access

- App: `http://localhost:3001` (prod `admin.noorethnicwear.in`)
- Login: `ADMIN_EMAIL` / `ADMIN_PASSWORD` (dev default `admin@noorethnicwear.in` / `noor2026`)
- Cookie `noor_admin` = `base64url(payload).HMAC-SHA256`, 8h, `httpOnly`, `sameSite=lax`
- Middleware: `apps/admin/src/middleware.ts` — sab `(admin)` routes protected, warna `307 /login?next=`

## Add a page

```
src/app/(admin)/<route>/page.tsx    server component
src/lib/data.ts                     read/write helpers (+ audit)
src/app/actions.ts                  server action ("use server")
src/components/admin-nav.tsx        nav link add
```

## Server action template

```ts
"use server";
export async function updateThingAction(formData: FormData) {
  await requireSession();                       // ⚠️ middleware bypass se bachao
  const parsed = schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { ok: false, error: "…" };
  const result = data.updateThing(parsed.data);
  await appendAudit({ actor: "owner", action: "thing.updated", meta: parsed.data });
  revalidatePath("/<route>");
  return { ok: true };
}
```

## Conventions

1. **Plain CSS** classes (`.card`, `.table`, `.badge`), Tailwind nahi.
2. Money `formatPrice(paise)`; dates `formatDate(iso)`.
3. Tables: numbers right-aligned, status badge colour-coded.
4. Har mutation = audit entry (`action` = `<entity>.<verb>`).
5. Owner-critical action par confirm step (cancel/refund).
6. Empty state + "why is this empty" line.
7. Koi customer-facing PII export button nahi.

## Data safety

- Writes atomic (tmp + rename) via `lib/data.ts`.
- Price/stock overrides `.data/overrides.json` me — catalogue rebuild se overwrite nahi.
- Settings `.data/settings.json` — save par `revalidatePath("/", "layout")`.

## Verify

```bash
npm run dev:admin
curl -s -o /dev/null -w "%{http_code}" localhost:3001/           # 307
curl -s -o /dev/null -w "%{http_code}" localhost:3001/login     # 200
npm run typecheck -w @noor/admin
cd apps/admin && npx next build
```
