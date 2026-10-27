/**
 * Manual invoice number (`LK/MANUAL/0001`) URL me seedha nahi ja sakta —
 * slash path separator ban jaata hai aur page 404 ho jaata hai.
 * Isliye slug me `/` ko `~` se badalte hain (URL-safe, lossless).
 */
export function invoiceSlug(number: string): string {
  return number.replace(/\//g, "~");
}

export function invoiceFromSlug(slug: string): string {
  return decodeURIComponent(slug).replace(/~/g, "/");
}
