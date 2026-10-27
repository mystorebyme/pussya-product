# Risk register

| # | Risk | Impact | Likelihood | Mitigation |
| --- | --- | --- | --- | --- |
| R1 | Catalogue price drift (store par price badla, humare JSON me purana) | Refund/trust loss | High | `scripts/verify-prices` + monthly sync; server recompute se client mismatch nahi |
| R2 | Payment webhook miss ho jaye | Order unpaid par dispatch | Medium | Reconciliation job (Phase 2) + manual check dashboard |
| R3 | Image CDN block/hotlink issue | Blank product images | Low | Placeholder SVG + Phase 2 R2 mirroring |
| R4 | `.data` file store multi-instance par inconsistent | Lost orders | Medium | Phase 1 single instance; Phase 2 Postgres |
| R5 | Admin password leak | Data loss | Medium | Strong password, 8h session, Phase 2 2FA + roles |
| R6 | COD abuse (fake orders) | Cost | High | COD limit + phone verification on WhatsApp + cancel unconfirmed |
| R7 | Duplicate orders on double click | Inventory mismatch | Medium | Idempotency-Key (implemented) |
| R8 | Razorpay KYC delay | No prepaid payments | Medium | Manual UPI fallback already built |
| R9 | Legal copy mismatch (returns) | Consumer complaint | Medium | Policies reviewed; support SOP aligned |
| R10 | Peak festive traffic | Slow/timeout | Medium | Static pages, CDN images, load test before Diwali |

## Review cadence

Har sprint end par risk register revisit; naya risk add karo, closed risk hatao (reason ke saath).
