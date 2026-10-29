import { preflight, withCors } from "@/lib/cors";
import { getOrder } from "@/lib/orders";
import { getStoreSettingsFast } from "@/lib/store-settings";
import { signUpiReturn } from "@/lib/upi-return";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/orders/:orderNumber/payment-context
 *
 * Payment ab checkout ke **andar step 3** par hota hai (owner, R36) — alag page
 * nahi. Isliye client ko wahi chahiye jo `/orders/<n>/pay` page server par padhta
 * tha: amount, live UPI (owner ki Google Sheet se), payment status aur UPI-return
 * ka signed token.
 *
 * Privacy: `/api/orders/<n>/public` jitna hi minimum — poora address, email ya
 * poora mobile **nahi** jaata (order number hi URL ka token hai, random `NE-…`).
 * `returnToken` wahi hai jo pay page ke HTML me bhi hota hai: sirf UPI deep link
 * ke `url` param me jaata hai taaki app se wapas aane par order auto-confirm ho.
 *
 * `cache-control: no-store` — payment status/UPI kabhi purana na dikhe.
 */
export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  // order + settings saath me (sheet se live UPI) — step 3 jaldi khule
  const [order, settings] = await Promise.all([getOrder(orderNumber), getStoreSettingsFast()]);
  if (!order) {
    return withCors(
      Response.json({ error: "Order not found" }, { status: 404, headers: { "cache-control": "no-store" } }),
      request,
    );
  }

  const digits = order.phone.replace(/\D/g, "");
  const paid = order.paymentStatus === "paid";
  const payload = {
    data: {
      orderNumber: order.orderNumber,
      createdAt: order.createdAt,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      total: order.total,
      subtotal: order.subtotal,
      reference: order.payment?.reference ?? null,
      /** sheet se live UPI — owner ne sheet me badla to step 3 par turant naya */
      upi: { id: settings.upiId, name: settings.upiName },
      whatsapp: settings.whatsapp,
      /** paid order ke liye token nahi (dobara auto-confirm ka koi matlab nahi) */
      returnToken: paid ? null : signUpiReturn(order.orderNumber),
      items: order.items.map((item) => ({
        title: item.title,
        handle: item.handle,
        image: item.image ?? null,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
      })),
      customer: {
        name: order.customerName,
        city: order.city,
        state: order.state,
        pincode: order.pincode,
        phoneMasked: `${"•".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`,
      },
    },
  };

  return withCors(Response.json(payload, { headers: { "cache-control": "no-store" } }), request);
}

export const OPTIONS = preflight;
