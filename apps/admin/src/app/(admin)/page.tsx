import Link from "next/link";
import { getManualInvoices, getOrders, getProducts, getMessages } from "@/lib/data";
import { overrideStats } from "@/lib/catalog-admin";
import { publishCatalogAction } from "@/app/actions";
import { dateTime, inr } from "@/lib/format";
import { PhoneLinks } from "@/components/contact-links";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const orders = await getOrders();
  const products = getProducts();
  const messages = await getMessages(100);
  const invoices = await getManualInvoices();
  const catalogState = overrideStats();
  const pendingPayments = orders.filter((order) => order.paymentStatus === "pending" || order.paymentStatus === "processing");

  const paid = orders.filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "cod");
  const revenue = paid.reduce((sum, order) => sum + order.total, 0);
  const aov = paid.length ? Math.round(revenue / paid.length) : 0;
  const pending = orders.filter((order) => order.status === "placed").length;
  const lowStock = products.filter((product) => !product.inStock).length;
  const today = new Date().toISOString().slice(0, 10);
  const todayOrders = orders.filter((order) => order.createdAt.startsWith(today));
  const todayRevenue = todayOrders
    .filter((o) => o.paymentStatus === "paid" || o.paymentStatus === "cod")
    .reduce((sum, order) => sum + order.total, 0);

  const topProducts = new Map<string, { title: string; qty: number; revenue: number }>();
  for (const order of orders) {
    for (const item of order.items) {
      const entry = topProducts.get(item.handle) ?? { title: item.title, qty: 0, revenue: 0 };
      entry.qty += item.quantity;
      entry.revenue += item.price * item.quantity;
      topProducts.set(item.handle, entry);
    }
  }
  const top = [...topProducts.values()].sort((a, b) => b.qty - a.qty).slice(0, 5);

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Dashboard</h1>
          <p>Aaj ka overview · {products.length} live products</p>
        </div>
        <div className="actions">
          <form action={publishCatalogAction}>
            <button className="btn" type="submit" title="Admin edits ko website par bhejo">
              Publish website
            </button>
          </form>
          <Link className="btn" href="/invoices">
            New invoice
          </Link>
          <Link className="btn btn-primary" href="/orders">
            View orders
          </Link>
        </div>
      </div>

      {pendingPayments.length > 0 ? (
        <div className="panel">
          <div className="panel-head">
            <h2>Payments to verify</h2>
            <Link className="btn btn-sm" href="/payments">
              Open payments
            </Link>
          </div>
          <div className="panel-body">
            <p className="small">
              <strong>{pendingPayments.length}</strong> order payment verify hone ka intezaar kar rahe hain. Backend
              verify hone tak order confirm nahi hota.
            </p>
          </div>
        </div>
      ) : null}

      <div className="cards">
        <div className="card">
          <div className="label">Revenue (all time)</div>
          <div className="value">{inr(revenue)}</div>
          <div className="hint">{paid.length} paid / COD orders</div>
        </div>
        <div className="card">
          <div className="label">Today</div>
          <div className="value">{inr(todayRevenue)}</div>
          <div className="hint">{todayOrders.length} orders today</div>
        </div>
        <div className="card">
          <div className="label">Pending dispatch</div>
          <div className="value">{pending}</div>
          <div className="hint">status = placed</div>
        </div>
        <div className="card">
          <div className="label">Average order value</div>
          <div className="value">{inr(aov)}</div>
          <div className="hint">paid + COD orders</div>
        </div>
        <div className="card">
          <div className="label">Out of stock</div>
          <div className="value">{lowStock}</div>
          <div className="hint">catalogue me hidden</div>
        </div>
        <div className="card">
          <div className="label">New messages</div>
          <div className="value">{messages.filter((m) => !m.handled).length}</div>
          <div className="hint">contact form se</div>
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Recent orders</h2>
          <Link className="btn btn-sm" href="/orders">
            All orders
          </Link>
        </div>
        {orders.length === 0 ? (
          <div className="empty">
            Abhi koi order nahi hai. Storefront se test order place kar ke dekhein.
          </div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Order</th>
                <th>Customer</th>
                <th>City</th>
                <th>Total</th>
                <th>Status</th>
                <th>Placed</th>
              </tr>
            </thead>
            <tbody>
              {orders.slice(0, 8).map((order) => (
                <tr key={order.id}>
                  <td>
                    <Link className="mono" href={`/orders/${order.orderNumber}`}>
                      {order.orderNumber}
                    </Link>
                  </td>
                  <td>
                    <Link
                      href={`/customers?phone=${encodeURIComponent(order.phone)}`}
                      data-testid="customer-link"
                    >
                      {order.customerName}
                    </Link>
                    <div className="small" style={{ marginTop: 2 }}>
                      <PhoneLinks phone={order.phone} />
                    </div>
                  </td>
                  <td className="muted">{order.city}</td>
                  <td>{inr(order.total)}</td>
                  <td>
                    <span className="badge badge-warning">{order.status}</span>
                  </td>
                  <td className="muted small">{dateTime(order.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Best sellers</h2>
          <span className="small muted">orders ke hisaab se</span>
        </div>
        <div className="panel-body">
          {top.length === 0 ? (
            <p className="muted small">Data aane par yahan top styles dikhenge.</p>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Units</th>
                  <th className="right">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {top.map((row) => (
                  <tr key={row.title}>
                    <td>{row.title}</td>
                    <td>{row.qty}</td>
                    <td className="right">{inr(row.revenue)}</td>
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
