# Threat model (STRIDE)

Assets: orders + customer PII, admin session, payment callbacks, catalogue integrity, uptime.

| Threat | Vector | Impact | Mitigation | Status |
| --- | --- | --- | --- | --- |
| **S**poofing | Admin login brute force | full control | strong password, 8h session, rate-limit login, Phase 2 2FA | partial |
| Spoofing | Fake webhook calls | orders marked paid | HMAC verify + timingSafeEqual | ✅ |
| **T**ampering | Client sends fake price | revenue loss | server recomputes from catalogue | ✅ |
| Tampering | Duplicate order via retry | inventory/COD fraud | Idempotency-Key | ✅ |
| Tampering | Admin cookie edit | privilege | HMAC signature check | ✅ |
| **R**epudiation | "Order nahi kiya" | chargeback | timestamped order + audit log + IP | partial |
| **I**nfo disclosure | order number enumeration | PII leak | high-entropy number + 30/min limit | ✅ |
| Info disclosure | secrets in client bundle | key leak | only `NEXT_PUBLIC_*` public; review each build | ✅ |
| **D**oS | order spam | fake COD | rate limit 10/min + COD cap + phone validation | partial |
| DoS | search spam | CPU | 220ms debounce + 60/min | ✅ |
| **E**scalation | path traversal in policy/markdown | file read | slug whitelist regex, no user paths | ✅ |
| Escalation | admin action by non-admin | data loss | `requireAdmin` + middleware redirect | ✅ |

## Out of scope (Phase 1)

- Nation-state / DDoS beyond CDN.
- Physical theft of owner's device (device lock recommended).
- Third-party provider breach (Razorpay/Resend ka apna compliance).

## Review

Har major feature par threat table update; pentest (basic) launch se pehle — `docs/08-testing/security-testing.md`.
