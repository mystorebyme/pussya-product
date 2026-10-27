import { preflight, withCors } from "@/lib/cors";
import { getOrder } from "@/lib/orders";
import { mergeSheetTracking, readSheetTracking } from "@/lib/sheet-tracking";

export const dynamic = "force-dynamic";

/**
 * GET /api/orders/:orderNumber/public — **static preview (GitHub Pages)** ke liye.
 *
 * Kyun: Pages par Node server nahi chalta, isliye `/orders/...` aur
 * `/orders/.../pay` page server par ban hi nahi sakte. Pages ka 404.html ek
 * client-side shell hai jo yahan se data laata hai aur wahi page render karta hai.
 *
 * Ye wahi jaankari deta hai jo live order page par dikhti hai — **poora data nahi**:
 *   ✅ order number, items (title/size/qty/price/photo), total, status, payment status,
 *      naam, sheher, state, pincode, masked phone (`••••••••40`), tracking
 *   ❌ poora address, poora phone, email, payment reference, audit trail
 * (Order number hi secret hai — wahi URL ka token hai, random 12 character.)
 */
export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const dbOrder = await getOrder(orderNumber);
  if (!dbOrder) {
    return withCors(Response.json({ error: "Order nahi mila" }, { status: 404 }), request);
  }
  // R37: sheet = order ka DB — status/tracking sheet se (turant), baaki DB se
  const fresh = new URL(request.url).searchParams.get("fresh") === "1";
  const order = mergeSheetTracking(
    dbOrder,
    await readSheetTracking(dbOrder.orderNumber, dbOrder.phone, { fresh }),
  );

  const digits = order.phone.replace(/\D/g, "");
  const payload = {
    data: {
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      createdAt: order.createdAt,
      customerName: order.customerName,
      city: order.city,
      state: order.state,
      pincode: order.pincode,
      phoneMasked: `${"•".repeat(Math.max(0, digits.length - 2))}${digits.slice(-2)}`,
      total: order.total,
      subtotal: order.subtotal,
      discount: order.discount,
      shipping: order.shipping,
      items: order.items.map((item) => ({
        title: item.title,
        handle: item.handle,
        size: item.size,
        quantity: item.quantity,
        price: item.price,
        image: item.image ?? null,
      })),
      tracking: order.tracking
        ? { courier: order.tracking.courier, awb: order.tracking.awb, url: order.tracking.url }
        : null,
    },
  };

  return withCors(
    Response.json(payload, { headers: { "cache-control": "no-store" } }),
    request,
  );
}

export const OPTIONS = preflight;
