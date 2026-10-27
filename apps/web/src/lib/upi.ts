/**
 * UPI (BHIM / GPay / PhonePe / Paytm) — direct payment, koi gateway nahi.
 *
 * Owner ka UPI ID Google Sheet / admin settings se aata hai. Customer QR scan
 * karke ya UPI app se pay karta hai, phir reference (UTR) submit karta hai;
 * admin verify karke order confirm karta hai. Isliye paisa seedha owner ke
 * account me jaata hai — koi third-party hold nahi.
 */

export type UpiTarget = {
  /** `yourstore@upi` jaisa VPA — sheet ke Settings tab (`upi_id`) se aata hai */
  vpa: string;
  /** payee name (UPI app me dikhta hai) */
  name: string;
  /** paise me */
  amountPaise: number;
  /** transaction note — order number hi rakhte hain */
  note: string;
  /** optional transaction reference */
  txnRef?: string;
  /** UPI app payment ke baad yahan wapas aata hai (https URL + signed token) */
  callbackUrl?: string;
};

/** UPI ID validate — "name@bank" shape, koi space/special nahi */
export function normaliseUpiId(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.trim();
  if (!/^[a-zA-Z0-9._-]{2,64}@[a-zA-Z]{2,32}$/.test(clean)) return null;
  return clean;
}

export function formatUpiAmount(amountPaise: number): string {
  return (Math.max(0, Math.round(amountPaise)) / 100).toFixed(2);
}

/** `upi://pay?...` — mobile par seedha UPI app khulta hai */
export function buildUpiUri(target: UpiTarget): string {
  const params = new URLSearchParams({
    pa: target.vpa,
    pn: target.name.slice(0, 50),
    am: formatUpiAmount(target.amountPaise),
    cu: "INR",
    tn: target.note.slice(0, 50),
  });
  if (target.txnRef) params.set("tr", target.txnRef.slice(0, 35));
  // NPCI deep-link spec: `url` = callback. Jahan app support karta hai, payment
  // ke baad customer seedha order page par wapas aata hai (auto-confirm ke liye).
  if (target.callbackUrl) params.set("url", target.callbackUrl.slice(0, 512));
  return `upi://pay?${params.toString()}`;
}

/** Payment reference (UTR) — bank/UPI app 12 digit number deta hai */
export function normaliseUpiReference(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const clean = value.replace(/[\s-]/g, "").toUpperCase();
  if (!/^[A-Z0-9]{6,30}$/.test(clean)) return null;
  return clean;
}
