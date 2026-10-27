-- 0007 — checkout funnel (owner request)
--
-- "Koi checkout tak pahuncha, order kiya, failed kiya ya success kiya" — ye sab
-- DB me rehna chahiye, aur owner ki Google Sheet ke "Checkout" tab me bhi.
-- Order number yahin se trace hota hai (Track Order me wahi number kaam karta hai).

create table if not exists checkout_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  event         text not null,                 -- checkout.started | checkout.review | order.placed | order.failed
  step          text,
  order_number  text,
  items         jsonb not null default '[]'::jsonb,
  items_count   int not null default 0,
  subtotal      int not null default 0,        -- paise
  reason        text,
  session_id    text,
  phone         text,
  user_agent    text
);

create index if not exists checkout_events_created on checkout_events (created_at desc);
create index if not exists checkout_events_event on checkout_events (event, created_at desc);
create index if not exists checkout_events_order on checkout_events (order_number);
