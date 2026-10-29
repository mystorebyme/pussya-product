import crypto from "node:crypto";

/**
 * UPI return callback — "pay karke wapas aaya" ko pakadne ka signed tareeka.
 *
 * Flow:
 *   1. Order page server par ek token banata hai: `HMAC(secret, "upi-return:<order>")`.
 *   2. UPI deep link me `url=<site>/orders/NE-XXXX?upi=return&t=<token>` jaata hai
 *      (NPCI spec ka `url` param — GPay/PhonePe/Paytm jahan support karte hain).
 *   3. Payment ke baad customer wapas aata hai; page `POST /api/payments/return`
 *      bhejta hai. Token match + order pending → payment paid + order confirmed.
 *   4. Owner bank me credit na dikhe to admin panel se "Not received" (undo) kar sakta hai.
 *
 * Secret: `UPI_RETURN_SECRET` (recommended), warna `ADMIN_API_TOKEN`. Token order
 * number se banta hai, isliye kisi doosre order ke liye reuse nahi hota.
 */

export const UPI_RETURN_FLAG = "upi_return";

export function upiReturnSecret(): string {
  return process.env.UPI_RETURN_SECRET || process.env.ADMIN_API_TOKEN || "designer-clothing-upi-return-dev";
}

export function signUpiReturn(orderNumber: string, secret = upiReturnSecret()): string {
  return crypto
    .createHmac("sha256", secret)
    .update(`upi-return:${orderNumber.trim().toUpperCase()}`)
    .digest("base64url")
    .slice(0, 24);
}

export function verifyUpiReturn(orderNumber: string, token: unknown, secret = upiReturnSecret()): boolean {
  const given = String(token ?? "").trim();
  if (!given) return false;
  const expected = signUpiReturn(orderNumber, secret);
  if (given.length !== expected.length) return false;
  return crypto.timingSafeEqual(Buffer.from(given), Buffer.from(expected));
}

/** Order page / UPI app ke liye poora callback URL (query params already encoded) */
export function upiReturnCallbackUrl(siteUrl: string, orderNumber: string, token: string): string {
  const base = siteUrl.replace(/\/+$/, "");
  const query = new URLSearchParams({ upi: "return", t: token });
  return `${base}/orders/${encodeURIComponent(orderNumber)}?${query.toString()}`;
}

/** UPI app jo reference bhejta hai (txnId / approvalRefNo / rrn / tr) */
const REFERENCE_KEYS = ["txnId", "txnRef", "approvalRefNo", "rrn", "tr", "TransactionID"];

export function referenceFromReturnQuery(params: URLSearchParams): string | null {
  for (const key of REFERENCE_KEYS) {
    const value = params.get(key);
    if (!value) continue;
    const clean = value.replace(/[^A-Za-z0-9-]/g, "").toUpperCase().slice(0, 30);
    if (clean.length >= 4) return clean;
  }
  return null;
}

/** UPI app ne failure bheja ho to auto-confirm nahi karte */
export function returnLooksSuccessful(params: URLSearchParams): boolean {
  const raw = (params.get("txnStatus") ?? params.get("status") ?? params.get("Status") ?? "").trim().toUpperCase();
  if (!raw) return true; // app ne status nahi bheja — return hi signal hai
  return ["SUCCESS", "SUCCESSFUL", "PAID", "COMPLETED", "TXN_SUCCESS"].includes(raw);
}
