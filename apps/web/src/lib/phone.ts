/**
 * Phone / WhatsApp helpers — **pure** (koi import nahi, koi env nahi).
 *
 * Kyun alag file: contact page ka "WhatsApp us" button `wa.me/98765…` bana
 * raha tha (bina country code) — WhatsApp ko **country code** chahiye hota hai,
 * warna "invalid number" aata hai. Sheet/admin me number kabhi `9876543210`,
 * kabhi `+91 98765 43210`, kabhi `919876543210` ho sakta hai — ye helper teeno
 * ko ek hi sahi link bana deta hai.
 *
 * Number ka asli source **Google Sheet → Settings** hai; yahan koi brand number
 * hardcoded nahi. Khaali input = khaali output (site us waqt WhatsApp CTA
 * dikhati hi nahi — galat number par customer ko bhejne se behtar hai).
 */

/** `wa.me` ke liye number — hamesha country code ke saath (India = 91). */
export function whatsappNumber(raw?: string | null, fallback = ""): string {
  const digits = String(raw ?? "").replace(/\D/g, "");
  if (!digits) return normaliseWhatsappDigits(String(fallback ?? "").replace(/\D/g, ""));
  return normaliseWhatsappDigits(digits);
}

function normaliseWhatsappDigits(digits: string): string {
  if (!digits) return "";
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length === 12 && digits.startsWith("91")) return digits;
  // kabhi `+91 91 98765…` jaisa duplicate aa jaye to pehle 12 digits hi rakho
  if (digits.startsWith("91")) return digits.slice(0, 12);
  return digits;
}

/**
 * R37 (owner): customer jo bhi likhe — `+91 98765 43210`, `919876543210`,
 * `09876543210` — sab se sirf **10 digit** ka mobile number ban jaata hai.
 * 12 digit starting `91` = country code; 11 digit starting `0` = trunk prefix.
 * Valid length na ho to `null` (caller validate karega).
 */
export function normaliseIndianPhone(raw?: string | null): string | null {
  let digits = String(raw ?? "").replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith("0")) digits = digits.slice(1);
  return digits.length === 10 ? digits : null;
}

/**
 * Type karte waqt auto-fix: jaise hi prefix poora ho jaaye field me sirf 10 digit
 * reh jaate hain (`+91 98765…` type karte hi `98765…`). Adhoora input untouched.
 */
export function autoFixPhoneInput(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length === 12 && digits.startsWith("91")) return digits.slice(2);
  if (digits.length === 11 && digits.startsWith("0")) return digits.slice(1);
  return value;
}

/** Sirf 10 digit ka local number (display ke liye). */
export function localPhone(raw?: string | null): string {
  const digits = whatsappNumber(raw);
  return digits.slice(-10);
}

/**
 * Poora wa.me link (optional pre-filled message ke saath).
 * Number na ho to `null` — caller button hi nahi dikhata (khaali `wa.me/` link
 * customer ko dead-end par bhejta hai).
 */
export function whatsappHref(raw?: string | null, message?: string): string | null {
  const number = whatsappNumber(raw);
  if (!number) return null;
  const base = `https://wa.me/${number}`;
  return message ? `${base}?text=${encodeURIComponent(message)}` : base;
}
