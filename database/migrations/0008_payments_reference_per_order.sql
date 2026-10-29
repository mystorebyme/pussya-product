-- 0008 — UPI reference (UTR) sirf apne order ke andar unique
--
-- Pehle `unique (provider, gateway_payment_id)` tha: ek hi UTR doosre order par
-- daalte hi Postgres ne unique violation diya aur API ne generic 500 lauta diya
-- (customer ko laga payment save hi nahi hua). Asli niyam ye hai ki ek UTR ek
-- hi payment ka hota hai — use ek hi order ke andar dobara likha ja sakta hai
-- (retry / re-open), doosre order par nahi. Wo guard DB me nahi, app me hai
-- (`ORDER_REFERENCE_IN_USE` — saaf 409 message).

alter table payments drop constraint if exists payments_provider_gateway_payment_id_key;

drop index if exists payments_provider_gateway_payment_id_key;

create unique index if not exists payments_order_reference_uniq
  on payments (order_id, provider, gateway_payment_id);
