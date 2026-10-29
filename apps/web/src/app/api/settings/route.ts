import { preflight, withCors } from "@/lib/cors";
import { getStoreSettings, getStoreSettingsFast, storeSettingsInfo } from "@/lib/store-settings";
import { sheetsConfigured } from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

/**
 * Public settings jo UI ko chahiye (announcement, UPI, support contact).
 * Google Sheet configured hai to sheet ki value jeetti hai — owner redeploy
 * ke bina phone / email / UPI change kar sakta hai.
 *
 * Do mode:
 *   • `GET /api/settings`         → stale-while-revalidate (turant jawab, background refresh)
 *   • `GET /api/settings?fresh=1` → sheet se **abhi** padh kar jawab (payment page isi ko
 *                                   call karta hai, taaki UPI ID hamesha sahi rahe)
 *
 * `meta` block batata hai ki value sheet se aayi ya defaults se — owner `/api/settings`
 * khol kar khud verify kar sakta hai (koi secret isme nahi jaata).
 */
async function handleGet(request: Request) {
  const fresh = ["1", "true", "yes"].includes(new URL(request.url).searchParams.get("fresh") ?? "");
  const settings = fresh ? await getStoreSettings({ fresh: true }) : await getStoreSettingsFast();
  const info = storeSettingsInfo();
  const configured = sheetsConfigured() || Boolean(info.configured);
  return Response.json(
    {
      data: {
        announcement: settings.announcement,
        dailySpecial: settings.dailySpecial,
        freeShipping: settings.freeShipping,
        upiId: settings.upiId,
        upiName: settings.upiName,
        supportPhone: settings.supportPhone,
        whatsapp: settings.whatsapp,
        /* R48 — YouPI PG ka **public** hissa (youpi.js embed karne ke liye).
           Webhook secret yahan kabhi nahi jaata. */
        youpiEnabled: settings.youpiEnabled,
        youpiPayUrl: settings.youpiPayUrl,
        youpiMerchantId: settings.youpiMerchantId,
        updatedAt: settings.updatedAt,
        source: configured ? "google-sheet" : "admin",
      },
      meta: {
        fresh,
        configured,
        // "apps-script" = owner ka /exec URL, "csv" = publish-to-web fallback, null = defaults
        sheetSource: info.source,
        sheetAgeMs: info.ageMs,
        sheetStale: info.stale,
        sheetLastError: info.lastError,
        sheetTtlMs: info.ttlMs,
        sheetReadTimeoutMs: info.readTimeoutMs,
      },
    },
    { headers: { "cache-control": "no-store" } },
  );
}


export async function GET(request: Request) {
  return withCors(await handleGet(request), request);
}

export const OPTIONS = preflight;
