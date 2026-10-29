# Sheet tabs (ready to import)

Ye CSV files **script se hi banti hain** — column ke naam manually mat badliye:

```bash
node scripts/sheets/export-tab-headers.mjs
```

Google Sheet me import kaise karein:

1. [sheets.new](https://sheets.new) → nayi sheet.
2. Har CSV ke liye: **File → Import → Upload** → file chuniye → *Insert new sheet(s)* → Import.
3. Import ke baad tab ka naam wahi rakhiye jo CSV ka naam hai
   (Settings, Orders, Payments, OrderItems, Invoices, Shipments, Checkout, Messages, Newsletter, Reviews, Coupons, Inventory, Audit, Errors, Dashboard, Sync).
4. `Settings` tab me apni values bhariye — phone, WhatsApp, UPI ID, announcement, GSTIN.
   Jo cell khaali hai wo site par dikhta hi nahi (koi hardcoded fallback nahi).

Tabs: 16 · columns total: 176
