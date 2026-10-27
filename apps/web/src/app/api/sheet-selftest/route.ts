import { NextResponse } from "next/server";
import { expectedSheetId, SHEET_REQUEST_HEADERS } from "@/lib/google-sheets";

/**
 * Sheet write selftest — **sirf debugging ke liye**, secret key ke bina band.
 *
 * Kyun: Apps Script web app ko call karne wala code Vercel par chalta hai, isliye
 * sheet me row na aaye to asli wajah (URL missing / token mismatch / redirect /
 * permission) yahin se dikhti hai — browser me kholkar.
 *
 * Use: `/api/sheet-selftest?key=<SHEET_SELFTEST_KEY>&sheet=Audit`
 *  - `SHEET_SELFTEST_KEY` env Vercel me set hai; bina key ke route 404 deta hai
 *    (public repo me key nahi hai).
 *  - Ye tab me **ek selftest row** likhta hai (Audit), order data nahi chhoota.
 */
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const AUDIT_TAB = "Audit";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = (process.env.SHEET_SELFTEST_KEY ?? "").trim();
  if (!key || url.searchParams.get("key") !== key) {
    return NextResponse.json({ ok: false, error: "not found" }, { status: 404 });
  }

  const config = (process.env.GOOGLE_SHEETS_WEBAPP_URL ?? "").trim();
  const token = (process.env.GOOGLE_SHEETS_TOKEN ?? "").trim();
  /**
   * Deployment id ka sirf pehla hissa dikhate hain (poora /exec URL secret rehta hai):
   * owner apne Apps Script ke "Manage deployments" me yahi id dekh kar compare kar
   * sake ki Vercel me **purana** deployment to nahi pada hai.
   */
  const deploymentId = /\/macros\/s\/([A-Za-z0-9_-]+)/.exec(config)?.[1] ?? null;
  const result: Record<string, unknown> = {
    urlSet: Boolean(config),
    urlHost: config ? new URL(config).host : null,
    urlDeployment: deploymentId ? `${deploymentId.slice(0, 12)}…` : null,
    csvSet: Boolean((process.env.GOOGLE_SHEETS_SETTINGS_CSV_URL ?? "").trim()),
    tokenSet: Boolean(token),
    tokenLength: token.length,
  };
  if (!config) return NextResponse.json({ ok: false, ...result });

  // 1) read check — script zinda hai? kaun si sheet pakad raha hai?
  const startedRead = Date.now();
  try {
    const health = new URL(config);
    health.searchParams.set("action", "health");
    if (token) health.searchParams.set("token", token);
    const response = await fetch(health, {
      cache: "no-store",
      headers: SHEET_REQUEST_HEADERS,
      signal: AbortSignal.timeout(15_000),
    });
    const raw = await response.text();
    /**
     * Apps Script kabhi JSON ki jagah Google ka **HTML page** bhej deta hai.
     * Do hi wajah hoti hain (aur dono ka fix alag hai) — isliye seedha hint dete hain.
     */
    const looksHtml = /^\s*<(!doctype|html)/i.test(raw);
    const scriptHint = !looksHtml
      ? null
      : /accounts\.google\.com|signin|Sign in|You need (access|permission)|permission/i.test(raw)
        ? "Deployment ka access 'Anyone' nahi hai. Apps Script → Deploy → Manage deployments → ✏️ → Who has access: Anyone → Deploy."
        : "Purana/archived deployment URL lag raha hai (ya script error). Apps Script → Deploy → Manage deployments → ✏️ → Version: New version → Deploy, aur wahi /exec URL Vercel me GOOGLE_SHEETS_WEBAPP_URL me daalein.";
    result.read = { status: response.status, ms: Date.now() - startedRead, body: raw.slice(0, 600), scriptHint };
    /**
     * Sabse zaroori check: script **kaun si sheet** pakde hue hai?
     * Mismatch = rows kisi doosri (copy) sheet me jaa rahe hain.
     */
    try {
      const parsed = JSON.parse(raw) as {
        spreadsheet?: string;
        spreadsheetId?: string;
        version?: string;
        codeVersion?: string;
        error?: string;
        sheets?: { name?: string; rows?: number }[];
      };
      result.book = {
        name: parsed.spreadsheet ?? null,
        id: parsed.spreadsheetId ?? null,
        expectedId: expectedSheetId(),
        match: parsed.spreadsheetId ? parsed.spreadsheetId === expectedSheetId() : null,
        rows: Object.fromEntries((parsed.sheets ?? []).map((entry) => [entry.name ?? "?", Number(entry.rows ?? 0)])),
        // r25-1 (ya usse naya) = New version deploy hua; `null` = purana code chal raha hai
        codeVersion: parsed.codeVersion ?? parsed.version ?? null,
        scriptError: parsed.error ?? null,
      };
    } catch {
      result.book = { parseError: true, expectedId: expectedSheetId() };
    }
  } catch (error) {
    result.read = { error: (error as Error).message, ms: Date.now() - startedRead };
  }

  /**
   * 1b) Contact form ("Send us a message") ka poora server path:
   *     DB me save → Messages tab me mirror. `?message=1` par chalta hai.
   */
  if (url.searchParams.get("message") === "1") {
    const startedMsg = Date.now();
    try {
      const { saveMessage, mirrorMessageToSheet, listMessages } = await import("@/lib/messages");
      const saved = await saveMessage({
        name: "Selftest",
        email: "selftest@example.com",
        phone: "",
        subject: "Selftest (ignore)",
        message: "api/sheet-selftest se bheja gaya test message — ignore kariye.",
      });
      let mirrored: boolean | string = false;
      try {
        mirrored = await mirrorMessageToSheet(saved);
      } catch (error) {
        mirrored = (error as Error).message;
      }
      const recent = await listMessages(3);
      result.message = {
        ok: true,
        ms: Date.now() - startedMsg,
        id: saved.id,
        savedAt: saved.createdAt,
        rowInDb: recent.some((row) => row.id === saved.id),
        dbCount: recent.length,
        sheetMirror: mirrored,
      };
    } catch (error) {
      result.message = { ok: false, ms: Date.now() - startedMsg, error: (error as Error).message };
    }
  }

  /**
   * 1c) "Data kitna hai?" — orders / messages / checkout events ka count.
   *     `?stats=1` (kuch nahi likhta, sirf ginta hai).
   */
  if (url.searchParams.get("stats") === "1") {
    const stats: Record<string, unknown> = {};
    try {
      const { dbEnabled, query } = await import("@/lib/db");
      stats.db = dbEnabled();
      if (dbEnabled()) {
        // har table alag — koi ek missing ho to baaki counts phir bhi milein
        const one = async (label: string, sql: string) => {
          try {
            const rows = await query<{ n: string }>(sql);
            stats[label] = Number(rows[0]?.n ?? 0);
          } catch (error) {
            stats[label] = `error: ${(error as Error).message}`;
          }
        };
        await one("orders", "select count(*)::text as n from orders");
        await one("paidOrders", "select count(*)::text as n from orders where payment_status = 'paid'");
        await one("messages", "select count(*)::text as n from contact_messages");
        await one("checkoutEvents", "select count(*)::text as n from checkout_events");
      }
    } catch (error) {
      stats.error = (error as Error).message;
    }
    result.stats = stats;
  }

  /**
   * 1c) **Contact form** ka asli path, live: saveMessage → mirrorMessageToSheet →
   *     listMessages. `?message=1` par chalta hai. Isse pata chalta hai ki
   *     "message kaam nahi kar raha" kahan atka hai (DB / sheet / dono).
   */
  if (url.searchParams.get("message") === "1") {
    const started = Date.now();
    try {
      const { saveMessage, mirrorMessageToSheet, listMessages } = await import("@/lib/messages");
      const saved = await saveMessage({
        name: "Selftest",
        email: "selftest@example.com",
        phone: "",
        subject: "Selftest (ignore)",
        message: "api/sheet-selftest se bheja gaya test message — ignore kariye.",
      });
      let mirrored: boolean | string = false;
      try {
        mirrored = await mirrorMessageToSheet(saved);
      } catch (error) {
        mirrored = (error as Error).message;
      }
      const rows = await listMessages(5);
      result.message = {
        ok: true,
        ms: Date.now() - started,
        id: saved.id,
        rowInDb: rows.some((row) => row.id === saved.id),
        dbCount: rows.length,
        sheetMirror: mirrored,
      };
    } catch (error) {
      result.message = { ok: false, ms: Date.now() - started, error: (error as Error).message };
    }
  }

  // 2) write check — ek row Audit tab me (yahi asli append path hai)
  const sheet = url.searchParams.get("sheet") === "Orders" ? "Orders" : AUDIT_TAB;
  const startedWrite = Date.now();
  try {
    const response = await fetch(config, {
      method: "POST",
      cache: "no-store",
      headers: { ...SHEET_REQUEST_HEADERS, "content-type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        token,
        action: "append",
        rows: [
          {
            sheet,
            row:
              sheet === "Orders"
                ? {
                    Timestamp: new Date().toISOString(),
                    Event: "selftest",
                    "Order number": "SELFTEST",
                    "Order status": "placed",
                    "Payment status": "pending",
                    "Payment method": "upi",
                    Customer: "selftest",
                    Notes: "api/sheet-selftest se likha gaya",
                  }
                : {
                    Timestamp: new Date().toISOString(),
                    Actor: "selftest",
                    Action: "sheet_write_check",
                    Target: sheet,
                    Details: "api/sheet-selftest se likha gaya",
                  },
          },
        ],
      }),
      signal: AbortSignal.timeout(20_000),
    });
    result.write = {
      status: response.status,
      redirected: response.redirected,
      finalUrlHost: new URL(response.url).host,
      ms: Date.now() - startedWrite,
      body: (await response.text()).slice(0, 600),
    };
  } catch (error) {
    result.write = { error: (error as Error).message, ms: Date.now() - startedWrite };
  }

  return NextResponse.json({ ok: true, sheet, ...result });
}
