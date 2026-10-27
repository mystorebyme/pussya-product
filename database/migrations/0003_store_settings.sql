-- 0003 — store settings (admin panel se edit hone wali cheezein)
--
-- Announcement bar, free shipping, UPI id, GSTIN, support contact.
-- Storefront inhe runtime par padhta hai, isliye admin ka save turant site par
-- dikhta hai (pehle ye admin container ke local file me kho jaata tha).

create table if not exists store_settings (
  id          text primary key default 'default',
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);
