/**
 * `/orders/<number>` aur `/orders/<number>/pay` path padhne wala chhota helper.
 *
 * Kyun alag file: GitHub Pages ka `404.html` shell URL se order number nikalta
 * hai, aur wahi logic live store par redirect karne ke liye bhi chahiye. Isse
 * unit test me seedha check kar sakte hain (browser ke bina).
 *
 * Handle karta hai:
 *   • base path (`/tannu-product-/orders/…` — GitHub Pages repo path)
 *   • `/pay` suffix (payment page) aur `?pay=1` query (query yahan nahi aata)
 *   • chhote/baade letters (`lk-ni93oty5o4` → `NE-NI93OTY5O4`)
 */

export type ParsedOrderPath = {
  orderNumber: string;
  /** payment page? (`/orders/NE-…/pay`) */
  pay: boolean;
  /** live store par yahi page ka path — redirect ke liye */
  livePath: string;
};

export function parseOrderPath(pathname: string, basePath = ""): ParsedOrderPath | null {
  let path = pathname || "/";
  const base = basePath.replace(/\/+$/, "");
  if (base && (path === base || path.startsWith(`${base}/`))) {
    path = path.slice(base.length) || "/";
  }
  const match = /^\/orders\/([A-Za-z0-9-]+)(\/pay)?\/?$/.exec(path);
  if (!match) return null;
  const orderNumber = match[1]!.toUpperCase();
  const pay = Boolean(match[2]);
  return { orderNumber, pay, livePath: `/orders/${orderNumber}${pay ? "/pay" : ""}` };
}
