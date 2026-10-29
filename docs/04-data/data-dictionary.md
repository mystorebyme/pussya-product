# Data dictionary

## Money & constants

| Name | Type | Value | Note |
| --- | --- | --- | --- |
| `COD_FEE` | paise | `5000` | Rs. 50 |
| `COD_MAX_ORDER` | paise | `350000` | Rs. 3,500 |
| `FREE_SHIPPING_THRESHOLD` | paise | `0` | sab orders free |
| `MAX_QTY_PER_LINE` | int | `10` | |
| `COUPONS` | map | khaali — sale price final hai | coupon stack nahi hota |
| `CART_STORAGE_KEY` | string | `noor:cart:v1` | localStorage |
| `SESSION_TTL` | seconds | `28800` | 8h admin |

## Enums

`ORDER_STATUS`, `PAYMENT_STATUS`, `PAYMENT_METHOD`, `COLLECTION_HANDLE` (9), `SIZE` (XS…3XL + Free Size).

## Settings keys (`.data/settings.json`)

| Key | Default | Effect |
| --- | --- | --- |
| `storeName` | Noor Ethnic Wear | header/footer text |
| `codLimit` | 350000 | checkout gating |
| `codFee` | 5000 | order total |
| `freeShipping` | true | shipping line |
| `upiId` | noorclothing@upi | manual fallback |
| `supportPhone` |  | header, order page |
| `supportEmail` | owner ka apna Google account | contact |
| `announcement` | "Free shipping on all orders" | top bar |
| `whatsappNumber` |  | CTAs |

## Field-level PII

| Field | Purpose | Retention |
| --- | --- | --- |
| name, phone, address | delivery | 3 years (GST/consumer) |
| email | order updates | 3 years |
| notes | delivery instructions | 1 year |
| messages | support | 1 year |

## Derived

- `subtotal` = Σ(price × quantity)
- `discount` = `round(subtotal * pct)`
- `total` = max(0, subtotal − discount + (cod ? `COD_FEE` : 0))
- `AOV` (admin) = Σ total / order count (excluding cancelled)
