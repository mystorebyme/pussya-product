import { listMessages, markMessageHandled, mirrorMessageToSheet, setMessageReplied } from "@/lib/messages";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

/** GET /api/admin/messages — website ke contact form ke messages */
export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const limit = Number(new URL(request.url).searchParams.get("limit") ?? 100);
  return Response.json(
    { messages: await listMessages(Number.isFinite(limit) ? limit : 100) },
    { headers: { "cache-control": "no-store" } },
  );
}

/**
 * PATCH /api/admin/messages — { id, action: "handled" | "replied" | "unreplied", actor }
 *
 * `replied` = customer ko jawab bhej diya (inbox me alag status), `unreplied` = undo.
 */
export async function PATCH(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: { id?: string; actor?: string; action?: string };
  try {
    body = (await request.json()) as { id?: string; actor?: string; action?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const id = String(body.id ?? "").trim();
  if (!id) return Response.json({ error: "Message id chahiye." }, { status: 400 });
  const action = body.action ?? "handled";
  if (!["handled", "replied", "unreplied"].includes(action)) {
    return Response.json({ error: "Action handled | replied | unreplied me se hona chahiye." }, { status: 400 });
  }
  const actor = String(body.actor ?? "admin").slice(0, 120);
  const updated =
    action === "handled"
      ? await markMessageHandled(id, actor)
      : await setMessageReplied(id, action === "replied", actor);
  if (!updated) return Response.json({ error: "Message nahi mila." }, { status: 404 });
  // sheet me status row (best-effort) — owner ko bhi pata chale
  await mirrorMessageToSheet(updated).catch(() => undefined);
  return Response.json({ message: updated });
}
