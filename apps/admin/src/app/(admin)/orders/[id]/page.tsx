import Link from "next/link";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/data";
import { dateTime, inr } from "@/lib/format";
import {
  setOrderNoteAction,
  updateContactAction,
  updateOrderStatusAction,
  reversePaymentAction,
  updateTrackingAction,
  verifyPaymentAction,
} from "@/app/actions";
import { getSession } from "@/lib/session";
import { PhoneLinks, whatsappHref } from "@/components/contact-links";

export const dynamic = "force-dynamic";

/** Invoice storefront par banti hai — admin ke env se uska base URL (localhost fallback nahi). */
const STOREFRONT_BASE = (
  process.env.NEXT_PUBLIC_STOREFRONT_URL ??
  process.env.NEXT_PUBLIC_STORE_URL ??
  process.env.STORE_API_URL ??
  ""
).replace(/\/$/, "");

/** Wahi courier jinke tracking link hum AWB se bana sakte hain (lib/tracking.ts) */
const COURIERS = [
  "Delhivery",
  "Blue Dart",
  "DTDC",
  "India Post",
  "Ekart",
  "XpressBees",
  "Shadowfax",
  "Ecom Express",
  "Shiprocket",
  "The Professional Couriers",
  "Amazon",
  "FedEx",
  "DHL",
];

const NEXT_STATUS: Record<string, string[]> = {
  placed: ["confirmed", "cancelled"],
  confirmed: ["packed", "cancelled"],
  packed: ["shipped", "cancelled"],
  shipped: ["delivered", "returned"],
  delivered: ["returned"],
  cancelled: [],
  returned: [],
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrder(id);
  if (!order) notFound();
  const session = await getSession();
  const actions = NEXT_STATUS[order.status] ?? [];

  return (
    <>
      <div className="topbar">
        <div>
          <p className="small muted">
            <Link href="/orders">← Orders</Link>
          </p>
          <h1 className="mono">{order.orderNumber}</h1>
          <p>
            {dateTime(order.createdAt)} · {order.items.length} line items · {inr(order.total)}
          </p>
        </div>
        <span className="badge badge-warning">{order.status}</span>
      </div>

      <div className="row">
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h2>Items</h2>
          </div>
          <table>
            <thead>
              <tr>
                <th>Product</th>
                <th>Size</th>
                <th>Qty</th>
                <th className="right">Price</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={`${item.handle}-${item.size}`}>
                  <td>
                    <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img className="thumb" src={`${item.image}?width=120`} alt="" />
                      <span>{item.title}</span>
                    </div>
                  </td>
                  <td>{item.size}</td>
                  <td>{item.quantity}</td>
                  <td className="right">{inr(item.price * item.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="panel-body">
            <table>
              <tbody>
                <tr>
                  <td className="muted">Subtotal</td>
                  <td className="right">{inr(order.subtotal)}</td>
                </tr>
                {order.discount > 0 ? (
                  <tr>
                    <td className="muted">Coupon {order.couponCode}</td>
                    <td className="right">− {inr(order.discount)}</td>
                  </tr>
                ) : null}
                <tr>
                  <td className="muted">Shipping</td>
                  <td className="right">Free</td>
                </tr>
                <tr>
                  <td>
                    <strong>Total</strong>
                  </td>
                  <td className="right">
                    <strong>{inr(order.total)}</strong>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <div className="panel" style={{ marginTop: 0 }}>
            <div className="panel-head">
              <h2>Customer</h2>
            </div>
            <div className="panel-body small" id="contact">
              <p style={{ marginTop: 0 }}>
                <strong>{order.customerName}</strong>
                <br />
                {order.address}
                <br />
                {order.city}, {order.state} — {order.pincode}
                <br />
                <a href={`mailto:${order.email}`}>{order.email}</a>
              </p>
              <PhoneLinks
                phone={order.phone}
                whatsappText={`Namaste ${order.customerName.split(" ")[0]}! Noor Ethnic Wear se — aapke order ${order.orderNumber} ke baare me.`}
              />
              {order.notes ? <p className="notice">{order.notes}</p> : null}
              <div className="actions" style={{ marginTop: 10 }}>
                <a className="btn btn-sm" href={whatsappHref(order.phone, `Order ${order.orderNumber} ka update`)} target="_blank" rel="noreferrer">
                  WhatsApp customer
                </a>
                <Link className="btn btn-sm" href={`/customers?phone=${encodeURIComponent(order.phone)}`}>
                  Customer history
                </Link>
              </div>

              <details className="contact-edit" open={false}>
                <summary>Details edit kariye (naam / phone / address)</summary>
                <form action={updateContactAction} style={{ marginTop: 10 }}>
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <div className="field">
                    <label htmlFor="customerName">Naam</label>
                    <input id="customerName" name="customerName" defaultValue={order.customerName} />
                  </div>
                  <div className="field">
                    <label htmlFor="phone">Phone (10 digit)</label>
                    <input id="phone" name="phone" inputMode="numeric" defaultValue={order.phone} />
                  </div>
                  <div className="field">
                    <label htmlFor="email">Email</label>
                    <input id="email" name="email" type="email" defaultValue={order.email} />
                  </div>
                  <div className="field">
                    <label htmlFor="address">Address</label>
                    <textarea id="address" name="address" rows={2} defaultValue={order.address} />
                  </div>
                  <div className="row">
                    <div className="field">
                      <label htmlFor="city">City</label>
                      <input id="city" name="city" defaultValue={order.city} />
                    </div>
                    <div className="field">
                      <label htmlFor="state">State</label>
                      <input id="state" name="state" defaultValue={order.state} />
                    </div>
                    <div className="field">
                      <label htmlFor="pincode">Pincode</label>
                      <input id="pincode" name="pincode" inputMode="numeric" defaultValue={order.pincode} />
                    </div>
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Save details
                  </button>
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    Change audit log me `order.contact_updated` ke roop me jaata hai. Tracking/AWB alag section me hai.
                  </p>
                </form>
              </details>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Update status</h2>
            </div>
            <div className="panel-body">
              {actions.length === 0 ? (
                <p className="small muted">Is order ka lifecycle complete hai.</p>
              ) : (
                <form action={updateOrderStatusAction}>
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <input type="hidden" name="actor" value={session?.email ?? "admin"} />
                  <div className="field">
                    <label htmlFor="status">New status</label>
                    <select id="status" name="status" defaultValue={actions[0]}>
                      {actions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <label htmlFor="note">Note (audit log me jaayega)</label>
                    <input id="note" name="note" placeholder="e.g. handed to Delhivery" />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Save status
                  </button>
                </form>
              )}
              <p className="small muted" style={{ marginBottom: 0 }}>
                Payment: <strong>{order.paymentMethod === "cod" ? "COD" : order.paymentStatus}</strong>
              </p>
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Customer ko dikhne wala update</h2>
            </div>
            <div className="panel-body">
              <form action={setOrderNoteAction}>
                <input type="hidden" name="orderNumber" value={order.orderNumber} />
                <div className="field">
                  <label htmlFor="statusNote">Abhi kahan atka hai / latest update</label>
                  <textarea
                    id="statusNote"
                    name="text"
                    rows={3}
                    maxLength={240}
                    defaultValue={order.statusNote?.text ?? ""}
                    placeholder="e.g. Delhivery pickup kal subah, AWB shaam tak mil jayega"
                  />
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    Customer ke order page par ye note status ke saath dikhta hai. Khaali chhod kar save karne par note hat
                    jaata hai.
                  </p>
                </div>
                <button className="btn btn-primary" type="submit">
                  Update note
                </button>
              </form>
              {order.statusNote?.at ? (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  Last note {dateTime(order.statusNote.at)} by {order.statusNote.by}
                </p>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Payment verification</h2>
            </div>
            <div className="panel-body">
              {order.paymentStatus === "paid" ? (
                <>
                <p className="small" style={{ marginBottom: 0 }}>
                  Payment <strong>paid</strong>
                  {order.payment?.verifiedAt ? ` — verified ${dateTime(order.payment.verifiedAt)}` : ""}
                  {order.payment?.reference ? ` (ref ${order.payment.reference})` : ""}. Customer ke order page par
                  bhi yahi dikhta hai.
                </p>
                <form action={reversePaymentAction} style={{ marginTop: 12 }}>
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <div className="field">
                    <label htmlFor="reverseReason">Bank me paisa nahi mila? (undo)</label>
                    <input id="reverseReason" name="reason" placeholder="e.g. UPI statement me entry nahi hai" />
                  </div>
                  <button type="submit" className="btn btn-ghost">
                    Payment not received — wapas pending kariye
                  </button>
                  <p className="small muted" style={{ marginBottom: 0 }}>
                    Isse payment pending ho jaata hai aur order (agar confirm tha) wapas placed. Sheet me
                    <code> payment.reversed </code> row jaati hai.
                  </p>
                </form>
                </>
              ) : (
                <form action={verifyPaymentAction}>
                  <input type="hidden" name="orderNumber" value={order.orderNumber} />
                  <div className="row">
                    <div className="field">
                      <label htmlFor="reference">UPI / bank reference (UTR)</label>
                      <input id="reference" name="reference" placeholder="e.g. 416123456789" required />
                    </div>
                    <div className="field">
                      <label htmlFor="amount">Amount received (₹)</label>
                      <input
                        id="amount"
                        name="amount"
                        inputMode="decimal"
                        defaultValue={(order.total / 100).toFixed(2)}
                      />
                    </div>
                  </div>
                  <div className="field">
                    <label htmlFor="paymentNote">Note (optional)</label>
                    <input id="paymentNote" name="note" placeholder="e.g. GPay screenshot verified" />
                  </div>
                  <button className="btn btn-primary" type="submit">
                    Mark payment verified
                  </button>
                </form>
              )}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Courier &amp; tracking</h2>
            </div>
            <div className="panel-body">
              <form action={updateTrackingAction}>
                <input type="hidden" name="orderNumber" value={order.orderNumber} />
                <div className="field">
                  <label htmlFor="courier">Courier</label>
                  <input
                    id="courier"
                    name="courier"
                    list="courier-list"
                    defaultValue={order.tracking?.courier ?? ""}
                    placeholder="Delhivery / Blue Dart / India Post"
                  />
                  <datalist id="courier-list">
                    {COURIERS.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <p className="small muted">List me se chuniye — tracking link khud ban jaata hai.</p>
                </div>
                <div className="field">
                  <label htmlFor="awb">AWB / tracking number</label>
                  <input id="awb" name="awb" defaultValue={order.tracking?.awb ?? ""} placeholder="e.g. 1234567890" />
                </div>
                <div className="field">
                  <label htmlFor="url">Tracking link (optional)</label>
                  <input
                    id="url"
                    name="url"
                    defaultValue={order.tracking?.url ?? ""}
                    placeholder="Khaali chhodiye — courier + AWB se link khud ban jaayega"
                  />
                </div>
                <button className="btn btn-primary" type="submit">
                  Save tracking
                </button>
              </form>
              {order.tracking?.updatedAt ? (
                <p className="small muted" style={{ marginBottom: 0 }}>
                  Last updated {dateTime(order.tracking.updatedAt)} by {order.tracking.updatedBy}
                </p>
              ) : null}
              {STOREFRONT_BASE ? (
                <p className="small" style={{ marginBottom: 0 }}>
                  <a
                    className="btn btn-sm"
                    href={`${STOREFRONT_BASE}/api/orders/${order.orderNumber}/invoice?phone=${order.phone}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Download GST invoice (PDF)
                  </a>
                </p>
              ) : null}
            </div>
          </div>

          <div className="panel">
            <div className="panel-head">
              <h2>Audit trail</h2>
            </div>
            <div className="panel-body small">
              {order.audit.map((entry, index) => (
                <p key={index} style={{ margin: "0 0 8px" }}>
                  <span className="muted">{dateTime(entry.at)}</span> · <strong>{entry.actor}</strong> ·{" "}
                  {entry.action}
                </p>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
