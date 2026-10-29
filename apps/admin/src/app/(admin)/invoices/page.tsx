import Link from "next/link";
import { getManualInvoices } from "@/lib/data";
import { createManualInvoiceAction } from "@/app/actions";
import { invoiceSlug } from "@/lib/invoice-slug";
import { getSession } from "@/lib/session";
import { dateOnly, inr } from "@/lib/format";

export const dynamic = "force-dynamic";

/**
 * Manual invoice — owner kisi bhi naam/address par apne store ka GST invoice
 * bana sakta hai (WhatsApp par bhejne ke liye). Number LK/MANUAL/0001 series me
 * rehta hai taaki real orders ki invoice numbering se clash na ho.
 */
export default async function InvoicesPage() {
  const invoices = await getManualInvoices();
  const session = await getSession();

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Invoices</h1>
          <p>Kisi bhi customer ke naam/address par invoice bana ke download ya WhatsApp par bhejiye</p>
        </div>
      </div>

      <div className="row">
        <div className="panel" style={{ marginTop: 0, flex: 2 }}>
          <div className="panel-head">
            <h2>Naya invoice</h2>
          </div>
          <form action={createManualInvoiceAction} className="panel-body">
            <input type="hidden" name="actor" value={session?.email ?? "admin"} />
            <div className="row">
              <div className="field">
                <label htmlFor="customerName">Customer name</label>
                <input id="customerName" name="customerName" required placeholder="Gurpreet Kaur" />
              </div>
              <div className="field">
                <label htmlFor="phone">Phone</label>
                <input id="phone" name="phone" placeholder="" />
              </div>
            </div>
            <div className="field">
              <label htmlFor="address">Address</label>
              <input id="address" name="address" placeholder="House / street / landmark" />
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="city">City</label>
                <input id="city" name="city" placeholder="Jaipur" />
              </div>
              <div className="field">
                <label htmlFor="state">State</label>
                <input id="state" name="state" defaultValue="Rajasthan" />
              </div>
              <div className="field">
                <label htmlFor="pincode">Pincode</label>
                <input id="pincode" name="pincode" placeholder="302001" />
              </div>
            </div>
            <div className="row">
              <div className="field">
                <label htmlFor="email">Email (optional)</label>
                <input id="email" name="email" type="email" />
              </div>
              <div className="field">
                <label htmlFor="orderRef">Order number (optional)</label>
                <input id="orderRef" name="orderRef" placeholder="NE-02UDIHF7" />
              </div>
            </div>

            <p className="small muted" style={{ marginTop: 16, marginBottom: 6 }}>
              Items (price ₹ me, tax inclusive)
            </p>
            {[0, 1, 2].map((row) => (
              <div className="row" key={row}>
                <div className="field" style={{ flex: 3 }}>
                  <label>Item {row + 1}</label>
                  <input name="itemTitle" placeholder="Product title" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Size</label>
                  <input name="itemSize" placeholder="XL" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Qty</label>
                  <input name="itemQty" type="number" min="1" defaultValue="1" />
                </div>
                <div className="field" style={{ flex: 1 }}>
                  <label>Price ₹</label>
                  <input name="itemPrice" type="number" min="0" step="1" />
                </div>
              </div>
            ))}

            <div className="field">
              <label htmlFor="notes">Note on invoice (optional)</label>
              <input id="notes" name="notes" placeholder="Exchange within 7 days with tags" />
            </div>

            <div className="actions" style={{ marginTop: 12 }}>
              <button className="btn btn-primary" type="submit">
                Generate invoice
              </button>
            </div>
          </form>
        </div>

        <div className="panel" style={{ marginTop: 0, flex: 1 }}>
          <div className="panel-head">
            <h2>Manual invoices</h2>
            <span className="badge">{invoices.length}</span>
          </div>
          <div className="panel-body">
            {invoices.length === 0 ? (
              <p className="muted">Abhi koi manual invoice nahi bana.</p>
            ) : (
              <ul style={{ paddingLeft: 0, listStyle: "none", margin: 0 }}>
                {invoices.slice(0, 20).map((invoice) => (
                  <li key={invoice.number} style={{ paddingBottom: 10, borderBottom: "1px solid #eee" }}>
                    <Link href={`/invoices/${invoiceSlug(invoice.number)}`}>
                      <strong className="mono">{invoice.number}</strong>
                    </Link>
                    <p className="small muted" style={{ margin: "2px 0 0" }}>
                      {invoice.customerName} · {inr(invoice.total)} ·{" "}
                      {dateOnly(invoice.createdAt)}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
