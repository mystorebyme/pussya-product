import { dbEnabled } from "@/lib/db";
import {
  expectedSheetId,
  readSheetHealth,
  sheetWriteInfo,
  sheetsConfigured,
  type SheetHealth,
} from "@/lib/google-sheets";
import { getStoreSettings, storeSettingsInfo } from "@/lib/store-settings";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * GET /api/sheet-health — **public** (bina key/token) sheet pipeline ka report card.
 *
 * R38 (owner): "order kiya, sheet me kuch show nahi ho raha — db kahan se chal
 * raha hai?" Iska jawab owner khud browser me khol kar dekh sake:
 *   • settings sheet se aa rahi hai ya nahi (source/age/upiLoaded),
 *   • Apps Script kaun sa version/sheet/token pakde hue hai (script ka `health`),
 *   • sheet par **last write** ka nateeja (orders/messages ja rahe hain ya nahi),
 *   • orders ka store (postgres/file) aur har problem ka seedha Hinglish fix.
 *
 * Privacy: sheet ka URL/token kabhi nahi jaata; deployment id bhi nahi. Script
 * health 30s module-cache me rehta hai (Apps Script quota bachane ke liye).
 */

let healthCache: { at: number; value: SheetHealth | null } | null = null;
const HEALTH_CACHE_MS = 30_000;

async function scriptHealth(): Promise<SheetHealth | null> {
  if (healthCache && Date.now() - healthCache.at < HEALTH_CACHE_MS) return healthCache.value;
  const value = await readSheetHealth();
  healthCache = { at: Date.now(), value };
  return value;
}

export async function GET() {
  const configured = sheetsConfigured();
  const started = Date.now();

  const [health, settings, info] = await Promise.all([
    configured ? scriptHealth() : Promise.resolve(null),
    getStoreSettings().catch(() => null),
    Promise.resolve(storeSettingsInfo()),
  ]);

  const write = sheetWriteInfo();
  const help: string[] = [];
  /**
   * R39: probe ka timeout akela "sab fail" nahi hai — Apps Script cold start
   * 8s+ le sakta hai. Settings sheet se aa rahi hain (URL zinda hai) + last
   * write ok hai to timeout sirf warning hai, help (failure) nahi.
   */
  const warnings: string[] = [];

  if (!configured) {
    help.push("GOOGLE_SHEETS_WEBAPP_URL is not set on Vercel — the sheet pipeline is off (docs/09-devops/google-sheets.md).");
  }
  if (health && !health.ok) {
    const probeTimedOut = /timeout|abort/i.test(String(health.error ?? ""));
    const pipelineAlive = info.source === "apps-script" && (!write || write.ok);
    if (probeTimedOut && pipelineAlive) {
      warnings.push(
        `The health probe timed out (${health.error}) but settings are still coming from the sheet and the last write was fine — this is an Apps Script cold start. Please refresh again.`,
      );
    } else {
      help.push(
        `Apps Script is not responding (${health.error ?? "unknown"}) — the URL may be old or dead. Paste the /exec URL from Deploy → Manage deployments into Vercel.`,
      );
    }
  }
  if (health?.ok) {
    const major = Number(/^r(\d+)/.exec(String(health.version ?? ""))?.[1] ?? 0);
    if (major && major < 39) {
      help.push(`The script is running an old version (${health.version}) — paste the new code, then Deploy → Manage deployments → ✏️ → New version → Deploy.`);
    }
    if (health.tokenSet === false) {
      help.push("The script token is not set — open <webapp URL>?action=set_token&token=<Vercel GOOGLE_SHEETS_TOKEN> in a browser.");
    } else if (health.tokenOk === false) {
      help.push("The Vercel GOOGLE_SHEETS_TOKEN and the script token do not match — set them to the same value (use the set_token URL).");
    }
    if (health.sheetFound === false) {
      help.push("The script cannot access the sheet — create the script from the sheet itself (Sheet → Extensions → Apps Script) or grant access via Share → Editor.");
    }
    if (health.spreadsheetId && health.spreadsheetId !== expectedSheetId()) {
      help.push(`The script is bound to a different sheet (${health.spreadsheetId}); expected ${expectedSheetId()} — open <webapp URL>?action=adopt from the correct sheet or update the SHEET_EXPECTED_ID env value.`);
    }
    if (health.upiSet === false) {
      help.push("The upi_id cell in the Settings tab is empty — the WhatsApp order hand-off will keep showing no payment details until you fill it in.");
    }
  }
  if (configured && !info.source) {
    help.push(`Settings could not be read from the sheet${info.lastError ? ` (${info.lastError})` : ""} — see the script health above.`);
  }
  if (write && !write.ok) {
    help.push(`The last sheet write (${write.sheets}) failed: ${write.error ?? "unknown"} — orders and messages are not reaching the sheet. Fix the issue above.`);
  }
  if (!settings?.upiId) {
    help.push("The site has no UPI ID yet (both the sheet and the fallback are empty) — the WhatsApp message will go out without payment details.");
  }

  return Response.json(
    {
      ok: help.length === 0,
      time: new Date().toISOString(),
      ms: Date.now() - started,
      ordersStore: dbEnabled() ? "postgres" : "file",
      sheet: {
        configured,
        expectedSheetId: expectedSheetId(),
        settings: {
          source: info.source,
          ageMs: info.ageMs,
          stale: info.stale,
          lastReadMs: info.lastReadMs,
          lastError: info.lastError,
          ttlMs: info.ttlMs,
        },
        upiLoaded: Boolean(settings?.upiId),
        script: health
          ? {
              ok: health.ok,
              version: health.version ?? null,
              tokenSet: health.tokenSet ?? null,
              tokenOk: health.tokenOk ?? null,
              sheetFound: health.sheetFound ?? null,
              sheetId: health.spreadsheetId,
              spreadsheet: health.spreadsheet,
              idMatch: health.idMatch ?? null,
              bound: health.bound ?? null,
              upiSet: health.upiSet ?? null,
              rows: health.rows,
              problems: health.problems ?? null,
              error: health.error ?? null,
            }
          : null,
        lastWrite: write ? { at: new Date(write.at).toISOString(), ok: write.ok, sheets: write.sheets, error: write.error } : null,
      },
      help,
      warnings,
      note: "This page only reports status — it never exposes the sheet URL or token.",
    },
    { headers: { "cache-control": "no-store" } },
  );
}
