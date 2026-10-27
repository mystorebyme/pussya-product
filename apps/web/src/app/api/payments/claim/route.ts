import { preflight, withCors } from "@/lib/cors";
import { claimPayment, getOrder, OrderError } from "@/lib/orders";
import { readPhoneToken } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/claim  { orderNumber, phoneLast4?, phoneToken?, note? }
 *
 * Owner rule (R27): customer **sirf mobile ke last 4 digit** daalta hai aur
 * "Payment ho gaya — confirm kariye" dabata hai. UTR kabhi nahi maanga jaata;
 * screenshot chahiye ho to WhatsApp ka rasta alag se dikhta hai.
 *
 * Yahan paisa **confirm nahi** hota — order `payment_status = processing`
 * (verify hona baaki) ho jaata hai, reference khaali. Admin UPI statement se
 * match karke confirm karta hai (yahi manual UPI ka rule hai).
 */
async function handlePost(request: Request) {
  let body: { orderNumber?: string; phoneLast4?: string; phoneToken?: string; note?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!/^NE-[A-Z0-9]{4,16}$/.test(orderNumber)) {
    return Response.json({ error: "Enter a valid order number." }, { status: 400 });
  }

  const order = await getOrder(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const token = readPhoneToken(body.phoneToken);
  const last4 = String(body.phoneLast4 ?? "").replace(/\D/g, "").slice(-4);
  const phoneOk = token ? token.phone === order.phone : Boolean(last4) && order.phone.slice(-4) === last4;
  if (!phoneOk) {
    return Response.json({ error: "Last 4 digits of the order's mobile number do not match." }, { status: 403 });
  }

  try {
    const updated = await claimPayment(orderNumber, { note: body.note ?? null });
    return Response.json(
      {
        ok: true,
        orderNumber: updated.orderNumber,
        paymentStatus: updated.paymentStatus,
        status: "claim_submitted",
        message:
          "Payment claim mil gaya. Team UPI statement se verify karke order confirm karegi (WhatsApp par update milega).",
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("payment claim failed", error);
    return Response.json({ error: "Claim save nahi hua — WhatsApp par screenshot bhej dijiye." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
