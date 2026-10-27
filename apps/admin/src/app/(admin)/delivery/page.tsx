import { getDelivery } from "@/lib/data";
import { getSession } from "@/lib/session";
import { saveDeliverySettingsAction, togglePinRuleAction } from "@/app/actions";

export const dynamic = "force-dynamic";

/**
 * Delivery / pincode control.
 *
 * - State-wise allow: jo states tick hain, sirf unke pincodes deliver hote hain.
 * - Block list: kisi bhi state ka specific pincode band.
 * - Allow list: state band hone par bhi specific pincode chalu.
 * Website par har pincode check yahi rules se hota hai (customer ko neutral message dikhta hai).
 */
export default async function DeliveryPage() {
  const { settings, states, totals } = await getDelivery();
  const session = await getSession();

  const selectedStates = new Set(
    Object.entries(settings.states)
      .filter(([, allowed]) => allowed)
      .map(([state]) => state),
  );
  const allMode = settings.allowAllStates;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Delivery &amp; pincodes</h1>
          <p>
            Kaunse pincodes par delivery ho — state wise allow kariye, aur koi bhi pincode block/allow
            kariye. Website ke pincode check aur order booking par turant lagta hai.
          </p>
        </div>
        <div className="small" style={{ textAlign: "right" }}>
          <div>
            <strong>{totals.pincodes.toLocaleString("en-IN")}</strong> pincodes · {totals.states} states
          </div>
          <div>Last saved: {settings.updatedBy || "system"}</div>
        </div>
      </div>

      <form action={saveDeliverySettingsAction} className="panel">
        <div className="panel-head">
          <h2>State wise delivery</h2>
          <button className="btn btn-primary btn-sm" type="submit">
            Save rules
          </button>
        </div>
        <div className="panel-body">
          <input type="hidden" name="actor" value={session?.email ?? "admin"} />

          <div className="field">
            <label>Kitne states par delivery?</label>
            <label className="small" style={{ textTransform: "none", letterSpacing: 0, display: "block" }}>
              <input type="radio" name="stateMode" value="all" defaultChecked={allMode} style={{ width: "auto", marginRight: 8 }} />
              Sabhi states allowed (default)
            </label>
            <label className="small" style={{ textTransform: "none", letterSpacing: 0, display: "block" }}>
              <input type="radio" name="stateMode" value="only" defaultChecked={!allMode} style={{ width: "auto", marginRight: 8 }} />
              Sirf niche tick kiye states allowed
            </label>
          </div>

          <div className="field">
            <label>States</label>
            <div
              className="small"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
                gap: 6,
                textTransform: "none",
                letterSpacing: 0,
              }}
            >
              {states.map((row) => (
                <label key={row.state} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <input
                    type="checkbox"
                    name="states"
                    value={row.state}
                    defaultChecked={selectedStates.has(row.state)}
                    style={{ width: "auto" }}
                  />
                  <span>
                    {row.state}
                    <span style={{ opacity: 0.6 }}> · {row.pincodes} pins</span>
                  </span>
                </label>
              ))}
              {states.length === 0 ? (
                <p className="small">
                  State list storefront API se aati hai — `STORE_API_URL` set nahi hai ya API reachable nahi.
                </p>
              ) : null}
            </div>
          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="deliveryDays">Delivery estimate (customer ko dikhta hai)</label>
              <input
                id="deliveryDays"
                name="deliveryDays"
                defaultValue={settings.deliveryDays}
                placeholder="4-7 business days"
              />
            </div>

          </div>

          <div className="row">
            <div className="field">
              <label htmlFor="blockedPincodes">Blocked pincodes (ek line me ek)</label>
              <textarea
                id="blockedPincodes"
                name="blockedPincodes"
                rows={6}
                defaultValue={settings.blockedPincodes
                  .map((row) => (row.note ? `${row.pincode} | ${row.note}` : row.pincode))
                  .join("\n")}
                placeholder={"302001 | Jaipur city centre band\n400001"}
                style={{ fontFamily: "monospace" }}
              />
              <p className="small" style={{ textTransform: "none", letterSpacing: 0 }}>
                {settings.blockedPincodes.length} blocked — state allowed hone par bhi ye deliver nahi honge.
              </p>
            </div>
            <div className="field">
              <label htmlFor="allowedPincodes">Allowed pincodes (override, ek line me ek)</label>
              <textarea
                id="allowedPincodes"
                name="allowedPincodes"
                rows={6}
                defaultValue={settings.allowedPincodes
                  .map((row) => (row.note ? `${row.pincode} | ${row.note}` : row.pincode))
                  .join("\n")}
                placeholder={"400001 | sirf ye pin Mumbai me"}
                style={{ fontFamily: "monospace" }}
              />
              <p className="small" style={{ textTransform: "none", letterSpacing: 0 }}>
                {settings.allowedPincodes.length} allowed — state band ho tab bhi ye pincodes chalenge.
                (Block list hamesha jeetti hai.)
              </p>
            </div>
          </div>
        </div>
      </form>

      <div className="panel">
        <div className="panel-head">
          <h2>Ek pincode turant block / allow</h2>
        </div>
        <div className="panel-body">
          <div className="row">
            <form action={togglePinRuleAction} className="field">
              <input type="hidden" name="actor" value={session?.email ?? "admin"} />
              <input type="hidden" name="list" value="blocked" />
              <input type="hidden" name="op" value="add" />
              <label htmlFor="blockPin">Block pincode</label>
              <input id="blockPin" name="pincode" inputMode="numeric" placeholder="302001" maxLength={6} />
              <input name="note" placeholder="Reason (optional)" />
              <button className="btn btn-sm" type="submit" style={{ marginTop: 8 }}>
                Block
              </button>
            </form>

            <form action={togglePinRuleAction} className="field">
              <input type="hidden" name="actor" value={session?.email ?? "admin"} />
              <input type="hidden" name="list" value="allowed" />
              <input type="hidden" name="op" value="add" />
              <label htmlFor="allowPin">Allow pincode (override)</label>
              <input id="allowPin" name="pincode" inputMode="numeric" placeholder="400001" maxLength={6} />
              <input name="note" placeholder="Reason (optional)" />
              <button className="btn btn-sm" type="submit" style={{ marginTop: 8 }}>
                Allow
              </button>
            </form>
          </div>

          <div className="row" style={{ marginTop: 16 }}>
            <div className="field">
              <label>Blocked ({settings.blockedPincodes.length})</label>
              <ul className="small" style={{ textTransform: "none", letterSpacing: 0 }}>
                {settings.blockedPincodes.map((row) => (
                  <li key={row.pincode} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code>{row.pincode}</code>
                    {row.note ? <span>{row.note}</span> : null}
                    <form action={togglePinRuleAction} style={{ display: "inline" }}>
                      <input type="hidden" name="list" value="blocked" />
                      <input type="hidden" name="op" value="remove" />
                      <input type="hidden" name="pincode" value={row.pincode} />
                      <button className="btn btn-sm" type="submit">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
                {settings.blockedPincodes.length === 0 ? <li>Koi blocked pincode nahi.</li> : null}
              </ul>
            </div>

            <div className="field">
              <label>Allowed overrides ({settings.allowedPincodes.length})</label>
              <ul className="small" style={{ textTransform: "none", letterSpacing: 0 }}>
                {settings.allowedPincodes.map((row) => (
                  <li key={row.pincode} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <code>{row.pincode}</code>
                    {row.note ? <span>{row.note}</span> : null}
                    <form action={togglePinRuleAction} style={{ display: "inline" }}>
                      <input type="hidden" name="list" value="allowed" />
                      <input type="hidden" name="op" value="remove" />
                      <input type="hidden" name="pincode" value={row.pincode} />
                      <button className="btn btn-sm" type="submit">
                        Remove
                      </button>
                    </form>
                  </li>
                ))}
                {settings.allowedPincodes.length === 0 ? <li>Koi override nahi.</li> : null}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
