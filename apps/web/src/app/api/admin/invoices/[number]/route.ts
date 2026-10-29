import { getManualInvoice } from "@/lib/manual-invoices";

export const dynamic = "force-dynamic";

function authorize(request: Request): boolean {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  return Boolean(process.env.ADMIN_API_TOKEN) && token === process.env.ADMIN_API_TOKEN;
}

export async function GET(request: Request, context: { params: Promise<{ number: string }> }) {
  if (!authorize(request)) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const { number } = await context.params;
  const invoice = await getManualInvoice(decodeURIComponent(number));
  if (!invoice) return Response.json({ error: "Invoice not found" }, { status: 404 });
  return Response.json({ invoice }, { headers: { "cache-control": "no-store" } });
}
