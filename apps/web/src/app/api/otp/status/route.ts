import { otpMode, otpRequired } from "@/lib/otp";

export const dynamic = "force-dynamic";

/** GET /api/otp/status — checkout ko batata hai ki OTP step dikhana hai ya nahi. */
export async function GET() {
  return Response.json({ required: otpRequired(), mode: otpMode() });
}
