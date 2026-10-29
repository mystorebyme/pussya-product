import { preflight, withCors } from "@/lib/cors";
import { getOrder, submitPaymentReference } from "@/lib/orders";
import { OrderError } from "@/lib/orders";
import { normaliseUpiReference } from "@/lib/upi";
import { readPhoneToken } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/payments/manual  { orderNumber, reference, phoneLast4 }
 *
 * Customer UPI app se pay karke UTR / reference daalta hai. Yahan koi "paid"
 * nahi hota — order pending rehta hai jab tak admin verify na kare.
 * Order ka aakhri 4 digit phone ya OTP token match hona zaroori hai (enumeration
 * se bachne ke liye).
 */
async function handlePost(request: Request) {
  let body: { orderNumber?: string; reference?: string; phoneLast4?: string; phoneToken?: string };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  const orderNumber = String(body.orderNumber ?? "").trim().toUpperCase();
  if (!orderNumber) return Response.json({ error: "Order number is required." }, { status: 400 });

  const reference = normaliseUpiReference(body.reference);
  if (!reference) {
    return Response.json(
      { error: "Enter the 12-digit UPI reference (UTR) from your payment app." },
      { status: 400 },
    );
  }

  const order = await getOrder(orderNumber);
  if (!order) return Response.json({ error: "Order not found." }, { status: 404 });

  const token = readPhoneToken(body.phoneToken);
  const last4 = String(body.phoneLast4 ?? "").replace(/\D/g, "").slice(-4);
  const phoneOk = token ? token.phone === order.phone : Boolean(last4) && order.phone.slice(-4) === last4;
  if (!phoneOk) {
    return Response.json({ error: "Mobile number does not match this order." }, { status: 401 });
  }

  try {
    const updated = await submitPaymentReference(orderNumber, reference);
    return Response.json(
      {
        ok: true,
        orderNumber: updated.orderNumber,
        paymentStatus: updated.paymentStatus,
        status: "reference_submitted",
        message: "Payment reference received. Our team verifies it and confirms your order on WhatsApp.",
      },
      { status: 202 },
    );
  } catch (error) {
    if (error instanceof OrderError) {
      return Response.json({ error: error.message, code: error.code }, { status: error.status });
    }
    console.error("manual payment failed", error);
    return Response.json({ error: "Could not save the payment reference. Please try again." }, { status: 500 });
  }
}


export async function POST(request: Request) {
  return withCors(await handlePost(request), request);
}

export const OPTIONS = preflight;
