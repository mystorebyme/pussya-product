/**
 * Simple fixed-window rate limiter (in-memory).
 *
 * Kyun: order / contact / newsletter / payment API ko koi bot ya script
 * sau baar hit karke fake orders, spam ya sheet rows na bana sake. Server par
 * ek hi process (Vercel function instance) me counter rakhte hain — serverless
 * par instance ke saath reset ho jaata hai, lekin burst abuse (jo asli dikkat
 * hai) usi window me pakad li jaati hai.
 *
 * Note: ye **security ka aakhri layer** hai, pehla nahi. Asli protection:
 *   • amount server par recompute hota hai (client ka total kabhi trust nahi)
 *   • order number server banata hai
 *   • payment confirm sirf phone last-4 + order record se hota hai
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
/** memory leak na ho — window cross hone ke baad purane buckets hata do */
const MAX_BUCKETS = 5_000;

export type RateLimitRule = {
  /** endpoint ka naam (logs / test ke liye) */
  name: string;
  /** window me kitni requests allowed */
  limit: number;
  /** window length (ms) */
  windowMs: number;
};

/** Owner-tuned default: asli customer kabhi isse takrata nahi. */
export const RATE_LIMITS = {
  orders: { name: "orders", limit: 10, windowMs: 60_000 },
  contact: { name: "contact", limit: 5, windowMs: 10 * 60_000 },
  newsletter: { name: "newsletter", limit: 5, windowMs: 10 * 60_000 },
  reviews: { name: "reviews", limit: 5, windowMs: 10 * 60_000 },
  payments: { name: "payments", limit: 20, windowMs: 5 * 60_000 },
} as const satisfies Record<string, RateLimitRule>;

/** True client IP — Vercel/Cloudflare/proxy headers, warna `anonymous`. */
export function clientIp(request: Request): string {
  const headers = request.headers;
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    headers.get("x-real-ip") ??
    headers.get("cf-connecting-ip") ??
    headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ??
    "anonymous"
  );
}

export type RateLimitResult = { ok: true } | { ok: false; retryAfterSeconds: number };

/**
 * Counter badhao aur batao ki request allowed hai ya nahi.
 * `now` inject kiya ja sakta hai (tests ke liye).
 */
export function hitRateLimit(key: string, rule: RateLimitRule, now = Date.now()): RateLimitResult {
  if (buckets.size > MAX_BUCKETS) {
    for (const [bucketKey, bucket] of buckets) {
      if (bucket.resetAt <= now) buckets.delete(bucketKey);
    }
    if (buckets.size > MAX_BUCKETS) buckets.clear();
  }

  const id = `${rule.name}:${key}`;
  const current = buckets.get(id);
  if (!current || current.resetAt <= now) {
    buckets.set(id, { count: 1, resetAt: now + rule.windowMs });
    return { ok: true };
  }
  if (current.count >= rule.limit) {
    return { ok: false, retryAfterSeconds: Math.max(1, Math.ceil((current.resetAt - now) / 1000)) };
  }
  current.count += 1;
  return { ok: true };
}

/**
 * Route ke shuru me call kariye. `null` = request aage badh sakti hai,
 * warna ready-made 429 response return kar dijiye.
 */
export function enforceRateLimit(request: Request, rule: RateLimitRule, now = Date.now()): Response | null {
  const result = hitRateLimit(clientIp(request), rule, now);
  if (result.ok) return null;
  return Response.json(
    {
      error: "Bahut zyada requests aa rahi hain — thodi der baad koshish kariye.",
      retryAfterSeconds: result.retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "retry-after": String(result.retryAfterSeconds),
        "cache-control": "no-store",
      },
    },
  );
}

/** tests ke liye — saare counters saaf */
export function resetRateLimits(): void {
  buckets.clear();
}
