import { createOrder, confirmPayment, listOrders, OrderError } from "@/lib/orders";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/orders — admin (phone/WhatsApp order) ke liye manual order.
 * Order number system hi banata hai (NE-…), sheet me turant row jaati hai.
 */
export async function POST(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!process.env.ADMIN_API_TOKEN || token !== process.env.ADMIN_API_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const text = (key: string) => String(body[key] ?? "").trim();
  const items = Array.isArray(body.items)
    ? (body.items as { handle?: string; size?: string; quantity?: number }[])
        .filter((item) => item?.handle && item?.size)
        .map((item) => ({
          handle: String(item.handle),
          size: String(item.size),
          quantity: Math.max(1, Math.min(10, Number(item.quantity ?? 1) || 1)),
        }))
    : [];

  if (!items.length) return Response.json({ error: "At least one item is required." }, { status: 400 });

  try {
    const order = await createOrder({
      customerName: text("customerName"),
      email: text("email"),
      phone: text("phone"),
      address: text("address"),
      city: text("city"),
      state: text("state"),
      pincode: text("pincode"),
      notes: text("notes") || null,
      paymentMethod: "prepaid",
      items,
      skipPincodeCheck: true,
    });

    // admin ne cash/UPI already le liya ho to paid mark + confirm
    let final = order;
    if (body.markPaid === true) {
      const result = await confirmPayment(order.orderNumber, {
        gateway: "admin-manual",
        reference: text("reference") || `ADMIN-${order.orderNumber}`,
        amount: order.total,
        actor: text("actor") || "admin",
      });
      if (result?.order) final = result.order;
    }

    return Response.json({ order: final }, { status: 201 });
  } catch (error) {
    if (error instanceof OrderError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("manual order failed", error);
    return Response.json({ error: "The order could not be created. Please check the details." }, { status: 500 });
  }
}

/** Admin panel ko poori list (token ke saath) — customer data masked. */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!process.env.ADMIN_API_TOKEN || token !== process.env.ADMIN_API_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = await listOrders();
  return Response.json({ orders, total: orders.length });
}
