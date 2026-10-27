import { randomUUID } from "node:crypto";
import { readPhoneToken } from "@/lib/otp";
import { applyPaymentIntent, paymentStatusFor } from "@/lib/orders";
import { createIntent, ensurePaymentsDir } from "@/lib/payments";
import { getOrderForPayment } from "@/lib/payments-orders";
import { getStoreSettingsFast } from "@/lib/store-settings";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/intent { orderNumber, phoneToken }
 *
 * Gateway se (ya manual UPI se) payment banata hai. Yahan koi "paid" nahi hota —
 * sirf intent. Confirm tabhi hota hai jab webhook + backend verify kare.
 */
export async function POST(request: Request) {
  let body: { orderNumber?: string; phoneToken?: string };
  try {
    body = (await request.json()) as { orderNumber?: string; phoneToken?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim();
  if (!orderNumber) return Response.json({ error: "orderNumber chahiye." }, { status: 400 });

  const order = await getOrderForPayment(orderNumber);
  if (!order) return Response.json({ error: "Order nahi mila." }, { status: 404 });

  // order ka phone verify karke hi payment banega — koi bhi order number se QR na bana le
  const token = readPhoneToken(body.phoneToken);
  if (!token || token.phone !== order.phone) {
    return Response.json({ error: "Order verify nahi hua. OTP dobara kariye." }, { status: 401 });
  }
  if (order.paymentStatus === "paid") {
    return Response.json({ error: "Ye order already paid hai.", status: await paymentStatusFor(orderNumber) }, { status: 409 });
  }

  ensurePaymentsDir();
  const settings = await getStoreSettingsFast();
  const intent = await createIntent({
    orderNumber: order.orderNumber,
    amount: order.total,
    customerName: order.customerName,
    email: order.email,
    phone: order.phone,
    // UPI sheet/admin settings se live (env fallback sirf sheet na ho to)
    upi: { vpa: settings.upiId, name: settings.upiName },
  });
  await applyPaymentIntent(orderNumber, {
    gateway: intent.gateway,
    reference: intent.reference,
    upiUri: intent.upiUri,
    amount: intent.amount,
  });

  return Response.json({
    ...intent,
    orderNumber,
    // client id sirf UI ke liye — verification server par hoti hai
    intentId: randomUUID(),
  });
}
