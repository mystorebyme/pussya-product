import { preflight, withCors } from "@/lib/cors";
import { createOrderSchema } from "@noor/validation";
import {
  createOrder,
  findIdempotentOrder,
  listOrders,
  OrderError,
  rememberIdempotency,
} from "@/lib/orders";

export const dynamic = "force-dynamic";

async function handlePost(request: Request) {
  const idempotencyKey = request.headers.get("idempotency-key")?.trim().slice(0, 120);
  // double click / network retry par doosra order na bane (disk-backed, restart-safe)
  if (idempotencyKey) {
    const existing = await findIdempotentOrder(idempotencyKey);
    if (existing) {
      return Response.json(
        { orderNumber: existing.orderNumber, total: existing.total, status: existing.status, idempotent: true },
        { status: 200 },
      );
    }
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  // OTP step owner ne hataya hai — phone number details me hi verify hota hai.
  // (Purane clients ka `phoneToken` field aaye to ignore ho jaata hai.)
  delete (body as { phoneToken?: unknown }).phoneToken;

  const parsed = createOrderSchema.safeParse(body);
  if (!parsed.success) {
    const first = parsed.error.issues[0];
    return Response.json(
      { error: first?.message ?? "Kripya details check kariye.", fields: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  try {
    const order = await createOrder(parsed.data);
    if (idempotencyKey) await rememberIdempotency(idempotencyKey, order.orderNumber);
    return Response.json(
      {
        orderNumber: order.orderNumber,
        total: order.total,
        status: order.status,
        // payment page turant kholta hai; order tab tak "pending" rehta hai
        paymentStatus: order.paymentStatus,
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("order create failed", error);
    return Response.json({ error: "Order place nahi ho paya. Please try again." }, { status: 500 });
  }
}

/** admin/support ke liye — token ke bina customer data expose nahi hota */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!process.env.ADMIN_API_TOKEN || token !== process.env.ADMIN_API_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const orders = (await listOrders()).map(({ email, phone, address, ...rest }) => ({
    ...rest,
    email: email.replace(/(.{2}).+(@.+)/, "$1***$2"),
    phone: `******${phone.slice(-4)}`,
    address: address ? "hidden" : "",
  }));
  return Response.json({ orders, total: orders.length });
}


export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
