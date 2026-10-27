/**
 * @noor/types
 * Web, admin aur api teeno yahi types use karte hain.
 * Rule: paisa hamesha INTEGER PAISE me. Kabhi float nahi.
 */

export type Currency = "INR";

export type ProductCategory = "anarkali" | "lehnga" | "printed" | "saree" | "gown" | "sharara" | "other";

/** size-wise live variant: store me kuch sizes ka price/MRP alag hota hai */
export interface SizePricing {
  price: number;
  compareAtPrice: number | null;
  available: boolean;
}

export interface Product {
  /** URL-safe ASCII slug (emoji/space strip karke) */
  handle: string;
  /** original noorethnicwear.in handle — traceability ke liye */
  sourceHandle: string;
  title: string;
  /** selling price in paise */
  price: number;
  /** MRP in paise (null = no strike-through) */
  compareAtPrice: number | null;
  /** poori gallery — CDN urls, pehli image primary (live store se exact) */
  images: string[];
  /** live body_html se sanitized description (paragraphs, bullets) */
  descriptionHtml?: string;
  /** live Shopify product_type (sirf reference) */
  productType?: string | null;
  /** per-size price/availablity, size string se keyed */
  sizePricing?: Record<string, SizePricing>;
  collections: string[];
  category: ProductCategory;
  fabric: string;
  color: string;
  sizes: string[];
  details: string[];
  description: string;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  featured: boolean;
  /** live store ka publish timestamp — "New Arrivals" sort ke liye */
  publishedAt?: string | null;
  /** same design ke doosre colours (live store par alag products) ka group key */
  colourGroup?: string | null;
  /** is product ka colour naam, jaise "Maroon" */
  colourName?: string | null;
}

export interface Collection {
  handle: string;
  title: string;
  subtitle: string;
  image: string;
  sortOrder: number;
  /** live store ke collection page par dikhne wala count */
  productCount?: number;
}

export interface ColourOption {
  name: string;
  handle: string;
  /** us colourway ka apna product title (cart/order me wahi dikhe) */
  title?: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  images: string[];
  sizes: string[];
  sizePricing?: Record<string, SizePricing>;
  inStock: boolean;
  colourCode?: string;
}

export interface ColourGroup {
  key: string;
  title: string;
  /** group ka representative product (jiski URL canonical hai) */
  handle: string;
  colours: ColourOption[];
}

export interface Catalog {
  meta: {
    store: string;
    source: string;
    cdn: string;
    currency: Currency;
    moneyUnit: "paise";
    builtAt: string;
    /** jis live snapshot se build hua */
    snapshotAt?: string | null;
    productCount: number;
    /** colour groups ke baad kitne cards list hote hain */
    listedProductCount?: number;
    colourGroupCount?: number;
    imageCount?: number;
  };
  collections: Collection[];
  colourGroups?: Record<string, ColourGroup>;
  products: Product[];
}

export interface CartLineInput {
  handle: string;
  size: string;
  quantity: number;
}

export type PaymentMethod = "prepaid" | "cod";

export type OrderStatus =
  | "placed"
  | "confirmed"
  | "packed"
  | "shipped"
  | "delivered"
  | "cancelled"
  | "returned";

export type PaymentStatus = "pending" | "processing" | "paid" | "failed" | "cod" | "refunded";

/** Order ke saath juda payment attempt — gateway/manual UPI, backend verify hone tak pending */
export interface PaymentRecord {
  /** kis gateway se aaya (razorpay/cashfree/manual-upi) */
  gateway: string;
  /** gateway ka apna reference (order id / payment id) */
  reference: string | null;
  /** customer ko dikhaya gaya UPI intent / QR */
  upiUri?: string | null;
  amount: number;
  status: PaymentStatus;
  createdAt: string;
  /** backend ne gateway se verify karke confirm kiya */
  verifiedAt?: string | null;
  verifiedBy?: string | null;
  failureReason?: string | null;
}

export interface OrderItem {
  handle: string;
  title: string;
  image: string;
  size: string;
  quantity: number;
  /** unit price in paise */
  price: number;
}

export interface Address {
  fullName: string;
  phone: string;
  email: string;
  line1: string;
  city: string;
  state: string;
  pincode: string;
}

export interface Order {
  id: string;
  orderNumber: string;
  createdAt: string;
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string | null;
  items: OrderItem[];
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  couponCode: string | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  /** payment attempt ki poori detail — verified hone tak order confirm nahi hota */
  payment?: PaymentRecord | null;
  status: OrderStatus;
  /** admin ka live note — "abhi kahan atka hai", customer ko tracking page par dikhta hai */
  statusNote?: OrderStatusNote | null;
  /** courier + AWB — admin panel se bhara jaata hai, customer track page par dikhta hai */
  tracking?: Tracking | null;
  /** GST invoice meta — invoice generate hote hi lock ho jaata hai */
  invoice?: InvoiceMeta | null;
  /** har mutation ka record — kisne kya badla */
  audit: AuditEntry[];
}

export interface OrderStatusNote {
  text: string;
  at: string;
  by: string;
  /** note ke waqt ka status, taaki history me saaf rahe */
  status: OrderStatus;
}

export interface Tracking {
  courier: string | null;
  awb: string | null;
  url: string | null;
  shippedAt: string | null;
  deliveredAt: string | null;
  updatedAt: string;
  updatedBy: string;
}

export interface InvoiceMeta {
  /** LK/2627/0001 jaisa serial — ek baar assign hone par badalta nahi */
  number: string;
  issuedAt: string;
  /** taxable value + tax split, paise me */
  taxableValue: number;
  cgst: number;
  sgst: number;
  igst: number;
  gstRate: number;
  hsn: string;
  placeOfSupply: string;
}

export interface AuditEntry {
  at: string;
  actor: string;
  action: string;
  meta?: Record<string, unknown>;
}

export interface ApiError {
  code: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  perPage: number;
  total: number;
  totalPages: number;
}

/* ─────────────────────── delivery serviceability ───────────────────────
 * Pincode check asli data par chalta hai (India Post 19,486 pincodes).
 * Admin state-wise allow/block karta hai aur koi bhi specific pincode
 * block (ya block state me bhi allow) kar sakta hai. */

export type DeliveryPinRule = {
  pincode: string;
  note?: string;
  at: string;
  by?: string;
};

export type DeliverySettings = {
  updatedAt: string;
  updatedBy: string;
  /** true = saare states allowed (jab tak admin kuch restrict na kare) */
  allowAllStates: boolean;
  /** state -> allowed (sirf tab matlab rakhta hai jab allowAllStates false ho) */
  states: Record<string, boolean>;
  /** ye pincodes kabhi deliver nahi honge (state allowed ho tab bhi) */
  blockedPincodes: DeliveryPinRule[];
  /** state blocked ho par ye specific pincodes allowed rahenge */
  allowedPincodes: DeliveryPinRule[];
  /** estimate copy jo customer ko dikhti hai */
  deliveryDays: string;
  freeShipping: boolean;
};

export type ServiceabilityReason =
  | "ok"
  | "invalid"
  | "unknown"
  | "blocked"
  | "state_blocked"
  | "state_not_allowed";

export type Serviceability = {
  serviceable: boolean;
  pincode: string;
  state: string | null;
  district: string | null;
  reason: ServiceabilityReason;
  message: string;
  deliveryDays: string | null;
};

/* ─────────────────────── manual (admin) invoice ─────────────────────── */

export type ManualInvoiceItem = { title: string; size?: string; quantity: number; price: number };

export type ManualInvoice = {
  number: string;
  createdAt: string;
  createdBy: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  items: ManualInvoiceItem[];
  subtotal: number;
  total: number;
  notes?: string;
  orderRef?: string;
};
