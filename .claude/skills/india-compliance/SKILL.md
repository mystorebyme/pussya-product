---
name: india-compliance
description: India-specific commerce rules for this store — GST invoicing, consumer protection disclosures, DPDP privacy, COD, and shipping/returns obligations.
---

# India compliance

## Legal pages (live)

`apps/web/src/content/policies/`: shipping, refund-and-return, privacy, terms.
Content pages: about-us, contact, FAQ, size guide (`src/app/pages/[slug]`).

## Consumer Protection (E-Commerce) Rules 2020 — must show

- [x] Legal entity name + address + contact (footer/contact page)
- [x] Country of origin, MRP, seller name per product (PDP; Phase 2 me label image)
- [x] Return/refund policy + timeline
- [x] Shipping: dispatch time, delivery estimate, charges (free)
- [x] Grievance officer name + contact (privacy policy)
- [x] No fake urgency / no hidden charges (total checkout par full breakup)

## GST

| Item | Rule |
| --- | --- |
| Prices | GST-inclusive (store prices as-is) |
| GSTIN | Footer + invoice |
| Invoice | Order number, date, item, HSN (saree/lehenga 5407/6204/6211), taxable value, CGST/SGST |
| Below threshold | Composition scheme possible — CA se confirm |
| Invoice PDF | Phase 2 (manual invoice Phase 1) |

## DPDP Act 2023

- Consent: newsletter + WhatsApp opt-in checkbox (no pre-tick).
- Purpose limitation: phone sirf delivery/support; marketing ke liye separate consent.
- Retention: orders 3 years (tax), then purge.
- Deletion request → 7 din me (support SOP).
- Breach: 72h me notify (policy me likha).

## COD

Cap Rs. 3,500. Fake orders → phone confirm on WhatsApp before dispatch; 3 failed COD → block.

## Returns

7-day return on unused, tags intact; refund 5-7 business days; non-returnable: customised/blouse.
Policy text aur admin flow match karna chahiye.

## Do not

- "100% guarantee" type unverifiable claims.
- Fake reviews / stock counters.
- Customer phone/address ko marketing list me mix karna.
