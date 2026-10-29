-- Round 16: contact messages ka reply tracking.
-- Owner/admin ab "replied" mark kar sakta hai (aur undo bhi), taaki inbox me
-- pata rahe kaunsa message answered hai aur kaunsa pending.

alter table contact_messages add column if not exists is_replied boolean not null default false;
alter table contact_messages add column if not exists replied_at timestamptz;
alter table contact_messages add column if not exists replied_by text;

create index if not exists contact_messages_replied on contact_messages (is_replied, created_at desc);
