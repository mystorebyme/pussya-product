/**
 * @noor/validation
 * SINGLE SOURCE OF TRUTH: frontend aur backend dono yahi rules use karte hain.
 * Naya rule chahiye? yahan add karo, dono apps me automatic apply hoga.
 */
import { z } from "zod";

export const pincodeSchema = z
  .string()
  .trim()
  .regex(/^[1-9][0-9]{5}$/, "6 digit ka valid Indian pincode daaliye");

/**
 * R37 (owner): "mobile number me prefix 0 ya country code ya + aage accept karna
 * chahiye … 91 / +91 / 0 automatic hat jana chahiye aur 10 digit number aa jana
 * chahiye". Isliye transform me teeno prefix hat jaate hain — DB/sheet me hamesha
 * saaf 10 digit phone save hota hai.
 */
export function normaliseIndianPhoneDigits(raw: unknown): string {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits;
}

export const phoneSchema = z
  .string()
  .trim()
  .transform((value) => normaliseIndianPhoneDigits(value))
  .refine((value) => /^[6-9][0-9]{9}$/.test(value), "10 digit ka valid mobile number daaliye");

export const emailSchema = z.string().trim().toLowerCase().email("Valid email daaliye");

export const cartLineSchema = z.object({
  handle: z.string().min(1),
  size: z.string().min(1).max(40),
  quantity: z.number().int().min(1).max(10),
});

export const createOrderSchema = z.object({
  customerName: z.string().trim().min(2, "Poora naam daaliye").max(80),
  email: emailSchema,
  phone: phoneSchema,
  address: z.string().trim().min(10, "Poora address daaliye").max(300),
  city: z.string().trim().min(2).max(60),
  state: z.string().trim().min(2).max(60),
  pincode: pincodeSchema,
  notes: z.string().trim().max(500).optional().nullable(),
  couponCode: z.string().trim().toUpperCase().max(24).optional().nullable(),
  paymentMethod: z.enum(["prepaid", "cod"]).default("prepaid"),
  items: z.array(cartLineSchema).min(1, "Cart khaali hai").max(20),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export const orderStatusSchema = z.enum([
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
]);

export const updateOrderStatusSchema = z.object({
  status: orderStatusSchema,
  note: z.string().trim().max(200).optional(),
});

export const contactSchema = z.object({
  name: z.string().trim().min(2).max(80),
  email: emailSchema,
  phone: phoneSchema.optional(),
  subject: z.string().trim().max(80).optional(),
  message: z.string().trim().min(10).max(1500),
});

export const newsletterSchema = z.object({
  email: emailSchema,
});

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6).max(72),
});

/** ek hi jagah se business rules — UI aur API dono yahi call karein */
/**
 * Festive sale (Round 11): final price already ₹499–₹699 hai, isliye koi
 * percentage coupon stack nahi hota — warna customer ka final price badal jaata.
 * Naya offer dena ho to seedha price badlo (scripts/lib/sale-pricing.mjs).
 */
export const COUPONS: Record<string, number> = {};

export const COD_MAX_SUBTOTAL = 350_000; // Rs. 3500 in paise
export const COD_FEE = 5_000; // Rs. 50 in paise
export const FREE_SHIPPING_THRESHOLD = 0;

export function computeDiscount(subtotal: number, couponCode?: string | null): number {
  if (!couponCode) return 0;
  const percent = COUPONS[couponCode.toUpperCase()];
  if (!percent) return 0;
  return Math.round((subtotal * percent) / 100);
}

/** ---------- order status machine (web + api + admin ke liye ek hi truth) ---------- */

export const ORDER_STATUSES = [
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "delivered",
  "cancelled",
  "returned",
] as const;

export type OrderStatusName = (typeof ORDER_STATUSES)[number];

/** kaunse status se kaunse par ja sakte hain — baaki sab invalid */
export const ORDER_TRANSITIONS: Record<OrderStatusName, readonly OrderStatusName[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export function canTransition(from: OrderStatusName, to: OrderStatusName): boolean {
  if (from === to) return false;
  return ORDER_TRANSITIONS[from]?.includes(to) ?? false;
}

export const IDEMPOTENCY_TTL_MS = 7 * 24 * 60 * 60 * 1000;

const ORDER_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

/**
 * Order number: NE- + base36 timestamp (6) + 4 crypto-random chars.
 * 36^4 combinations per millisecond — double click / burst me bhi duplicate nahi.
 */
export function generateOrderNumber(now: number = Date.now()): string {
  const time = now.toString(36).toUpperCase().padStart(6, "0").slice(-6);
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  let random = "";
  for (const byte of bytes) random += ORDER_ALPHABET[byte % ORDER_ALPHABET.length];
  return `NE-${time}${random}`;
}

export const ORDER_NUMBER_PATTERN = /^NE-[A-Z0-9]{6,12}$/;

/* ────────────────────────── GST invoice (shared) ──────────────────────────
 * Apparel GST (22 Sep 2025 ke baad): per-piece value Rs. 2,500 tak 5%, usse
 * zyada par 18%. Prices site par inclusive hain, isliye tax ko total se
 * reverse-calculate karte hain — customer se extra kuch nahi liya jaata.
 * Web (invoice page/PDF) aur admin (order view) dono yahi functions use karte hain.
 */

export const GST_APPAREL_THRESHOLD = 250_000; // paise — Rs. 2,500 per piece
export const GST_APPAREL_RATE = 5;
export const GST_APPAREL_RATE_HIGH = 18;
export const GST_SERVICE_RATE = 18; // COD / shipping charges
export const GST_HSN_APPAREL = "6204";

export type TaxSplit = {
  rate: number;
  /** taxable value = total / (1 + rate) */
  taxable: number;
  cgst: number;
  sgst: number;
  igst: number;
  tax: number;
};

/** GST rate jo ek piece ki selling price par lagta hai */
export function apparelGstRate(unitPricePaise: number): number {
  return unitPricePaise <= GST_APPAREL_THRESHOLD ? GST_APPAREL_RATE : GST_APPAREL_RATE_HIGH;
}

/**
 * Tax-inclusive amount ko taxable + GST me todo.
 * @param grossPaise customer ne jo diya (tax included)
 * @param ratePercent 5 | 18
 * @param interState  true -> IGST, false -> CGST + SGST (half-half)
 */
export function splitTax(grossPaise: number, ratePercent: number, interState = false): TaxSplit {
  const gross = Math.max(0, Math.round(grossPaise));
  const taxable = Math.round((gross * 100) / (100 + ratePercent));
  const tax = gross - taxable; // rounding delta tax me daal diya -> taxable + tax === gross
  if (interState) {
    return { rate: ratePercent, taxable, cgst: 0, sgst: 0, igst: tax, tax };
  }
  const cgst = Math.floor(tax / 2);
  return { rate: ratePercent, taxable, cgst, sgst: tax - cgst, igst: 0, tax };
}

/** Financial year label: Apr-Mar -> "2026-27" */
export function financialYear(date: Date = new Date()): string {
  const year = date.getFullYear();
  const start = date.getMonth() + 1 >= 4 ? year : year - 1;
  return `${start}-${String((start + 1) % 100).padStart(2, "0")}`;
}

/** Invoice serial: LK/2026-27/0001 (ek baar issue hone par badalta nahi) */
export function invoiceNumber(sequence: number, date: Date = new Date()): string {
  return `LK/${financialYear(date)}/${String(sequence).padStart(4, "0")}`;
}

export const INVOICE_NUMBER_PATTERN = /^LK\/\d{4}-\d{2}\/\d{4}$/;

/** Indian state list — place-of-supply / CGST-SGST vs IGST decide karne ke liye */
export const SELLER_STATE = "Rajasthan";
