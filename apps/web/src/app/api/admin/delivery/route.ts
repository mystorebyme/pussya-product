import { getDeliverySettings, saveDeliverySettings } from "@/lib/delivery";
import { deliveryStates, pincodeCount, stateStats } from "@/lib/pincodes";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

/** GET /api/admin/delivery — settings + state list + pincode counts */
export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const settings = await getDeliverySettings({ fresh: true });
  return Response.json({
    settings,
    states: stateStats(),
    totals: { pincodes: pincodeCount(), states: deliveryStates.length },
  });
}

/** PUT /api/admin/delivery — poore settings ek saath (admin panel se) */
export async function PUT(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const actor =
    (body as { actor?: string })?.actor?.slice(0, 120) || "admin@noorethnicwear.in";
  const payload = (body as { settings?: unknown })?.settings ?? body;
  const settings = await saveDeliverySettings(payload, actor);
  return Response.json({ data: settings });
}
