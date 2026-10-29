import { runInBackground } from "@/lib/background";
import { isBotUserAgent, normalisePath, normaliseReferrer, todayKey } from "@/lib/traffic-format";
import { recordPageView, visitorHash } from "@/lib/traffic";

export const dynamic = "force-dynamic";

/**
 * `POST /api/track` — page view counter (first-party, koi cookie nahi).
 *
 * Body: `{ path: "/collections", ref: "https://www.google.com/" }`
 *
 * Privacy: IP aur user-agent sirf **hash** ban kar jaate hain (din ke saath),
 * isliye unique visitors gine ja sakte hain par kisi ko track nahi kiya ja sakta.
 * Bot / preview traffic count nahi hota, aur tracking kabhi request ko fail nahi
 * karti (jawab hamesha 204).
 */
export async function POST(request: Request) {
  const noContent = new Response(null, { status: 204, headers: { "cache-control": "no-store" } });

  const userAgent = request.headers.get("user-agent") ?? "";
  if (isBotUserAgent(userAgent)) return noContent;

  let body: { path?: unknown; ref?: unknown } = {};
  try {
    body = (await request.json()) as { path?: unknown; ref?: unknown };
  } catch {
    return noContent;
  }

  const path = normalisePath(body.path);
  if (!path) return noContent;

  const referrer = normaliseReferrer(body.ref);
  const day = todayKey();
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  const visitor = visitorHash(ip, userAgent, day);

  // response ke baad likha jaaye — customer ka page kabhi wait na kare
  runInBackground(() => recordPageView({ path, referrer, visitor, day }));

  return noContent;
}

/** GET par kuch nahi (koi data leak na ho) */
export async function GET() {
  return Response.json({ ok: true }, { headers: { "cache-control": "no-store" } });
}
