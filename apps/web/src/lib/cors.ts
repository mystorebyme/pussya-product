/**
 * CORS — sirf un public API routes ke liye jinhe GitHub Pages (static preview)
 * se browser direct call karta hai: `POST /api/orders`, `/api/payments/manual`,
 * `/api/payments/failed` aur `GET /api/settings`.
 *
 * Kyun chahiye: Pages par Node server nahi hota, isliye order/payment call
 * `NEXT_PUBLIC_API_BASE_URL` (Render) par cross-origin jaati hai. Bina CORS ke
 * browser response block kar deta hai aur customer ka order place nahi hota —
 * wahi "UPI ke baad order nahi bana" wali problem thi.
 *
 * Allowlist hi chalti hai (koi `*` nahi), kyunki in routes me customer ka
 * phone/address aata hai:
 *   - apni site (`NEXT_PUBLIC_SITE_URL`) — Netlify/custom domain yahin se aata hai
 *   - GitHub Pages origin (repo preview)
 *   - localhost (dev/preview)
 *   - apne `*.netlify.app` sites (production + deploy previews)
 *   - purane `*.onrender.com` hosts
 */

function extraOrigins(): string[] {
  return (process.env.CORS_ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function allowlist(): string[] {
  const site = process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "");
  return [
    ...(site ? [site, site.replace("://www.", "://")] : []),
    "https://mystorebyme.github.io",
    // Netlify ka apna subdomain (jab tak custom domain na jude)
    "https://noor-clothing.netlify.app",
    "http://localhost:3000",
    "http://127.0.0.1:3000",
    "http://localhost:3100",
    "http://127.0.0.1:3100",
    ...extraOrigins(),
  ];
}

function originAllowed(origin: string): boolean {
  if (!origin) return false;
  if (allowlist().includes(origin)) return true;
  // Netlify: main site + branch/deploy previews (`<deploy>--<site>.netlify.app`)
  if (/^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.netlify\.app$/.test(origin)) return true;
  // apne purane Render services (storefront + admin) — sirf onrender.com subdomains
  return /^https:\/\/[a-z0-9-]+(\.[a-z0-9-]+)*\.onrender\.com$/.test(origin);
}

export function corsHeaders(request: Request): Record<string, string> {
  const origin = request.headers.get("origin") ?? "";
  const headers: Record<string, string> = { Vary: "Origin" };
  if (originAllowed(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
    headers["Access-Control-Allow-Credentials"] = "false";
  }
  return headers;
}

/** OPTIONS preflight — har public route me `export const OPTIONS = preflight` */
export function preflight(request: Request): Response {
  return new Response(null, {
    status: 204,
    headers: {
      ...corsHeaders(request),
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Idempotency-Key, Authorization",
      "Access-Control-Max-Age": "600",
    },
  });
}

/** Response par CORS headers chipka do (status/body wahi rehta hai) */
export function withCors(response: Response, request: Request): Response {
  const headers = corsHeaders(request);
  if (Object.keys(headers).length === 1) return response; // sirf Vary — origin allow nahi
  const merged = new Headers(response.headers);
  Object.entries(headers).forEach(([key, value]) => merged.set(key, value));
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers: merged });
}
