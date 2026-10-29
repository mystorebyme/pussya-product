/**
 * R39 (owner): "timezone india ka chalna chiye" — admin Vercel par UTC me SSR
 * hota hai, isliye subah 7:46 IST ka order "2:16 am" dikha tha. Sab yahi IST
 * constant use karte hain.
 */
export const STORE_TIME_ZONE = "Asia/Kolkata";

export function inr(paise: number): string {
  return `₹${Math.round(paise / 100).toLocaleString("en-IN")}`;
}

export function dateTime(iso: string): string {
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: STORE_TIME_ZONE,
  });
}

export function dateOnly(iso: string): string {
  return new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: STORE_TIME_ZONE });
}
