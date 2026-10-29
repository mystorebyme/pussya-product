-- 0005 — contact / "Send us a message" form + newsletter
--
-- Pehle contact message sirf storefront container ki local file me jaata tha:
-- redeploy ke saath gayab, aur admin panel (alag service) ko dikhta hi nahi tha.
-- Ab Postgres me — admin `/api/admin/messages` se padhta hai.
--
-- `contact_messages` table schema.sql me pehle se hai (`is_handled` column ke
-- saath), isliye yahan sirf missing columns add hote hain.

alter table contact_messages add column if not exists subject text;
alter table contact_messages add column if not exists handled_at timestamptz;
alter table contact_messages add column if not exists email_state jsonb;
alter table contact_messages add column if not exists payload jsonb;

create index if not exists contact_messages_created on contact_messages (created_at desc);
create index if not exists contact_messages_handled on contact_messages (is_handled, created_at desc);

-- newsletter — footer ka email signup (pehle sirf local JSON me tha)
create table if not exists newsletter_subscribers (
  id         uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  email      text not null unique
);
