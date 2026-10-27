import Link from "next/link";
import { createOrderAction } from "@/app/actions";
import { OrderItemPicker } from "@/components/order-item-picker";
import { getOrders, getProducts, getSettings } from "@/lib/data";

export const dynamic = "force-dynamic";

/**
 * Admin manual order — phone/WhatsApp/Instagram se aaya order yahan se create hota hai.
 * Order number (NE-XXXXXX) system banata hai, customer ko invoice + tracking milti hai,
 * aur Google Sheet me row turant chali jaati hai.
 */
export default async function NewOrderPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; handle?: string; phone?: string }>;
}) {
  const { error, handle, phone = "" } = await searchParams;
  const products = getProducts().filter((product) => product.inStock !== false);
  const settings = await getSettings();

  // customer detail page se "New order" — purani details prefill ho jaati hain
  const digits = phone.replace(/\D/g, "").slice(-10);
  const previous = digits
    ? (await getOrders())
        .filter((order) => order.phone === digits)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))[0]
    : undefined;

  return (
    <>
      <div className="topbar">
        <div>
          <h1>New order</h1>
          <p>Manual order — order number system banata hai, Google Sheet me row turant jaati hai</p>
        </div>
        <div className="actions">
          <Link className="btn" href="/orders">
            All orders
          </Link>
        </div>
      </div>

      {error ? <div className="notice warn">{error}</div> : null}
      {previous ? (
        <div className="notice" data-testid="prefilled-customer">
          {previous.customerName} (+91 {previous.phone}) ki details prefill kar di gayi hain — {previous.orderNumber} se.
          Badalna ho to seedha edit kar lijiye.
        </div>
      ) : null}

      <form action={createOrderAction} className="panel">
        <div className="panel-head">
          <h2>Customer</h2>
          <span className="badge">required</span>
        </div>
        <div className="panel-body">
          <div className="row">
            <div className="field">
              <label htmlFor="customerName">Full name</label>
              <input id="customerName" name="customerName" defaultValue={previous?.customerName ?? ""} required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="phone">Mobile (10 digit)</label>
              <input id="phone" name="phone" defaultValue={previous?.phone ?? digits} required inputMode="numeric" pattern="[0-9 ]{10,14}" />
            </div>
            <div className="field">
              <label htmlFor="email">Email</label>
              <input id="email" name="email" defaultValue={previous?.email ?? ""} type="email" required autoComplete="off" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="address">Address</label>
            <input id="address" name="address" defaultValue={previous?.address ?? ""} required autoComplete="off" />
          </div>
          <div className="row">
            <div className="field">
              <label htmlFor="city">City</label>
              <input id="city" name="city" defaultValue={previous?.city ?? ""} required autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="state">State</label>
              <input id="state" name="state" required defaultValue={previous?.state ?? "Rajasthan"} />
            </div>
            <div className="field">
              <label htmlFor="pincode">Pincode</label>
              <input id="pincode" name="pincode" defaultValue={previous?.pincode ?? ""} required inputMode="numeric" pattern="[0-9]{6}" />
            </div>
          </div>
          <div className="field">
            <label htmlFor="notes">Note (optional)</label>
            <input id="notes" name="notes" placeholder="WhatsApp par colour confirm kiya…" />
          </div>
        </div>

        <div className="panel-head">
          <h2>Item</h2>
          <span className="badge">1 product</span>
        </div>
        <div className="panel-body">
          <OrderItemPicker
            initialHandle={handle}
            products={products.map((product) => ({
              handle: product.handle,
              title: product.title,
              price: product.price,
              sizes: product.sizes,
            }))}
          />
          <label className="small" style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input type="checkbox" name="markPaid" defaultChecked style={{ width: 16, height: 16 }} />
            Payment already received — order ko paid + confirmed mark kariye
          </label>
        </div>

        <div className="panel-body">
          <button className="btn btn-primary" type="submit">
            Create order
          </button>
          <span className="small muted" style={{ marginLeft: 10 }}>
            UPI ID: {settings.upiId} · support {settings.supportPhone}
          </span>
        </div>
      </form>
    </>
  );
}
