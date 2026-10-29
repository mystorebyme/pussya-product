# User stories

Format: `As a <user>, I want <goal>, so that <value>` + acceptance criteria.

## Customer

1. **Browse by occasion** — main collection dekh kar choose kar sakoon.
   AC: collection page 24 products server se, "load more" se aage; sort aur price filter URL me.
2. **Judge the product** — price, MRP, discount, fabric, size list, real photo ek screen par.
   AC: PDP par sab info above the fold mobile par; out-of-stock size disabled.
3. **Find a style fast** — search box me 2 letter type karte hi suggestion.
   AC: debounce 220ms, 8 results, click par PDP.
4. **Order without account** — bina signup order.
   AC: checkout form 8 fields, pincode 6-digit validation, COD disabled above Rs. 3,500 with reason.
5. **Know the price exactly** — coupon lagne par total update.
   AC: server bhi wahi total calculate kare; mismatch par server value jeete.
6. **Trust the store** — policies, real number, replacement promise.
   AC: footer se policies 1 click, WhatsApp link working.
7. **Track the order** — order number se status.
   AC: `/account` → order number → timeline; invalid number clear error.

## Admin / Owner

8. **See today's business** — dashboard par revenue, pending dispatch, AOV.
9. **Move an order** — placed → confirmed → packed → shipped → delivered, note ke saath.
   AC: har change audit log me actor + time ke saath.
10. **Change price/stock quickly** — product par ek field / ek button.
    AC: storefront par turant reflect (revalidate), base JSON untouched.
11. **Answer "order kahan hai"** — order search phone/order number se.
12. **Know who changed what** — audit log page.

## Support

13. **Contact message dekhna** — contact form se aaya message admin me dikhe (Phase 1: `.data/messages.json`).
