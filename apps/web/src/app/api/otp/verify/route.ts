import { checkDevCode, issuePhoneToken, otpMode, verifyFirebaseIdToken } from "@/lib/otp";

export const dynamic = "force-dynamic";

/**
 * POST /api/otp/verify { phone, idToken }  (Firebase)
 * POST /api/otp/verify { phone, code }     (dev)
 *
 * Success par 15 minute ka signed `phoneToken` milta hai — wahi order ke saath jaata hai.
 */
export async function POST(request: Request) {
  let body: { phone?: string; idToken?: string; code?: string };
  try {
    body = (await request.json()) as { phone?: string; idToken?: string; code?: string };
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const phone = (body.phone ?? "").replace(/\D/g, "").slice(-10);
  if (!/^[6-9]\d{9}$/.test(phone)) {
    return Response.json({ error: "Please enter a valid 10-digit mobile number." }, { status: 400 });
  }

  const mode = otpMode();

  if (body.idToken) {
    const verifiedPhone = await verifyFirebaseIdToken(body.idToken);
    if (!verifiedPhone) {
      return Response.json({ error: "We could not verify the OTP. Please try again." }, { status: 401 });
    }
    if (verifiedPhone !== phone) {
      return Response.json({ error: "The verified number does not match the requested number." }, { status: 400 });
    }
    return Response.json({ phoneToken: issuePhoneToken(phone), phone, mode: "firebase" });
  }

  if (mode === "dev" && body.code) {
    if (!checkDevCode(phone, body.code)) {
      return Response.json({ error: "The OTP is incorrect or has expired." }, { status: 401 });
    }
    return Response.json({ phoneToken: issuePhoneToken(phone), phone, mode: "dev" });
  }

  return Response.json({ error: "Send an idToken or code to verify the OTP." }, { status: 400 });
}
