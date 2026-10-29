import { checkPincode } from "@/lib/delivery";

export const dynamic = "force-dynamic";

/**
 * GET /api/delivery/check?pincode=302001
 *
 * Customer ka pincode check — asli India Post data + admin rules.
 * Rate limit ke liye same-origin/referer check enough hai (data public hai,
 * koi PII nahi), lekin cache bahut chhota rakhte hain taaki admin ka block
 * turant lag jaye.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const pincode = url.searchParams.get("pincode") ?? "";
  const result = await checkPincode(pincode);
  return Response.json(
    { data: result },
    {
      status: result.reason === "invalid" ? 400 : 200,
      headers: { "cache-control": "no-store" },
    },
  );
}
