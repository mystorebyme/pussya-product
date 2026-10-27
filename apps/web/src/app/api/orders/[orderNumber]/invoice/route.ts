import type { NextRequest } from "next/server";
import { ensureInvoice, getOrder } from "@/lib/orders";
import { buildInvoice, sellerFromSettings } from "@/lib/invoice";
import { getStoreSettings } from "@/lib/store-settings";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { syncInvoiceToSheet } from "@/lib/google-sheets";
import { runInBackground } from "@/lib/background";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:orderNumber/invoice?phone=XXXX
 *
 * GST invoice PDF. Order number akela enough nahi hai — customer ke phone ke
 * aakhri 4 digit bhi match karne padte hain (order pages public URL hain).
 */
export async function GET(request: NextRequest, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const order = await getOrder(orderNumber);
  if (!order) {
    return Response.json({ error: "Order not found" }, { status: 404 });
  }

  const phoneParam = (request.nextUrl.searchParams.get("phone") ?? "").replace(/\D/g, "");
  const orderPhone = order.phone.replace(/\D/g, "");
  const tail = orderPhone.slice(-4);
  const verified = phoneParam.length >= 4 && phoneParam.slice(-4) === tail;
  if (!verified) {
    return Response.json(
      { error: "Phone verification required", hint: "Pass the last 4 digits of the order phone as ?phone=" },
      { status: 403 },
    );
  }

  const { order: withInvoice, invoice } = await ensureInvoice(orderNumber);
  const settings = await getStoreSettings();
  const view = buildInvoice(withInvoice, invoice.number, invoice.issuedAt, sellerFromSettings(settings));
  // Invoices tab me row (owner ko GST record sheet me bhi) — response ke baad
  runInBackground(() =>
    syncInvoiceToSheet(view, withInvoice).catch((error) =>
      console.warn("[sheets] invoice sync failed", (error as Error).message),
    ),
  );
  const pdf = await renderInvoicePdf(view);

  return new Response(new Uint8Array(pdf), {
    headers: {
      "content-type": "application/pdf",
      "content-disposition": `attachment; filename="invoice-${order.orderNumber}.pdf"`,
      "cache-control": "no-store",
    },
  });
}
