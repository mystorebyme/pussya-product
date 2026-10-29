import { getSettings } from "@/lib/data";
import { getSession } from "@/lib/session";
import { saveSettingsAction } from "@/app/actions";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const settings = await getSettings();
  const session = await getSession();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Settings</h1>
          <p>Shipping, payment aur support details (prepaid only — COD nahi)</p>
        </div>
      </div>

      <form action={saveSettingsAction} className="panel">
        <div className="panel-head">
          <h2>Store settings</h2>
          <button className="btn btn-primary btn-sm" type="submit">
            Save changes
          </button>
        </div>
        <div className="panel-body">
          <input type="hidden" name="actor" value={session?.email ?? "admin"} />
          <p className="small muted" style={{ marginTop: 0 }}>
            Save karte hi ye values Google Sheet ke <span className="mono">Settings</span> tab me bhi likh di
            jaati hain — owner sheet aur admin panel dono me same data dekhta hai.
          </p>
          <div className="field">
            <label htmlFor="announcement">Announcement bar</label>
            <input id="announcement" name="announcement" defaultValue={settings.announcement} />
          </div>
          <div className="row">
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="upiId">UPI ID (payments yahan aate hain)</label>
              <input id="upiId" name="upiId" defaultValue={settings.upiId} placeholder="name@bank" />
            </div>
            <div className="field">
              <label htmlFor="upiName">UPI payee name</label>
              <input id="upiName" name="upiName" defaultValue={settings.upiName} />
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="whatsapp">WhatsApp number</label>
              <input id="whatsapp" name="whatsapp" defaultValue={settings.whatsapp} />
            </div>
            <div className="field">
              <label htmlFor="adminUrl">Admin panel link (sheet: admin_url)</label>
              <input id="adminUrl" name="adminUrl" defaultValue={settings.adminUrl} placeholder="https://admin.yourdomain.com" />
            </div>
          </div>

          {/*
            GST invoice ka seller block — sirf admin panel me. Customer ko website
            par kabhi nahi dikhta; sirf invoice PDF/print par chhapta hai.
            Owner apna asli GSTIN/address yahan daalega (fake number hard-code nahi).
          */}
          <div className="panel-head" style={{ paddingInline: 0 }}>
            <h3 style={{ margin: 0 }}>GST invoice — seller details</h3>
            <span className="small muted">Sirf invoice par chhapta hai (public site par nahi)</span>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="sellerName">Registered business name</label>
              <input id="sellerName" name="sellerName" defaultValue={settings.sellerName} placeholder="Noor Ethnic Wear" />
            </div>
            <div className="field">
              <label htmlFor="sellerState">State (CGST/SGST vs IGST ke liye)</label>
              <input id="sellerState" name="sellerState" defaultValue={settings.sellerState} placeholder="Rajasthan" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="sellerAddress">Full seller address (invoice par chhapta hai)</label>
            <textarea
              id="sellerAddress"
              name="sellerAddress"
              rows={3}
              defaultValue={settings.sellerAddress}
              placeholder="Shop / building, street, area, city, state, PIN"
            />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="gstin">GSTIN</label>
              <input id="gstin" name="gstin" defaultValue={settings.gstin} placeholder="08ABCDE1234F1Z5" />
            </div>
            <div className="field">
              <label>&nbsp;</label>
              <p className="small muted" style={{ margin: 0 }}>
                {settings.gstin ? (
                  <>Invoice par <span className="mono">{settings.gstin}</span> chhapega.</>
                ) : (
                  <>GSTIN khaali hai — invoice par <strong>“GSTIN pending”</strong> chhapega (galat number nahi).</>
                )}
              </p>
            </div>
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="supportPhone">Support phone</label>
              <input id="supportPhone" name="supportPhone" defaultValue={settings.supportPhone} />
            </div>
            <div className="field">
              <label htmlFor="supportEmail">Support email</label>
              <input id="supportEmail" name="supportEmail" defaultValue={settings.supportEmail} />
            </div>
          </div>
          <p className="small muted" style={{ marginBottom: 0 }}>
            Settings database me save hoti hain aur audit log me record hoti hain. Agar Google Sheet
            configured hai (<code>GOOGLE_SHEETS_WEBAPP_URL</code>) to <strong>Settings sheet ki value</strong>{" "}
            jeetti hai — owner wahan se phone, email, UPI ID aur announcement bina redeploy badal sakta hai.
            Detail: <code>docs/09-devops/google-sheets.md</code>.
          </p>
        </div>
      </form>
    </>
  );
}
