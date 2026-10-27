import { getStoreSettings, storeSettingsInfo } from "@/lib/store-settings";
import {
  expectedSheetId,
  readSheetHealth,
  readSheetRecent,
  readSheetSettings,
  sheetsConfigured,
} from "@/lib/google-sheets";

export const dynamic = "force-dynamic";

/**
 * GET /api/admin/sheet — admin panel ka "Google Sheet" screen.
 * Sheet configured hai to live settings + last rows; nahi hai to saaf status.
 */
export async function GET(request: Request) {
  const token = request.headers.get("authorization")?.replace("Bearer ", "") ?? "";
  if (!process.env.ADMIN_API_TOKEN || token !== process.env.ADMIN_API_TOKEN) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const configured = sheetsConfigured();
  const current = await getStoreSettings({ fresh: true });
  if (!configured) {
    return Response.json({
      configured: false,
      settings: current,
      liveRead: storeSettingsInfo(),
      sheet: null,
      recent: { orders: [], payments: [], messages: [] },
      hint: "GOOGLE_SHEETS_WEBAPP_URL + GOOGLE_SHEETS_TOKEN set kariye (docs/09-devops/google-sheets.md).",
    });
  }

  const [sheetSettings, orders, payments, messages, health] = await Promise.all([
    readSheetSettings({ fresh: true }),
    readSheetRecent("Orders", 15),
    readSheetRecent("Payments", 10),
    readSheetRecent("Messages", 10),
    readSheetHealth(),
  ]);

  return Response.json({
    configured: true,
    reachable: Boolean(sheetSettings),
    settings: sheetSettings ?? current,
    live: current,
    /**
     * Read path ka **sach** — owner yahi se dekhta hai ki UPI/phone sheet se aa raha
     * hai ya defaults se, last read kitna purana hai, aur Apps Script kitna time le
     * raha hai (`lastReadMs` > `readTimeoutMs` = timeout ho raha tha).
     */
    liveRead: storeSettingsInfo(),
    /**
     * Script kaun si sheet pakde hue hai — mismatch ho to admin panel me
     * warning aata hai (warna data chup-chaap kisi copy me chala jaata hai).
     */
    health,
    expectedSheetId: expectedSheetId(),
    sheetMismatch: Boolean(health?.spreadsheetId && health.spreadsheetId !== expectedSheetId()),
    // sheet ka URL/token frontend par kabhi nahi jaata
    sheet: null,
    recent: {
      orders: orders ?? [],
      payments: payments ?? [],
      messages: messages ?? [],
    },
  });
}
