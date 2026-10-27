# Email integration

- Template yahan, provider call `email.client.ts` me.
- API request email bhejne par wait nahi karti — `jobs/queues/email.queue.ts` me job jaata hai.
- Provider key na ho to log-only mode (dev/preview me email skip, app crash nahi).
