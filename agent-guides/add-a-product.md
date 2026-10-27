# Guide: naya product add karna

Product data ka source **noorethnicwear.in** hai. Do raste hain:

## A. Store par product live hai (normal case)

1. Store par product publish ho jaane do.
2. Sync chalao:

```bash
npm run catalog:build          # saare products refresh
node scripts/verify-catalog.mjs
cp database/seeds/catalog.json apps/web/src/data/catalog.json
cp database/seeds/catalog.json apps/admin/src/data/catalog.json
```

3. Local check:

```bash
npm run dev
open http://localhost:3000/products/<new-handle>
```

4. Deploy (web + admin): `vercel --prod`, `cd apps/admin && vercel --prod`.

> Static catalogue hai — deploy ke baad hi live hoga. 24 products/day tak yeh theek hai;
> usse zyada ho to Phase 2 (DB + revalidate) karo.

## B. Sirf humare store me product (store par nahi)

Mat karo. Requirement: "same products, same data". Custom product chahiye to pehle store par
publish karo, phir sync.

## Kya verify karna hai

```
[ ] title exact
[ ] price paise me exact (349900 = Rs. 3,499)
[ ] compare-at (MRP) dikh raha hai
[ ] saare sizes
[ ] image load ho rahi hai (ya placeholder)
[ ] collections me appear ho raha hai
[ ] description HTML render ho raha hai
```

## Collections

`noorethnicwear.in` ke 9 collections: new-arrivals, party-wear-gown, saree, noors-choice,
lehnga-choli, printed-suit-set, weddin-collection, trending, sale.
Naya collection chahiye to `scripts/build-catalog.mjs` ka collection map + `apps/web/src/lib/collections.ts`
(nav labels) update karo.
