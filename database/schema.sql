-- ═══════════════════════════════════════════════════════════════════════════
-- Noor Clothing — production database schema (PostgreSQL 15+)
--
-- Design rules:
--   1. Koi data miss na ho: har entity ka poora detail + audit trail.
--   2. Paisa hamesha paise (integer) me — float kabhi nahi.
--   3. Har order ka snapshot: product baad me badle to bhi invoice wahi rahe.
--   4. Payment sirf backend verify ke baad `paid` hota hai (raw gateway payload store).
--   5. Admin/automation ke secrets encrypted + rotate-able; plaintext password kabhi nahi.
--
-- Apply: psql "$DATABASE_URL" -f database/schema.sql
-- ═══════════════════════════════════════════════════════════════════════════

create extension if not exists "pgcrypto";   -- gen_random_uuid()
create extension if not exists "citext";     -- case-insensitive email/phone

-- ───────────────────────────── enums ─────────────────────────────
create type order_status as enum ('placed','confirmed','packed','shipped','delivered','cancelled','returned');
create type payment_status as enum ('pending','processing','paid','failed','refunded');
create type payment_method as enum ('prepaid');
create type staff_role as enum ('owner','manager','support','packer');
create type review_status as enum ('published','pending','hidden');
create type coupon_kind as enum ('percent','flat','free_shipping');
create type invoice_kind as enum ('order','manual');

-- ───────────────────────────── staff / auth ─────────────────────────────
create table staff (
  id              uuid primary key default gen_random_uuid(),
  email           citext not null unique,
  name            text not null,
  password_hash   text not null,                -- argon2id / bcrypt
  role            staff_role not null default 'support',
  is_active       boolean not null default true,
  last_login_at   timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table staff_sessions (
  id              uuid primary key default gen_random_uuid(),
  staff_id        uuid not null references staff(id) on delete cascade,
  token_hash      text not null unique,         -- raw token kabhi store nahi
  ip              inet,
  user_agent      text,
  created_at      timestamptz not null default now(),
  expires_at      timestamptz not null,
  revoked_at      timestamptz
);
create index on staff_sessions (staff_id, expires_at);

-- ───────────────────────────── catalogue ─────────────────────────────
create table collections (
  id              uuid primary key default gen_random_uuid(),
  handle          text not null unique,
  title           text not null,
  subtitle        text,
  description     text,
  image_url       text,
  sort_order      int not null default 0,
  is_published    boolean not null default true,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table products (
  id              uuid primary key default gen_random_uuid(),
  handle          text not null unique,          -- ascii slug (URL)
  source_handle   text,                          -- live store ka original handle
  source_id       text,                          -- Shopify product id (reviews mapping)
  title           text not null,
  description     text,
  description_html text,
  category        text,
  product_type    text,
  fabric          text,
  colour          text,
  colour_group    text,                          -- same design, different colours
  colour_name     text,
  price           int not null check (price >= 0),          -- paise
  compare_at_price int check (compare_at_price >= 0),
  hsn_code        text not null default '6204',
  gst_rate        numeric(4,2),                  -- 5 / 18
  in_stock        boolean not null default true,
  is_featured     boolean not null default false,
  is_hidden       boolean not null default false,
  rating          numeric(2,1) not null default 0,
  review_count    int not null default 0,
  published_at    timestamptz,
  seo_title       text,
  seo_description text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on products (category);
create index on products (colour_group);
create index on products (is_hidden, in_stock);

create table product_images (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  url             text not null,
  alt             text,
  position        int not null default 0,
  width           int,
  height          int,
  -- ek image poore catalogue me sirf ek product par
  unique (url)
);
create index on product_images (product_id, position);

create table product_collections (
  product_id      uuid not null references products(id) on delete cascade,
  collection_id   uuid not null references collections(id) on delete cascade,
  position        int not null default 0,
  primary key (product_id, collection_id)
);

create table product_variants (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid not null references products(id) on delete cascade,
  size            text not null,
  sku             text unique,
  price           int not null check (price >= 0),          -- size-wise price
  compare_at_price int,
  stock           int not null default 0 check (stock >= 0),
  is_available    boolean not null default true,
  image_url       text,
  barcode         text,
  weight_grams    int,
  unique (product_id, size)
);

create table inventory_movements (
  id              bigserial primary key,
  variant_id      uuid not null references product_variants(id) on delete cascade,
  delta           int not null,
  reason          text not null,                 -- sale / return / manual / restock
  reference       text,                          -- order number
  actor           text,
  created_at      timestamptz not null default now()
);
create index on inventory_movements (variant_id, created_at desc);

-- ───────────────────────────── customers ─────────────────────────────
create table customers (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null unique,          -- E.164 bina + ke
  email           citext,
  name            text,
  phone_verified_at timestamptz,
  total_orders    int not null default 0,
  total_spent     int not null default 0,        -- paise
  notes           text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on customers (email);

create table addresses (
  id              uuid primary key default gen_random_uuid(),
  customer_id     uuid not null references customers(id) on delete cascade,
  label           text,
  full_name       text not null,
  phone           text not null,
  line1           text not null,
  line2           text,
  landmark        text,
  city            text not null,
  state           text not null,
  pincode         text not null,
  country         text not null default 'IN',
  is_default      boolean not null default false,
  created_at      timestamptz not null default now()
);
create index on addresses (customer_id);

-- ───────────────────────────── orders ─────────────────────────────
create table orders (
  id              uuid primary key default gen_random_uuid(),
  order_number    text not null unique,          -- NE-XXXXXX
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text not null,
  email           citext not null,
  phone           text not null,
  shipping_address jsonb not null,               -- snapshot (line1, city, state, pincode…)
  billing_address  jsonb,
  notes           text,
  subtotal        int not null check (subtotal >= 0),
  discount        int not null default 0,
  shipping        int not null default 0,
  total           int not null check (total >= 0),
  coupon_code     text,
  payment_method  payment_method not null default 'prepaid',
  payment_status  payment_status not null default 'pending',
  status          order_status not null default 'placed',
  idempotency_key text unique,
  placed_ip       inet,
  user_agent      text,
  cancelled_reason text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index on orders (status, created_at desc);
create index on orders (payment_status);
create index on orders (phone);

create table order_items (
  id              bigserial primary key,
  order_id        uuid not null references orders(id) on delete cascade,
  product_id      uuid references products(id) on delete set null,
  variant_id      uuid references product_variants(id) on delete set null,
  handle          text not null,
  title           text not null,                 -- order ke waqt ka snapshot
  image_url       text,
  size            text not null,
  quantity        int not null check (quantity between 1 and 20),
  unit_price      int not null,                  -- paise, snapshot
  line_total      int not null,
  hsn_code        text not null default '6204',
  gst_rate        numeric(4,2),
  taxable_value   int,
  cgst            int not null default 0,
  sgst            int not null default 0,
  igst            int not null default 0
);
create index on order_items (order_id);

create table order_status_history (
  id              bigserial primary key,
  order_id        uuid not null references orders(id) on delete cascade,
  from_status     order_status,
  to_status       order_status not null,
  actor           text not null,
  note            text,
  created_at      timestamptz not null default now()
);
create index on order_status_history (order_id, created_at);

create table shipments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  courier         text,
  awb             text,
  tracking_url    text,
  label_url       text,
  shipped_at      timestamptz,
  delivered_at    timestamptz,
  updated_by      text,
  updated_at      timestamptz not null default now()
);
create index on shipments (order_id);

-- ───────────────────────────── payments ─────────────────────────────
-- Gateway accounts: sirf encrypted secrets. Password/cookie kabhi plaintext nahi.
create table payment_gateways (
  id              uuid primary key default gen_random_uuid(),
  provider        text not null,                 -- razorpay / cashfree / payu
  label           text not null,                 -- account 1 / account 2 / account 3
  key_id          text not null,
  secret_enc      bytea not null,                -- pgp_sym / kms encrypted
  webhook_secret_enc bytea not null,
  priority        int not null default 1,        -- 1 = pehle try
  is_active       boolean not null default true,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create table gateway_health (
  gateway_id      uuid primary key references payment_gateways(id) on delete cascade,
  consecutive_failures int not null default 0,
  blocked_until   timestamptz,
  last_error      text,
  last_success_at timestamptz,
  updated_at      timestamptz not null default now()
);

create table payments (
  id              uuid primary key default gen_random_uuid(),
  order_id        uuid not null references orders(id) on delete cascade,
  gateway_id      uuid references payment_gateways(id) on delete set null,
  provider        text not null,                 -- razorpay / manual-upi
  gateway_order_id text,
  gateway_payment_id text,
  upi_uri         text,                          -- customer ko diya gaya QR/intent
  amount          int not null,
  currency        text not null default 'INR',
  status          payment_status not null default 'pending',
  failure_reason  text,
  verified_by     text,                          -- gateway-webhook / staff email
  verified_at     timestamptz,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (order_id, provider, gateway_payment_id)
);
create index on payments (order_id);
create index on payments (status, created_at desc);

-- Har webhook raw payload + signature result (audit/debug ke liye)
create table payment_webhooks (
  id              bigserial primary key,
  provider        text not null,
  event_type      text,
  signature_valid boolean not null,
  payload         jsonb not null,
  received_at     timestamptz not null default now(),
  processed_at    timestamptz,
  result          text
);

-- ───────────────────────────── invoices ─────────────────────────────
create table invoices (
  id              uuid primary key default gen_random_uuid(),
  number          text not null unique,          -- LK/2026-27/0001 ya LK/MANUAL/0001
  kind            invoice_kind not null default 'order',
  order_id        uuid references orders(id) on delete set null,
  customer_name   text not null,
  phone           text,
  email           citext,
  billing_address jsonb not null,
  place_of_supply text not null,
  taxable_value   int not null,
  cgst            int not null default 0,
  sgst            int not null default 0,
  igst            int not null default 0,
  total           int not null,
  notes           text,
  issued_at       timestamptz not null default now(),
  issued_by       text,
  pdf_url         text
);
create index on invoices (order_id);

create table invoice_items (
  id              bigserial primary key,
  invoice_id      uuid not null references invoices(id) on delete cascade,
  title           text not null,
  size            text,
  quantity        int not null,
  unit_price      int not null,
  line_total      int not null,
  hsn_code        text,
  gst_rate        numeric(4,2)
);

-- ───────────────────────────── reviews ─────────────────────────────
create table reviews (
  id              uuid primary key default gen_random_uuid(),
  product_id      uuid references products(id) on delete cascade,
  source          text not null default 'trustoo',
  source_review_id text,
  author          text not null,
  rating          smallint not null check (rating between 1 and 5),
  title           text,
  body            text not null,
  photos          jsonb not null default '[]',
  reply           text,
  is_verified     boolean not null default false,
  status          review_status not null default 'published',
  commented_on    date,
  synced_at       timestamptz not null default now(),
  unique (source, source_review_id)
);
create index on reviews (product_id, commented_on desc);

-- ───────────────────────────── coupons / marketing ─────────────────────────────
create table coupons (
  id              uuid primary key default gen_random_uuid(),
  code            citext not null unique,
  kind            coupon_kind not null,
  value           int not null default 0,        -- percent ya flat paise
  min_subtotal    int not null default 0,
  max_discount    int,
  usage_limit     int,
  used_count      int not null default 0,
  per_customer_limit int not null default 1,
  starts_at       timestamptz,
  ends_at         timestamptz,
  is_active       boolean not null default true,
  created_at      timestamptz not null default now()
);

create table coupon_redemptions (
  id              bigserial primary key,
  coupon_id       uuid not null references coupons(id) on delete cascade,
  order_id        uuid not null references orders(id) on delete cascade,
  customer_id     uuid references customers(id) on delete set null,
  discount        int not null,
  redeemed_at     timestamptz not null default now()
);

create table banners (
  id              uuid primary key default gen_random_uuid(),
  title           text not null,
  image_url       text not null,
  link_url        text,
  placement       text not null default 'home-hero',
  sort_order      int not null default 0,
  is_active       boolean not null default true,
  starts_at       timestamptz,
  ends_at         timestamptz
);

-- ───────────────────────────── ops ─────────────────────────────
create table settings (
  key             text primary key,
  value           jsonb not null,
  updated_by      text,
  updated_at      timestamptz not null default now()
);

create table admin_audit (
  id              bigserial primary key,
  actor           text not null,
  action          text not null,
  target          text,
  meta            jsonb,
  ip              inet,
  created_at      timestamptz not null default now()
);
create index on admin_audit (created_at desc);

create table contact_messages (
  id              uuid primary key default gen_random_uuid(),
  name            text not null,
  email           citext not null,
  phone           text,
  message         text not null,
  is_handled      boolean not null default false,
  handled_by      text,
  is_replied      boolean not null default false,
  replied_at      timestamptz,
  replied_by      text,
  created_at      timestamptz not null default now()
);

create table otp_challenges (
  id              uuid primary key default gen_random_uuid(),
  phone           text not null,
  code_hash       text not null,
  attempts        int not null default 0,
  expires_at      timestamptz not null,
  consumed_at     timestamptz,
  created_at      timestamptz not null default now()
);
create index on otp_challenges (phone, expires_at desc);

-- ───────────────────────────── views ─────────────────────────────
create view daily_sales as
select date_trunc('day', created_at) as day,
       count(*) filter (where payment_status = 'paid') as paid_orders,
       coalesce(sum(total) filter (where payment_status = 'paid'), 0) as revenue
from orders
group by 1
order by 1 desc;

create view product_performance as
select p.handle,
       p.title,
       coalesce(sum(oi.quantity), 0) as units_sold,
       coalesce(sum(oi.line_total), 0) as revenue
from products p
left join order_items oi on oi.product_id = p.id
left join orders o on o.id = oi.order_id and o.payment_status = 'paid'
group by p.handle, p.title
order by units_sold desc;

-- ───────────────────── checkout funnel (R21) ─────────────────────
-- Owner ko dikhna chahiye: kaun checkout tak pahuncha, kaun review tak aaya,
-- kaun order kar paya aur kahan fail hua. Har row Google Sheet "Checkout" tab
-- me bhi jaati hai (scripts/google-apps-script/noor-sheets.gs).
create table checkout_events (
  id            uuid primary key default gen_random_uuid(),
  created_at    timestamptz not null default now(),
  event         text not null,                       -- checkout.started | checkout.review | order.placed | order.failed
  step          text,
  order_number  text,
  items         jsonb not null default '[]'::jsonb,
  items_count   int not null default 0,
  subtotal      int not null default 0,              -- paise
  reason        text,
  session_id    text,
  phone         text,
  user_agent    text
);
create index on checkout_events (created_at desc);
create index on checkout_events (event, created_at desc);
create index on checkout_events (order_number);
