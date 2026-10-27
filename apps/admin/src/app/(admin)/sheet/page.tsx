import Link from "next/link";
import { getSheetOverview } from "@/lib/data";

export const dynamic = "force-dynamic";
export const metadata = { title: "Google Sheet" };

/**
 * Google Sheet = owner ka control panel.
 * Yahan wahi data dikhta hai jo sheet me hai (settings + last order/payment/message rows),
 * aur admin Settings se edit karne par sheet bhi update ho jaati hai.
 */
export default async function SheetPage() {
  const overview = await getSheetOverview();
  const settings = overview.settings ?? {};
  const recent = overview.recent ?? { orders: [], payments: [], messages: [] };
  /** Sheet write path ka live status (kaun si book, kitni rows) */
  const health = (overview as { health?: { ok?: boolean; spreadsheet?: string | null; spreadsheetId?: string | null; rows?: Record<string, number> } }).health;
  const expectedId = (overview as { expectedSheetId?: string }).expectedSheetId;
  const mismatch = Boolean((overview as { sheetMismatch?: boolean }).sheetMismatch);
  /**
   * Read path ka live status — "sheet me badla, site par nahi aaya" ki asli wajah
   * yahan dikhti hai (source, latency, age, last error).
   */
  const liveRead = overview.liveRead;
  const readAgeSec = liveRead?.ageMs == null ? null : Math.round(liveRead.ageMs / 1000);
  const orderRows = recent.orders.slice(0, 10);
  const columns = ["Timestamp", "Event", "Order number", "Order status", "Payment status", "Total", "Customer", "Phone"];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Google Sheet</h1>
          <p>Owner ki sheet ka live data — settings, orders aur payments</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/settings">
            Edit settings
          </Link>
          <Link className="btn" href="/orders">
            Orders
          </Link>
        </div>
      </div>

      {mismatch ? (
        <div className="notice warn" data-testid="sheet-mismatch" style={{ marginBottom: 12 }}>
          <strong>⚠️ Script doosri sheet me likh raha hai.</strong>
          <div style={{ marginTop: 6 }}>
            Apps Script abhi <span className="mono">{health?.spreadsheetId}</span> pakde hue hai
            {health?.spreadsheet ? ` ("${health.spreadsheet}")` : ""} — par owner ki asli sheet{" "}
            <span className="mono">{expectedId}</span> hai. Isliye orden sheet me nahi dikh rahe.
          </div>
          <div style={{ marginTop: 6 }} className="small">
            Fix: sheet me <span className="mono">Extensions → Apps Script</span> →{" "}
            <span className="mono">book_()</span> me <span className="mono">SPREADSHEET_ID</span> pehle chalta hai
            (naya code) → <span className="mono">Deploy → Manage deployments → ✏️ → New version → Deploy</span>.
          </div>
        </div>
      ) : null}

      <div className={`notice ${overview.configured ? "" : "warn"}`} data-testid="sheet-status">
        {overview.configured ? (
          <>
            <strong>Connected</strong>
            {" "}— settings sheet se live aati hain (10 s TTL + background refresh), aur har order / payment /
            message row sheet me append hoti hai. Sheet ka link/token sirf server ke paas rehta hai, kabhi website par nahi dikhta.
            {overview.reachable === false ? (
              <div style={{ marginTop: 6, color: "var(--danger)" }}>
                Sheet URL configured hai par reply nahi aaya — Apps Script deployment (&quot;Anyone&quot;) aur token
                check kariye.
              </div>
            ) : null}
          </>
        ) : (
          <>
            <strong>Sheet connected nahi hai.</strong> Site Postgres/JSON par chal rahi hai. Setup:{" "}
            <span className="mono">docs/09-devops/google-sheets.md</span> — Apps Script deploy karke{" "}
            <span className="mono">GOOGLE_SHEETS_WEBAPP_URL</span> +{" "}
            <span className="mono">GOOGLE_SHEETS_TOKEN</span> set kariye. {overview.hint}
          </>
        )}
      </div>

      {overview.configured ? (
        <div
          className={`notice ${liveRead?.source ? "" : "warn"}`}
          data-testid="sheet-live-read"
          style={{ marginTop: 12 }}
        >
          {liveRead?.source === "apps-script" ? (
            <>
              <strong>Settings sheet se live padhi ja rahi hain ✅</strong>
              <div style={{ marginTop: 6 }} className="small">
                Source: <span className="mono">Apps Script</span> · last read{" "}
                <span className="mono">{liveRead.lastReadMs} ms</span> · value{" "}
                <span className="mono">{readAgeSec == null ? "—" : `${readAgeSec}s`}</span> purani · TTL{" "}
                <span className="mono">{Math.round((liveRead.ttlMs ?? 0) / 1000)}s</span> · read timeout{" "}
                <span className="mono">{Math.round((liveRead.readTimeoutMs ?? 0) / 1000)}s</span>
                {liveRead.upiId ? (
                  <>
                    {" "}· site par UPI: <span className="mono">{liveRead.upiId}</span>
                  </>
                ) : null}
              </div>
              <div style={{ marginTop: 6 }} className="small muted">
                Sheet me value badalne ke 10 second ke andar website par aa jaati hai (payment page par turant —
                wo <span className="mono">?fresh=1</span> se padhta hai). Page reload karke yahan dobara check
                kariye.
              </div>
            </>
          ) : liveRead?.source === "csv" ? (
            <>
              <strong>⚠️ Settings published CSV se aa rahi hain (Apps Script nahi).</strong>
              <div style={{ marginTop: 6 }} className="small">
                Google <span className="mono">Publish to web</span> CSV ko ~5 minute cache karta hai — isliye sheet
                me UPI badalne par site par turant nahi dikhta. Real-time chahiye to Apps Script wala{" "}
                <span className="mono">/exec</span> URL <span className="mono">GOOGLE_SHEETS_WEBAPP_URL</span> me
                daaliye (<span className="mono">docs/09-devops/google-sheets.md</span>).
              </div>
            </>
          ) : (
            <>
              <strong>⚠️ Sheet configured hai, par settings padhi nahi ja saki.</strong>
              <div style={{ marginTop: 6 }} className="small">
                Is wajah se site apni <strong>default</strong> values (UPI ID samet) dikha rahi hai.
                {liveRead?.lastError ? (
                  <div style={{ marginTop: 6 }}>
                    Last error: <span className="mono">{liveRead.lastError}</span>
                  </div>
                ) : null}
              </div>
              <div style={{ marginTop: 6 }} className="small muted">
                Check: Apps Script deployment <span className="mono">Who has access: Anyone</span> hai? Token wahi
                hai jo <span className="mono">GOOGLE_SHEETS_TOKEN</span> me hai? Script ka <strong>New version</strong>{" "}
                deploy hua? (<span className="mono">/api/sheet-selftest?key=…</span> se poora detail milta hai.)
              </div>
            </>
          )}
        </div>
      ) : null}

      <div className="panel">
        <div className="panel-head">
          <h2>Admin panel link</h2>
          <span className="badge">sheet: admin_url</span>
        </div>
        <div className="panel-body">
          {settings.adminUrl ? (
            <p style={{ margin: 0 }}>
              <a href={settings.adminUrl} target="_blank" rel="noreferrer" className="mono">
                {settings.adminUrl}
              </a>
              <span className="small muted" style={{ display: "block", marginTop: 4 }}>
                Ye link sheet ke <span className="mono">Settings → admin_url</span> se aata hai — customer ko kabhi
                nahi dikhta.
              </span>
            </p>
          ) : (
            <p className="small muted" style={{ margin: 0 }}>
              Sheet ke <span className="mono">Settings</span> tab me <span className="mono">admin_url</span> row me
              apna admin panel ka link daaliye (jaise https://admin.noorethnicwear.in) — yahan dikhne lagega.
            </p>
          )}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Live settings (sheet se)</h2>
          <span className="badge">{overview.configured ? "google-sheet" : "admin/db"}</span>
        </div>
        <div className="panel-body">
          <div className="row">
            <div className="field">
              <label>UPI ID (payments)</label>
              <div className="mono">{settings.upiId ?? "—"}</div>
            </div>
            <div className="field">
              <label>UPI payee name</label>
              <div>{settings.upiName ?? "—"}</div>
            </div>
            <div className="field">
              <label>Support phone</label>
              <div>{settings.supportPhone ?? "—"}</div>
            </div>
            <div className="field">
              <label>WhatsApp</label>
              <div>{settings.whatsapp ?? "—"}</div>
            </div>
            <div className="field">
              <label>Support email</label>
              <div className="mono">{settings.supportEmail ?? "—"}</div>
            </div>
            <div className="field">
              <label>Free shipping</label>
              <div>{settings.freeShipping === false ? "No" : "Yes"}</div>
            </div>
          </div>
          <div className="field" style={{ marginBottom: 0 }}>
            <label>Announcement bar</label>
            <div>{settings.announcement || <span className="muted">default copy</span>}</div>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Settings page se save karte hi ye values sheet me bhi likh di jaati hain, aur sheet me seedha edit
            karne par 10 second ke andar website par aa jaati hain (payment page par turant).
          </p>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent orders (sheet rows)</h2>
          <span className="badge">{orderRows.length} rows</span>
        </div>
        {orderRows.length === 0 ? (
          <div className="panel-body small muted">
            Sheet me abhi koi row nahi (ya sheet connected nahi). Naya order aate hi yahan turant dikhega.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {orderRows.map((row, index) => (
                <tr key={`${row["Order number"] ?? "row"}-${index}`}>
                  {columns.map((column) => (
                    <td key={column} className={column === "Order number" ? "mono" : undefined}>
                      {String(row[column] ?? "").slice(0, 60)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent payments</h2>
        </div>
        {recent.payments.length === 0 ? (
          <div className="panel-body small muted">Payment rows yahan dikhengi (UTR submit / verified).</div>
        ) : (
          <table>
            <thead>
              <tr>
                {["Timestamp", "Event", "Order number", "Payment status", "Payment reference", "Total"].map((column) => (
                  <th key={column}>{column}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recent.payments.slice(0, 8).map((row, index) => (
                <tr key={index}>
                  {["Timestamp", "Event", "Order number", "Payment status", "Payment reference", "Total"].map((column) => (
                    <td key={column}>{String(row[column] ?? "").slice(0, 40)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
