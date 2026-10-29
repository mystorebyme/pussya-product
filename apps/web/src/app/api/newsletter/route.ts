import { newsletterSchema } from "@noor/validation";
import { mirrorSubscriberToSheet, saveSubscriber } from "@/lib/messages";
import { runInBackground } from "@/lib/background";
import { RATE_LIMITS, enforceRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const limited = enforceRateLimit(request, RATE_LIMITS.newsletter);
  if (limited) return limited;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  const parsed = newsletterSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Please enter a valid email address." }, { status: 400 });
  }
  const result = await saveSubscriber(parsed.data.email);
  if (!result.duplicate) runInBackground(() => mirrorSubscriberToSheet(parsed.data.email));
  return Response.json({ ok: true, duplicate: result.duplicate }, { status: 201 });
}
