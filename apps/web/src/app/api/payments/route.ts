import { getOrder } from "@/lib/orders";
import { createPaymentLink } from "@/lib/payments";
import { getStoreSettingsFast } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

/**
 * Third-party payment (Razorpay Payment Link). Keys na ho to manual UPI
 * instructions return hote hain — order kabhi block nahi hota.
 */
export async function POST(request: Request) {
  let body: { orderNumber?: string };
  try {
    body = (await request.json()) as { orderNumber?: string };
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }
  if (!body.orderNumber) return Response.json({ error: "orderNumber required" }, { status: 400 });

  const order = await getOrder(body.orderNumber);
  if (!order) return Response.json({ error: "Order not found" }, { status: 404 });
  if (order.paymentStatus === "paid") return Response.json({ paid: true });

  try {
    // UPI sheet/admin settings se live — env ka purana VPA QR me na chala jaaye
    const settings = await getStoreSettingsFast();
    const initiation = await createPaymentLink(order, { vpa: settings.upiId, name: settings.upiName });
    return Response.json(initiation);
  } catch (error) {
    console.error("payment initiation failed", error);
    return Response.json({ error: "The payment link could not be generated." }, { status: 502 });
  }
}
