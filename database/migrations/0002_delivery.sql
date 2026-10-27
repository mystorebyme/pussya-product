-- 0002 — delivery serviceability (pincode rule engine)
--
-- Admin state-wise allow/block karta hai aur koi bhi pincode block (ya blocked
-- state me bhi allow) kar sakta hai. Settings ek hi row me jsonb rehti hain.

create table if not exists delivery_settings (
  id          text primary key default 'default',
  payload     jsonb not null,
  updated_at  timestamptz not null default now()
);
