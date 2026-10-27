import { contactSchema } from "@noor/validation";
import { mirrorMessageToSheet, saveMessage } from "@/lib/messages";
import { contactChannels, notifyContactMessage } from "@/lib/notify";
import { runInBackground } from "@/lib/background";

export const dynamic = "force-dynamic";

/**
 * Contact form — message pehle save hota hai (Postgres/local), phir owner ko
 * email jaata hai. Email provider fail ho jaaye to bhi customer ko success hi
 * milta hai (message kho nahi sakta) aur admin panel me dikhta hai.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = contactSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json({ error: first?.message ?? "Please check the details." }, { status: 400 });
  }

  const input = parsed.data;
  const message = await saveMessage(input);
  /**
   * Owner ki Google Sheet me row — response ke **baad** bhi chalti rahe.
   * (`void promise` Vercel par freeze ho jaata tha → sheet me row nahi aati thi.)
   */
  runInBackground(() => mirrorMessageToSheet(message));

  // best-effort email — kabhi request fail nahi karta
  let delivered: Awaited<ReturnType<typeof notifyContactMessage>> = [];
  try {
    delivered = await notifyContactMessage(input);
  } catch (error) {
    console.error("[contact] notify failed", error instanceof Error ? error.message : error);
  }
  if (delivered.some((result) => !result.ok)) {
    console.warn("[contact] email delivery issues", JSON.stringify(delivered));
  }

  return Response.json(
    {
      ok: true,
      id: message.id,
      message: "Thank you! Our team will reply within 24 hours.",
      channels: contactChannels(),
    },
    { status: 201 },
  );
}
