import Link from "next/link";
import { getOrders } from "@/lib/data";
import { verifyPaymentAction } from "@/app/actions";
import { inr } from "@/lib/format";
import { getSession } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Payments — website par payment sirf backend verify hone ke baad "paid" hota hai.
 * Yahan admin manual UPI/bank transfer verify karta hai (tab order confirm hota hai)
 * aur gateway accounts ki health dikhti hai (ek block ho to agla automatic use hota hai).
 */
export default async function PaymentsPage() {
  const orders = await getOrders();
  const session = await getSession();
  const pending = orders.filter((order) => order.paymentStatus === "pending" || order.paymentStatus === "processing");
  const paid = orders.filter((order) => order.paymentStatus === "paid");
  const failed = orders.filter((order) => order.paymentStatus === "failed");

  const gateways = [1, 2, 3].map((index) => {
    const id = process.env[`RAZORPAY_KEY_ID_${index}`] ?? (index === 1 ? process.env.RAZORPAY_KEY_ID : "");
    return { index, configured: Boolean(id) };
  });

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Payments</h1>
          <p>Prepaid only — order tabhi confirm hota hai jab backend payment verify kare</p>
        </div>
      </div>

      <div className="row">
        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h2>Gateway accounts</h2>
          </div>
          <div className="panel-body">
            {gateways.map((gateway) => (
              <p key={gateway.index} className="small">
                Account {gateway.index}:{" "}
                <span className={gateway.configured ? "badge badge-success" : "badge"}>
                  {gateway.configured ? "configured" : "not set"}
                </span>
              </p>
            ))}
            <p className="small muted">
              Env me <span className="mono">RAZORPAY_KEY_ID_1..3</span> + secret dein. Ek account fail/block ho to
              agla automatic use hota hai; sab fail hon to customer ko store UPI QR milta hai aur payment admin
              verify karta hai. Koi bhi password/cookie save nahi hoti.
            </p>
          </div>
        </div>

        <div className="panel" style={{ marginTop: 0 }}>
          <div className="panel-head">
            <h2>Summary</h2>
          </div>
          <div className="panel-body">
            <p className="small">Pending verification: <strong>{pending.length}</strong></p>
            <p className="small">Paid: <strong>{paid.length}</strong></p>
            <p className="small">Failed: <strong>{failed.length}</strong></p>
          </div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Pending payments</h2>
          <span className="badge">{pending.length}</span>
        </div>
        <div className="panel-body">
          {pending.length === 0 ? (
            <p className="muted">Sab payments verified hain.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Gateway</th>
                  <th>Verify (UTR / reference)</th>
                </tr>
              </thead>
              <tbody>
                {pending.map((order) => (
                  <tr key={order.orderNumber}>
                    <td>
                      <Link href={`/orders/${order.orderNumber}`} className="mono">
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td>
                      {order.customerName}
                      <br />
                      <span className="small muted">{order.phone}</span>
                    </td>
                    <td>{inr(order.total)}</td>
                    <td className="small">{order.payment?.gateway ?? "—"}</td>
                    <td>
                      <form action={verifyPaymentAction} className="actions">
                        <input type="hidden" name="orderNumber" value={order.orderNumber} />
                        <input type="hidden" name="actor" value={session?.email ?? "admin"} />
                        <input name="amount" type="number" step="0.01" defaultValue={order.total / 100} style={{ width: 96 }} />
                        <input name="reference" placeholder="UTR / txn id" required style={{ width: 150 }} />
                        <button className="btn btn-sm btn-primary" type="submit">
                          Mark paid
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
