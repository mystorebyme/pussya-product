/**
 * Saved delivery details — "ek baar bhara, baar-baar recommend" (owner, R36).
 *
 * Customer ek baar naam / mobile / address / city / state / pincode bhar de to
 * agle order me wahi details **pehle se bhari** aati hain (browser ke
 * `localStorage` me). `sessionStorage` nahi, kyunki tab band karne ke baad bhi
 * yaad rehna chahiye.
 *
 * Privacy (owner rule + DPDP):
 *   • sirf delivery details — koi payment detail, UPI PIN, card number, OTP ya
 *     last-4 digit isme **kabhi nahi** jaata.
 *   • data sirf customer ke apne browser me rehta hai, server par nahi.
 *   • checkout par ek tap me "Naya address bharein" se saaf ho jaata hai.
 *
 * Storage block ho (private mode / quota) to chup-chaap skip — checkout kabhi
 * rukni nahi chahiye.
 */

import { normaliseIndianPhone } from "./phone";

export type CheckoutDetails = {
  customerName: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  notes: string;
  /** kab yaad kiya gaya (ISO) — 6 mahine baad recommend nahi hota */
  savedAt: string;
};

const STORAGE_KEY = "noor:checkout-details";
/** 6 mahine — uske baad purana address recommend nahi (customer badal jaata hai). */
const MAX_AGE_MS = 180 * 24 * 60 * 60 * 1000;
const MAX_TEXT = 200;

function storage(): Storage | null {
  try {
    if (typeof window === "undefined") return null;
    return window.localStorage;
  } catch {
    // private mode / storage blocked — details yaad nahi rahengi, order safe hai
    return null;
  }
}

/** ek field saaf karo: control character hatao, length cap, trim */
function clip(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.replace(/[\u0000-\u001f<>]/g, " ").trim().slice(0, max);
}

/**
 * Pure normaliser — `window` ki zaroorat nahi, isliye unit test seedha chal jaata hai.
 * Naam + 10-digit mobile + address + 6-digit pincode ke bina `null` (adhoori details
 * recommend karne se customer ko nuksaan: galat address par order chala jaata).
 */
export function normaliseCheckoutDetails(input: unknown, now: Date = new Date()): CheckoutDetails | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<Record<keyof CheckoutDetails, unknown>>;

  const details: CheckoutDetails = {
    customerName: clip(raw.customerName, 80),
    email: clip(raw.email, 120).toLowerCase(),
    phone: clip(raw.phone, 24).replace(/[^\d+]/g, ""),
    address: clip(raw.address, MAX_TEXT),
    city: clip(raw.city, 80),
    state: clip(raw.state, 60),
    pincode: clip(raw.pincode, 6).replace(/\D/g, "").slice(0, 6),
    notes: clip(raw.notes, 300),
    savedAt: now.toISOString(),
  };

  /**
   * Mobile sirf 10 digit rakhte hain — form me bhi wahi validation hai. Browser ka
   * autofill "+91 98765 43210" ya "09876543210" de deta hai, isliye country code /
   * leading zero utaar kar 10 digit banate hain.
   */
  const digits = normaliseIndianPhone(details.phone) ?? "";

  const usable =
    details.customerName.length >= 2 &&
    digits.length === 10 &&
    details.address.length >= 8 &&
    /^\d{6}$/.test(details.pincode);
  if (!usable) return null;
  details.phone = digits;
  return details;
}

/** Details yaad karo. Adhoori hon to save nahi hota (false). */
export function saveCheckoutDetails(input: unknown, now: Date = new Date()): boolean {
  const details = normaliseCheckoutDetails(input, now);
  const store = storage();
  if (!details || !store) return false;
  try {
    store.setItem(STORAGE_KEY, JSON.stringify(details));
    return true;
  } catch {
    // quota / private mode — koi error nahi, checkout chalti rahegi
    return false;
  }
}

/** Saved details padho (purani ho ya kharab ho to null). */
export function readCheckoutDetails(now: number = Date.now()): CheckoutDetails | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = normaliseCheckoutDetails(JSON.parse(raw));
    if (!parsed) return null;
    const savedAt = Date.parse(parsed.savedAt);
    if (!Number.isFinite(savedAt) || now - savedAt > MAX_AGE_MS) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** "Naya address bharein" — saved details hatao. */
export function clearCheckoutDetails(): void {
  const store = storage();
  if (!store) return;
  try {
    store.removeItem(STORAGE_KEY);
  } catch {
    /* ignore */
  }
}

/** Mobile ke last 4 digit — UPI confirm form me pehle se bhare jaate hain. */
export function phoneLast4(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}
