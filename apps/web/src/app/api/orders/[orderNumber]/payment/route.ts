import { preflight, withCors } from "@/lib/cors";
import { paymentStatusFor } from "@/lib/orders";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/orders/:orderNumber/payment
 *
 * Payment page ise har 8 second me poll karta hai — "pending → processing →
 * paid / failed" live dikhta hai (page refresh ki zarurat nahi).
 *
 * Security: sirf status/metadata jaata hai (koi address, item ya phone nahi).
 * Order number random `NE-XXXXXXXX` hai, aur yahi page customer ko dikhta hai.
 * `cache-control: no-store` — status kabhi purana na dikhe.
 *
 * CORS: GitHub Pages (static preview) par payment page client-side chalta hai,
 * isliye status live store (Vercel) se cross-origin laana padta hai — warna
 * Pages par "Status check nahi ho paaya" dikhta tha.
 */
export async function GET(request: Request, context: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await context.params;
  const status = await paymentStatusFor(orderNumber);
  if (!status) {
    return withCors(
      Response.json({ error: "Order not found" }, { status: 404, headers: { "cache-control": "no-store" } }),
      request,
    );
  }
  return withCors(Response.json(status, { headers: { "cache-control": "no-store" } }), request);
}

export const OPTIONS = preflight;
