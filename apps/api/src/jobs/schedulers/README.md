# Schedulers (Phase 2)

| Job | Kya karta hai |
| --- | --- |
| `abandoned-cart.scheduler.ts` | 4 ghante baad cart chhoda to WhatsApp reminder |
| `release-expired-stock.scheduler.ts` | unpaid order ke reserved stock wapas |
| `reconcile-payments.scheduler.ts` | missed webhook safety net: provider API se status verify |

Phase 1 me stock manual hai aur payment webhook hi source of truth hai, isliye
schedulers placeholder hain. BullMQ + Redis add karte hi inhi files me cron define hoga.
