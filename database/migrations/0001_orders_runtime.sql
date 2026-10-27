-- 0001 — runtime order store
--
-- `database/schema.sql` design schema hai (41 tables). Web app runtime ke liye
-- ek chhoti si tayari chahiye: audit trail column, COD enum values (legacy
-- orders ka data migrate hone ke liye) aur kuch indexes.

-- payment_method / payment_status enum me 'cod' bhi chahiye — purane JSON store
-- me COD orders maujood ho sakte hain.
do $$ begin
  alter type payment_method add value if not exists 'cod';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type payment_status add value if not exists 'cod';
exception when duplicate_object then null; end $$;

-- har order ka full audit trail (kisne kya badla) — latest first
alter table orders add column if not exists audit jsonb not null default '[]'::jsonb;

-- ek order ka ek hi active shipment row
create unique index if not exists shipments_order_unique on shipments (order_id);

-- latest payment / invoice lookup fast ho
create index if not exists payments_order_created on payments (order_id, created_at desc);
create index if not exists invoices_order_issued on invoices (order_id, issued_at desc);
create index if not exists order_items_order on order_items (order_id);
