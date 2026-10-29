import Link from "next/link";
import { getOrders } from "@/lib/data";
import { dateOnly, dateTime, inr } from "@/lib/format";
import { PhoneLinks } from "@/components/contact-links";
import type { Order } from "@noor/types";

export const dynamic = "force-dynamic";

type Customer = {
  name: string;
  phone: string;
  email: string;
  city: string;
  state: string;
  address: string;
  pincode: string;
  orders: number;
  spend: number;
  last: string;
  first: string;
};

const STATUS_BADGE: Record<string, string> = {
  placed: "badge-warning",
  confirmed: "",
  packed: "",
  shipped: "",
  delivered: "badge-success",
  cancelled: "badge-danger",
  returned: "badge-danger",
};

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ phone?: string; q?: string }>;
}) {
  const { phone = "", q = "" } = await searchParams;
  const term = q.trim().toLowerCase();
  const orders = await getOrders();
  const map = new Map<string, Customer>();

  for (const order of orders) {
    const key = order.phone;
    const entry =
      map.get(key) ??
      ({
        name: order.customerName,
        phone: order.phone,
        email: order.email,
        city: order.city,
        state: order.state,
        address: order.address,
        pincode: order.pincode,
        orders: 0,
        spend: 0,
        last: order.createdAt,
        first: order.createdAt,
      } satisfies Customer);
    entry.orders += 1;
    entry.spend += order.total;
    if (order.createdAt > entry.last) {
      // latest order ki details sabse up-to-date hoti hain
      entry.last = order.createdAt;
      entry.name = order.customerName;
      entry.email = order.email;
      entry.city = order.city;
      entry.state = order.state;
      entry.address = order.address;
      entry.pincode = order.pincode;
    }
    if (order.createdAt < entry.first) entry.first = order.createdAt;
    map.set(key, entry);
  }

  const all = [...map.values()].sort((a, b) => b.spend - a.spend);
  const customers = all.filter((customer) =>
    term ? `${customer.name} ${customer.phone} ${customer.email} ${customer.city}`.toLowerCase().includes(term) : true,
  );
  const digits = phone.replace(/\D/g, "").slice(-10);
  const selected = digits ? map.get(digits) : undefined;
  const selectedOrders: Order[] = digits
    ? orders.filter((order) => order.phone === digits).sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    : [];

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Customers</h1>
          <p>
            {all.length} unique customers · orders se derive kiya gaya · naam/phone par tap karke details kholein
          </p>
        </div>
        <form className="actions" action="/customers">
          <input name="q" defaultValue={q} placeholder="Naam / phone / email / city" style={{ width: 250 }} />
          <button className="btn" type="submit">
            Search
          </button>
        </form>
      </div>

      {selected ? (
        <div className="panel" style={{ marginBottom: 14 }} data-testid="customer-detail">
          <div className="panel-head">
            <h2>{selected.name}</h2>
            <Link className="btn btn-sm" href="/customers">
              Close
            </Link>
          </div>
          <div className="panel-body">
            <div className="row">
              <div className="small">
                <p style={{ marginTop: 0 }}>
                  <strong>Phone</strong>
                  <br />
                  <PhoneLinks
                    phone={selected.phone}
                    whatsappText={`Namaste ${selected.name.split(" ")[0]}! Noor Ethnic Wear se — aapke order ke baare me baat karni hai.`}
                  />
                </p>
                <p>
                  <strong>Email</strong>
                  <br />
                  <a href={`mailto:${selected.email}`}>{selected.email}</a>
                </p>
                <p>
                  <strong>Delivery address</strong>
                  <br />
                  {selected.address}
                  <br />
                  {selected.city}, {selected.state} — {selected.pincode}
                </p>
                <p className="muted" style={{ marginBottom: 0 }}>
                  Pehla order {dateOnly(selected.first)} · last order {dateOnly(selected.last)}
                </p>
              </div>
              <div className="small">
                <p style={{ marginTop: 0 }}>
                  <strong>Lifetime value</strong>
                  <br />
                  {inr(selected.spend)} · {selected.orders} order{selected.orders === 1 ? "" : "s"}
                </p>
                <p>
                  <strong>Average order</strong>
                  <br />
                  {inr(Math.round(selected.spend / Math.max(1, selected.orders)))}
                </p>
                <div className="actions">
                  <Link className="btn btn-sm btn-primary" href={`/orders/new?phone=${selected.phone}`}>
                    + New order
                  </Link>
                  <Link className="btn btn-sm" href={`/orders?q=${encodeURIComponent(selected.phone)}`}>
                    Sab orders
                  </Link>
                </div>
              </div>
            </div>

            <table style={{ marginTop: 12 }}>
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Date</th>
                  <th>Items</th>
                  <th>Total</th>
                  <th>Status</th>
                  <th>Payment</th>
                  <th className="right">Edit</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrders.map((order) => (
                  <tr key={order.id}>
                    <td>
                      <Link className="mono" href={`/orders/${order.orderNumber}`}>
                        {order.orderNumber}
                      </Link>
                    </td>
                    <td className="muted small">{dateTime(order.createdAt)}</td>
                    <td>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                    <td>{inr(order.total)}</td>
                    <td>
                      <span className={`badge ${STATUS_BADGE[order.status] ?? ""}`}>{order.status}</span>
                    </td>
                    <td>
                      <span
                        className={`badge ${
                          order.paymentStatus === "paid" ? "badge-success" : order.paymentMethod === "cod" ? "" : "badge-warning"
                        }`}
                      >
                        {order.paymentMethod === "cod" ? "COD" : order.paymentStatus}
                      </span>
                    </td>
                    <td className="right">
                      <Link className="btn btn-sm" href={`/orders/${order.orderNumber}#contact`}>
                        Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="panel">
        {customers.length === 0 ? (
          <div className="empty">Abhi koi customer data nahi hai.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Contact</th>
                <th>City</th>
                <th>Orders</th>
                <th>Lifetime value</th>
                <th>Last order</th>
                <th className="right">Detail</th>
              </tr>
            </thead>
            <tbody>
              {customers.map((customer) => (
                <tr key={customer.phone}>
                  <td>
                    <Link href={`/customers?phone=${encodeURIComponent(customer.phone)}`} data-testid="customer-link">
                      <strong>{customer.name}</strong>
                    </Link>
                  </td>
                  <td>
                    <PhoneLinks phone={customer.phone} />
                    <div className="small muted" style={{ marginTop: 3 }}>
                      <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    </div>
                  </td>
                  <td>
                    {customer.city}
                    <div className="small muted">{customer.state}</div>
                  </td>
                  <td>{customer.orders}</td>
                  <td>{inr(customer.spend)}</td>
                  <td className="muted small">{dateOnly(customer.last)}</td>
                  <td className="right">
                    <Link className="btn btn-sm" href={`/customers?phone=${encodeURIComponent(customer.phone)}`}>
                      Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <div className="notice" style={{ marginTop: 14 }}>
        DPDP note: customer data sirf order fulfil karne aur support ke liye use karein. Erasure request
        aane par yeh record delete karna hoga — process `docs/07-security/india-compliance-dpdp.md` me hai.
      </div>
    </>
  );
}
