import { getStoreSettings, saveStoreSettings } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ data: await getStoreSettings({ fresh: true }) });
}

export async function PUT(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }
  const actor = (body as { actor?: string })?.actor?.slice(0, 120) || "admin@noorethnicwear.in";
  const payload = (body as { settings?: unknown })?.settings ?? body;
  return Response.json({ data: await saveStoreSettings(payload, actor) });
}
