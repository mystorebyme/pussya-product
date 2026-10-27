import { getOrders, getProducts } from "@/lib/data";
import { inr } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function ReportsPage() {
  const orders = await getOrders();
  const products = getProducts();

  const byMonth = new Map<string, { orders: number; revenue: number }>();
  for (const order of orders) {
    const key = order.createdAt.slice(0, 7);
    const entry = byMonth.get(key) ?? { orders: 0, revenue: 0 };
    entry.orders += 1;
    if (order.paymentStatus === "paid" || order.paymentStatus === "cod") entry.revenue += order.total;
    byMonth.set(key, entry);
  }
  const months = [...byMonth.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  const byCollection = new Map<string, { units: number; revenue: number }>();
  const productMap = new Map(products.map((product) => [product.handle, product]));
  for (const order of orders) {
    for (const item of order.items) {
      const product = productMap.get(item.handle);
      const key = product?.collections[0] ?? "other";
      const entry = byCollection.get(key) ?? { units: 0, revenue: 0 };
      entry.units += item.quantity;
      entry.revenue += item.price * item.quantity;
      byCollection.set(key, entry);
    }
  }

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Reports</h1>
          <p>Sales overview — month aur collection ke hisaab se</p>
        </div>
      </div>

      <div className="panel" style={{ marginTop: 0 }}>
        <div className="panel-head">
          <h2>By month</h2>
        </div>
        {months.length === 0 ? (
          <div className="empty">Data aane par report banegi.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Month</th>
                <th>Orders</th>
                <th className="right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {months.map(([month, row]) => (
                <tr key={month}>
                  <td>{month}</td>
                  <td>{row.orders}</td>
                  <td className="right">{inr(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>By collection</h2>
        </div>
        {byCollection.size === 0 ? (
          <div className="empty">Data aane par report banegi.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Collection</th>
                <th>Units</th>
                <th className="right">Revenue</th>
              </tr>
            </thead>
            <tbody>
              {[...byCollection.entries()].map(([collection, row]) => (
                <tr key={collection}>
                  <td>{collection}</td>
                  <td>{row.units}</td>
                  <td className="right">{inr(row.revenue)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}
