# ADR 0004 — Third-party payment provider (Razorpay)

**Status:** Accepted

## Context

User ne clearly kaha: payments third party se honge. Khud ka UPI-QR + webhook + reconciliation
infra banane me weeks lagte aur PCI/compliance risk hota.

## Decision

Razorpay hosted payment link + webhook. Hum sirf order ↔ payment mapping rakhte hain.

## Consequences

- Positive: UPI, cards, netbanking, wallets ek integration; refunds dashboard se; PCI scope zero.
- Negative: per-transaction fee; provider downtime par prepaid ruk jaata hai (COD fallback available).
- Revisit: agar volume bahut badhe to negotiated rates / alternate provider adapter.
