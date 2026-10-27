-- 0004 — admin ka live status note + manual invoice metadata
--
-- Admin order page par likhta hai "abhi kahan atka hai" (e.g. "Delhivery pickup
-- kal", "customer se size confirm hona hai"). Customer ko tracking page par
-- wahi note dikhta hai. Manual invoices bhi DB me jaate hain taaki redeploy par
-- na khoyen.

alter table orders add column if not exists status_note jsonb;

create table if not exists manual_invoices (
  number          text primary key,
  created_at      timestamptz not null default now(),
  created_by      text not null,
  customer_name   text not null,
  phone           text,
  email           text,
  address         text,
  city            text,
  state           text,
  pincode         text,
  items           jsonb not null default '[]'::jsonb,
  notes           text,
  order_ref       text,
  payload         jsonb not null
);
create index if not exists manual_invoices_created on manual_invoices (created_at desc);
