import { createManualInvoice, listManualInvoices } from "@/lib/manual-invoices";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

/** GET /api/admin/invoices — manual invoice list (admin panel) */
export async function GET(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return Response.json({ invoices: await listManualInvoices() }, { headers: { "cache-control": "no-store" } });
}

/** POST /api/admin/invoices — naya manual invoice */
export async function POST(request: Request) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const items = Array.isArray(body.items)
    ? (body.items as { title?: string; size?: string; quantity?: number; price?: number }[])
        .map((item) => ({
          title: String(item.title ?? "").trim(),
          size: item.size ? String(item.size) : undefined,
          quantity: Math.max(1, Number(item.quantity ?? 1) || 1),
          price: Math.round(Number(item.price ?? 0) || 0),
        }))
        .filter((item) => item.title && item.price > 0)
    : [];

  if (!items.length) return Response.json({ error: "Kam se kam ek item chahiye." }, { status: 400 });

  const invoice = await createManualInvoice({
    createdBy: String(body.createdBy ?? "admin"),
    customerName: String(body.customerName ?? "Customer").slice(0, 120),
    phone: String(body.phone ?? "").slice(0, 16),
    email: body.email ? String(body.email).slice(0, 120) : undefined,
    address: String(body.address ?? "").slice(0, 240),
    city: String(body.city ?? "").slice(0, 80),
    state: String(body.state ?? "Rajasthan").slice(0, 80),
    pincode: String(body.pincode ?? "").slice(0, 6),
    items,
    notes: body.notes ? String(body.notes).slice(0, 240) : undefined,
    orderRef: body.orderRef ? String(body.orderRef).slice(0, 40) : undefined,
  });

  return Response.json({ invoice }, { status: 201 });
}
