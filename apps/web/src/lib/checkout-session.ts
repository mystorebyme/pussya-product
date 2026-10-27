/**
 * Checkout session — "payment se back → review" (owner rule, R33).
 *
 * Flow: 1) delivery details → 2) review → 3) payment (checkout ke andar hi).
 * Order place hote hi cart khali ho jaata hai, isliye payment page se wapas
 * aane par review dikhane ke liye order ka ek chhota snapshot `sessionStorage`
 * me rakhte hain. Isme **koi payment/UPI detail nahi** hoti — sirf wahi cheezein
 * jo customer ko review par dikhni chahiye.
 *
 * Session storage isliye: tab band → snapshot khud mit jaata hai (customer ke
 * device par kuch permanent nahi bachta).
 */

export type PlacedOrderItem = {
  title: string;
  image: string;
  size?: string;
  colour?: string;
  quantity: number;
  price: number;
};

export type PlacedOrderSnapshot = {
  orderNumber: string;
  total: number;
  placedAt: string;
  items: PlacedOrderItem[];
  customer: {
    name: string;
    phone: string;
    email: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    notes?: string;
  };
};

const STORAGE_KEY = "noor:last-placed-order";
/** Snapshot kitni der valid hai — 6 ghante (payment usi din hota hai). */
const MAX_AGE_MS = 6 * 60 * 60 * 1000;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.sessionStorage;
  } catch {
    // private mode / storage blocked — review tab dobara nahi dikhega, order safe hai
    return null;
  }
}

export function savePlacedOrder(snapshot: PlacedOrderSnapshot): void {
  const store = storage();
  if (!store) return;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(snapshot));
  } catch {
    // quota/private mode — koi error nahi dikhate, order already server par hai
  }
}

export function clearPlacedOrder(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/**
 * Snapshot padho. `orderNumber` diya ho to **wahi** order chahiye (warna null) —
 * isse purana snapshot galti se doosre order ke review par nahi dikhta.
 */
export function readPlacedOrder(orderNumber?: string | null, now: number = Date.now()): PlacedOrderSnapshot | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlacedOrderSnapshot;
    if (!parsed?.orderNumber || !Array.isArray(parsed.items) || parsed.items.length === 0) return null;
    if (orderNumber && parsed.orderNumber !== orderNumber) return null;
    const placedAt = Date.parse(parsed.placedAt);
    if (!Number.isFinite(placedAt) || now - placedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Review (step 2) ka URL — payment se "back" isi par jaata hai. */
export function reviewUrl(orderNumber: string): string {
  return `/checkout?step=review&order=${encodeURIComponent(orderNumber)}`;
}

/**
 * Payment (step 3) ka URL — **checkout ke andar hi**, alag page nahi (owner, R36).
 *
 * Iska do fayda:
 *   1. Order place hote hi yahi URL history me push hota hai → step 3 khulta hai,
 *      aur browser ka back review (step 2) par jaata hai.
 *   2. Customer baad me wahi order kholta hai (link/refresh/doosra tab) to
 *      `/checkout?step=payment&order=NE-…` se payment dobara chal jaata hai —
 *      data `/api/orders/<n>/payment-context` se aata hai.
 * UPI app ka callback bhi isi URL par aata hai (`&upi=return&t=…`).
 */
export function paymentUrl(orderNumber: string): string {
  return `/checkout?step=payment&order=${encodeURIComponent(orderNumber)}`;
}
