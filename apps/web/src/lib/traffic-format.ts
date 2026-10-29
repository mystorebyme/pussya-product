import { isOwnHost } from "./domain";

/**
 * Traffic helpers — **pure** (koi DB/net import nahi, isliye unit test aasan).
 *
 * Owner ko "pure traffic ka pata chale": kaunse page par kitne log aaye, kahan se
 * aaye (Google / Instagram / direct). Ye data hamare hi paas (Postgres) rehta hai —
 * kisi dashboard toggle par depend nahi karta.
 */

/** Query string / hash hata kar sirf page ka raasta — `/products/xyz` */
export function normalisePath(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  let path = raw.trim().split("#")[0]?.split("?")[0] ?? "";
  if (!path.startsWith("/")) return null;
  // apne andar ke technical routes count nahi karte
  if (/^\/(api|_next|admin|_vercel)\b/.test(path)) return null;
  // trailing slash ek hi page hai
  if (path.length > 1 && path.endsWith("/")) path = path.replace(/\/+$/, "");
  // galti se lamba URL aa jaye to kaat do
  return path.slice(0, 180);
}

/**
 * Referrer → chhota label. Poora URL nahi rakhte (privacy + storage):
 * `google`, `instagram`, `facebook`, `whatsapp`, `direct`, ya `other`.
 */
export function normaliseReferrer(raw: unknown): string {
  if (typeof raw !== "string" || !raw.trim()) return "direct";
  let host: string;
  try {
    host = new URL(raw).hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return "direct";
  }
  if (!host) return "direct";
  if (/google\./.test(host)) return "google";
  if (/instagram\./.test(host)) return "instagram";
  if (/(facebook|fb)\./.test(host)) return "facebook";
  if (/whatsapp\.|wa\.me/.test(host)) return "whatsapp";
  if (/bing\./.test(host)) return "bing";
  if (/pinterest\./.test(host)) return "pinterest";
  if (/youtube\./.test(host)) return "youtube";
  // apne hosts (naya domain + purana Vercel URL) internal mane jaate hain
  if (isOwnHost(host)) return "internal";
  return "other";
}

/** Bot / preview traffic ko count nahi karte — warna data ganda ho jaata hai. */
export function isBotUserAgent(ua: unknown): boolean {
  if (typeof ua !== "string" || !ua.trim()) return true;
  return /bot|crawler|spider|crawling|headless|preview|curl|wget|python-requests|monitor|uptime/i.test(ua);
}

/** Admin panel ke charts ke liye din ki label `YYYY-MM-DD` */
export function todayKey(now: Date = new Date()): string {
  return now.toISOString().slice(0, 10);
}
