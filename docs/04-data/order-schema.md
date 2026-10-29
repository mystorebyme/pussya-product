# Order schema

```ts
type OrderStatus = "placed" | "confirmed" | "packed" | "shipped" | "delivered" | "cancelled" | "returned";
type PaymentStatus = "pending" | "paid" | "failed" | "cod" | "refunded";

type OrderItem = {
  handle: string;
  title: string;
  size: string;        // catalogue size token, e.g. "M [38]"
  price: number;       // paise, purchase-time snapshot
  quantity: number;    // 1..10
  image: string;
};

type Order = {
  id: string;
  orderNumber: string;          // NE-XXXXXXXX
  createdAt: string;            // ISO
  updatedAt: string;
  status: OrderStatus;
  paymentMethod: "cod" | "prepaid";
  paymentStatus: PaymentStatus;
  paymentRef?: string;          // provider payment id
  // customer fields flat hote hain (nested object nahi)
  customerName: string;
  email: string;
  phone: string;              // 10 digit, +91 stripped
  address: string;
  city: string;
  state: string;
  pincode: string;            // 6 digit, leading zero nahi
  notes: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  couponCode: string | null;
  shipping: number;             // 0 (free)
  total: number;                // subtotal - discount + COD_FEE (cod only)
  audit: { at: string; actor: string; action: string; meta?: Record<string, unknown> }[];
};
```

## Invariants

- `total = max(0, subtotal - discount + (cod ? COD_FEE : 0))`, shipping always `0`.
- `items.length >= 1`, `quantity` 1..10.
- `size` product ke `sizes[]` me se hi hona chahiye — warna 400.
- `paymentMethod === "cod"` ⇒ `paymentStatus === "cod"` (delivery par `paid`) aur `subtotal <= 350000`.
- `prepaid` ⇒ `paymentStatus` starts `pending`.
- Order number unique, regex `^NE-[A-Z0-9]{6,12}$`.
- Invalid transition → `409 INVALID_TRANSITION` (web store helper 409 throw karta hai).
- Status transitions whitelist:

```
placed → confirmed | cancelled
confirmed → packed | cancelled
packed → shipped | cancelled
shipped → delivered | returned
delivered → returned
```
