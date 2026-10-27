/**
 * Domain / origin — **sab kuch env se**, code me koi domain hardcoded nahi.
 *
 * Noor Ethnic Wear ka domain abhi final nahi hai. Isliye:
 *   1. `CANONICAL_ORIGIN` — `NEXT_PUBLIC_SITE_URL` env se aata hai (asli domain).
 *      Env na ho (local dev) to `http://localhost:3000`.
 *   2. `OWN_HOSTS` — `NEXT_PUBLIC_SITE_HOSTS` (comma se alag) me apne domains
 *      daal dijiye, aur `.vercel.app` / `.netlify.app` / `.onrender.com` hosts
 *      by default apne maane jaate hain (traffic tracking internal rahe).
 *
 * Domain lagne par sirf env badalna hai — koi code change nahi, koi redeploy ka
 * jhanjhat nahi chhod kar.
 */

const DEV_ORIGIN = "http://localhost:3000";

function clean(value: string | undefined | null): string {
  return (value ?? "").trim().replace(/\/+$/, "");
}

/** Production ka canonical origin (no trailing slash). */
export const CANONICAL_ORIGIN =
  clean(process.env.NEXT_PUBLIC_SITE_URL) || clean(process.env.NEXT_PUBLIC_SITE_ORIGIN) || DEV_ORIGIN;

/** Admin panel ka origin — alag subdomain ho to env me daaliye, warna site hi. */
export const CANONICAL_ADMIN_ORIGIN = clean(process.env.NEXT_PUBLIC_ADMIN_URL) || CANONICAL_ORIGIN;

/** Owner ke apne hosts (env se) — baaki platform hosts wildcard se handle hote hain. */
const OWN_HOSTS = (process.env.NEXT_PUBLIC_SITE_HOSTS ?? "")
  .split(",")
  .map((host) => host.trim().toLowerCase().replace(/^www\./, ""))
  .filter(Boolean);

function hostOf(raw: string): string {
  return raw.trim().toLowerCase().replace(/^www\./, "");
}

/** Platform preview hosts — inhe bhi "apna" ginte hain (SEO canonical nahi). */
const PLATFORM_SUFFIXES = [".vercel.app", ".netlify.app", ".onrender.com", ".pages.dev", ".workers.dev"];

/** Host apna hai? (www hata kar compare, case-insensitive) */
export function isOwnHost(raw: string | null | undefined): boolean {
  if (!raw) return false;
  let host = hostOf(raw);
  try {
    if (host.includes("://")) host = new URL(host).hostname.toLowerCase();
  } catch {
    return false;
  }
  host = host.replace(/^www\./, "");
  if (!host) return false;
  if (host === "localhost" || host === "127.0.0.1") return true;
  if (OWN_HOSTS.includes(host)) return true;
  try {
    if (hostOf(new URL(CANONICAL_ORIGIN).hostname) === host) return true;
  } catch {
    /* env me URL galat ho to chhod do */
  }
  return PLATFORM_SUFFIXES.some((suffix) => host.endsWith(suffix));
}
