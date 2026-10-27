# GST invoicing

Har order ki tax invoice customer apne order page se download kar sakta hai
(`/orders/<orderNumber>/invoice`), aur owner admin panel se bhi
(`/orders/<id>` → *Download GST invoice (PDF)*).

## Rules jo code me enforce hote hain

| Cheez | Rule | Kahan |
| --- | --- | --- |
| Apparel GST | per piece ≤ ₹2,500 → **5%**, usse zyada → **18%** (22 Sep 2025 ke baad) | `@noor/validation` → `apparelGstRate` |
| COD charge | **18%** (service, HSN 9968) | `GST_SERVICE_RATE` |
| Prices | inclusive of tax; taxable value reverse-calculate hoti hai | `splitTax` |
| CGST/SGST vs IGST | seller Rajasthan; buyer ka state different ho to IGST | `lib/invoice.ts` |
| Discount | invoice par dikhta hai aur line-wise proportionally allocate hota hai | `buildInvoice` |
| Invoice number | `LK/<FY>/<0001>` — financial year Apr–Mar | `invoiceNumber` |
| Serial | ek baar issue hone par **lock** (`.data/invoice-seq.json`) | `ensureInvoice` |
| Rounding | `taxable + tax === gross` — ek paisa bhi idhar-udhar nahi | `splitTax` + unit tests |

## kaise kaam karta hai

```
order page → "Download invoice"
   ↓  (order number + phone ke aakhri 4 digit)
GET /api/orders/:orderNumber/invoice?phone=XXXX        → PDF (pdfkit)
GET /orders/:orderNumber/invoice?phone=XXXX            → printable HTML
```

- Order number akela kaafi nahi — phone ke **aakhri 4 digit** match karne padte hain
  (warna `403`). Ye order pages ke public URL ko abuse hone se bachata hai.
- `ensureInvoice()` pehli baar serial allot karta hai aur order record me likh deta hai;
  dobara download karne par wahi number milta hai (accounting me consistency).
- Invoice PDF me: seller + GSTIN, bill-to, place of supply, line items (HSN + qty +
  rate + taxable + GST%), CGST/SGST ya IGST, total, declaration.

## Setup

```bash
SELLER_GSTIN=08AAFCL1234A1Z5     # apna GSTIN
SELLER_EMAIL=owner ka apna Google account
SELLER_PHONE=
GST_HSN=6204                     # women's suits/dresses
```

GSTIN set na ho to invoice par "GSTIN pending" chhapta hai — **live jaane se pehle
bhar dein**. Admin → Settings me bhi GSTIN field hai (store settings ke liye).

## Files

| File | Kaam |
| --- | --- |
| `packages/validation/index.ts` | rate, `splitTax`, `financialYear`, `invoiceNumber` |
| `apps/web/src/lib/invoice.ts` | order → invoice view (lines, totals, place of supply) |
| `apps/web/src/lib/invoice-pdf.ts` | pdfkit PDF renderer |
| `apps/web/src/lib/orders.ts` | `ensureInvoice()` serial allot + persist |
| `apps/web/src/app/api/orders/[orderNumber]/invoice/route.ts` | PDF endpoint (phone-gated) |
| `apps/web/src/app/orders/[orderNumber]/invoice/page.tsx` | printable HTML invoice |
| `tests/unit/invoice.test.ts` | rate, rounding, IGST vs CGST/SGST, numbering |

## Verification

```bash
npm test                                   # invoice math + numbering
BASE_URL=http://localhost:3000 npm run test:smoke   # 403 without phone, %PDF- with phone
```
