# Guide: price ya stock change karna

## Turant (bina deploy) — owner ke liye

1. `http://localhost:3001/products` (prod: `admin.noorethnicwear.in/products`)
2. Product kholo → price/stock field → Save.
3. Override `.data/overrides.json` me jaata hai, audit log me entry banti hai.
4. Storefront next revalidation par naya price dikhata hai (server-side recompute se order total bhi match).

⚠️ Override **catalogue rebuild se zinda rehta hai** — `build-catalog` ise nahi overwrite karta,
par agar store par price change hui to override aur store diverge ho sakte hain. Monthly check karo.

## Permanent (store se sync)

```bash
npm run catalog:build
node scripts/verify-catalog.mjs
cp database/seeds/catalog.json apps/web/src/data/catalog.json
cp database/seeds/catalog.json apps/admin/src/data/catalog.json
npm run build:web && vercel --prod
```

## Stock

- `/inventory` → size-wise rows → naya number → Save + audit.
- 0 = sold out (PDP par CTA disabled).
- Default stock 10/size (COD buffer).

## Kya na karo

- `.data/catalog.json` hand-edit.
- Rupees me price likhna (3499 likha to Rs. 34.99 ho jayega).
- Stock ko client se control karna (server truth).
