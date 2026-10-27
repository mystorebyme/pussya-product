import Link from "next/link";
import { getCheckoutEvents, getOrders } from "@/lib/data";
import { dateTime, inr } from "@/lib/format";
import { PhoneLinks } from "@/components/contact-links";

export const dynamic = "force-dynamic";

const FILTERS = ["all", "placed", "confirmed", "packed", "shipped", "delivered", "cancelled"] as const;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const { status = "all", q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const [allOrders, checkout] = await Promise.all([getOrders(), getCheckoutEvents(50)]);
  const orders = allOrders
    .filter((order) => (status === "all" ? true : order.status === status))
    .filter((order) =>
      term
        ? `${order.orderNumber} ${order.customerName} ${order.phone} ${order.email}`.toLowerCase().includes(term)
        : true,
    );

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Orders</h1>
          <p>{orders.length} orders · status ke hisaab se filter kariye</p>
        </div>
        <div className="actions">
          <Link className="btn btn-primary" href="/orders/new" data-testid="manual-order">
            + New order
          </Link>
          <form className="actions" action="/orders">
            <input name="q" defaultValue={q} placeholder="Order number / phone / name" style={{ width: 260 }} />
            <input type="hidden" name="status" value={status} />
            <button className="btn" type="submit">
              Search
            </button>
          </form>
        </div>
      </div>

      <div className="panel" style={{ marginBottom: 12 }} data-testid="checkout-funnel">
        <div className="panel-head">
          <h2 style={{ margin: 0, fontSize: 14 }}>Checkout funnel (last 50 events)</h2>
          <span className="muted">checkout tak pahunche → review → order → fail</span>
        </div>
        <div className="actions" style={{ padding: 12, gap: 18 }}>
          {[
            ["Checkout started", checkout.funnel["checkout.started"] ?? 0],
            ["Review tak", checkout.funnel["checkout.review"] ?? 0],
            ["Order placed", checkout.funnel["order.placed"] ?? 0],
            ["Order failed", checkout.funnel["order.failed"] ?? 0],
          ].map(([label, value]) => (
            <div key={String(label)}>
              <div className="muted" style={{ fontSize: 11 }}>
                {label}
              </div>
              <strong style={{ fontSize: 18 }}>{value}</strong>
            </div>
          ))}
        </div>
        {checkout.events.filter((event) => event.event === "order.failed").length > 0 ? (
          <div style={{ padding: "0 12px 12px" }}>
            <div className="muted" style={{ fontSize: 11, marginBottom: 4 }}>
              Recent failures
            </div>
            <ul style={{ margin: 0, paddingLeft: 16, fontSize: 12 }}>
              {checkout.events
                .filter((event) => event.event === "order.failed")
                .slice(0, 5)
                .map((event) => (
                  <li key={event.id}>
                    {dateTime(event.createdAt)} — {event.reason ?? "unknown error"}
                    {event.phone ? ` · ${event.phone}` : ""}
                  </li>
                ))}
            </ul>
          </div>
        ) : null}
      </div>

      <div className="actions" style={{ marginBottom: 12 }}>
        {FILTERS.map((filter) => (
          <Link
            key={filter}
            href={`/orders?status=${filter}`}
            className={`btn btn-sm ${filter === status ? "btn-primary" : ""}`}
          >
            {filter}
          </Link>
        ))}
      </div>

      <div className="panel">
        {orders.length === 0 ? (
          <div className="empty">Koi order nahi mila.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>Items</th>
                <th>Payment</th>
                <th>Total</th>
                <th>Status</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="mono" href={`/orders/${order.orderNumber}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    <Link href={`/customers?phone=${encodeURIComponent(order.phone)}`} data-testid="customer-link">
                      {order.customerName}
                    </Link>
                    <div className="small muted" style={{ marginTop: 3 }}>
                      <PhoneLinks phone={order.phone} />
                    </div>
                  </td>
                  <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                  <td>
                    <span className={`badge ${order.paymentStatus === "paid" ? "badge-success" : order.paymentStatus === "cod" ? "" : "badge-warning"}`}>
                      {order.paymentMethod === "cod" ? "COD" : order.paymentStatus}
                    </span>
                  </td>
                  <td>{inr(order.total)}</td>
                  <td>
                    <span className="badge">{order.status}</span>
                  </td>
                  <td className="muted small">{dateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
