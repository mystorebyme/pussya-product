import Link from "next/link";
import { notFound } from "next/navigation";
import { AutoPrint } from "@/components/auto-print";
import { getManualInvoice, getSettings } from "@/lib/data";
import { invoiceFromSlug, invoiceSlug } from "@/lib/invoice-slug";
import { inr, STORE_TIME_ZONE } from "@/lib/format";
import {
  GST_HSN_APPAREL,
  SELLER_STATE,
  apparelGstRate,
  splitTax,
} from "@noor/validation";

export const dynamic = "force-dynamic";

/**
 * Print-ready invoice (A4). Browser ke "Print → Save as PDF" se download hota hai,
 * layout wahi Amazon-style GST invoice hai jo customer ko order page par milta hai.
 */
export default async function ManualInvoicePage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const invoice = await getManualInvoice(invoiceFromSlug(number));
  if (!invoice) notFound();

  /** Seller block owner ki admin Settings se — koi hardcoded GSTIN/address nahi */
  const settings = await getSettings();
  const sellerState = settings.sellerState?.trim() || SELLER_STATE;
  const seller = {
    name: settings.sellerName?.trim() || "Noor Ethnic Wear",
    address: settings.sellerAddress?.trim() || "",
    gstin: settings.gstin?.trim() || "GSTIN pending",
    email: settings.supportEmail,
    phone: settings.supportPhone,
  };

  const interState = invoice.state.trim().toLowerCase() !== sellerState.toLowerCase();
  const lines = invoice.items.map((item) => {
    const gross = item.price * item.quantity;
    const tax = splitTax(gross, apparelGstRate(item.price), interState);
    return { ...item, gross, tax };
  });
  const totalTax = lines.reduce((sum, line) => sum + line.tax.tax, 0);
  const taxable = invoice.total - totalTax;
  const cgst = lines.reduce((sum, line) => sum + line.tax.cgst, 0);
  const sgst = lines.reduce((sum, line) => sum + line.tax.sgst, 0);
  const igst = lines.reduce((sum, line) => sum + line.tax.igst, 0);
  const issued = new Date(invoice.createdAt);

  return (
    <div className="invoice-wrap">
      <AutoPrint />
      <div className="topbar no-print">
        <div>
          <p className="small muted">
            <Link href="/invoices">← Invoices</Link>
          </p>
          <h1>{invoice.number}</h1>
        </div>
        <div className="actions">
          <a className="btn" href={`https://wa.me/91${invoice.phone.replace(/\D/g, "").slice(-10)}`} target="_blank" rel="noreferrer">
            WhatsApp customer
          </a>
          <a className="btn btn-primary" href={`/invoices/${invoiceSlug(invoice.number)}?print=1`} target="_blank" rel="noreferrer">
            Print / Save PDF
          </a>
        </div>
      </div>

      <article className="invoice-sheet">
        <header className="invoice-head">
          <div>
            {/* same to same logo jo PDF/HTML invoice par hai */}
            <img src="/invoice-logo.png" alt="Noor Ethnic Wear" width={196} height={51} />
            <p className="invoice-muted" style={{ marginTop: 8 }}>
              {seller.name}
              {seller.address ? (
                <>
                  <br />
                  {seller.address}
                </>
              ) : (
                <>
                  <br />
                  <span style={{ color: "#b3261e" }}>
                    Address missing — <Link href="/settings">Settings</Link> me daalein
                  </span>
                </>
              )}
              <br />
              GSTIN: <span className="mono">{seller.gstin}</span> · {seller.email}
              <br />
              {seller.phone}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <h2 style={{ margin: 0, letterSpacing: 1 }}>TAX INVOICE</h2>
            <p className="invoice-muted">
              Invoice No: <strong>{invoice.number}</strong>
              <br />
              Date: {issued.toLocaleDateString("en-IN", { timeZone: STORE_TIME_ZONE })}
              {invoice.orderRef ? (
                <>
                  <br />
                  Order: {invoice.orderRef}
                </>
              ) : null}
              <br />
              Place of supply: {invoice.state}
            </p>
          </div>
        </header>

        <section className="invoice-parties">
          <div>
            <p className="invoice-label">Billed to</p>
            <p style={{ margin: 0, fontWeight: 600 }}>{invoice.customerName}</p>
            <p className="invoice-muted" style={{ margin: 0 }}>
              {invoice.address}
              <br />
              {invoice.city}, {invoice.state} {invoice.pincode}
              <br />
              {invoice.phone ? `Phone: ${invoice.phone}` : null}
              {invoice.email ? (
                <>
                  <br />
                  {invoice.email}
                </>
              ) : null}
            </p>
          </div>
          <div>
            <p className="invoice-label">Payment</p>
            <p className="invoice-muted" style={{ margin: 0 }}>
              Prepaid · UPI
              <br />
              Total paid: <strong>{inr(invoice.total)}</strong>
            </p>
          </div>
        </section>

        <table className="invoice-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Description</th>
              <th>Size</th>
              <th>Qty</th>
              <th>HSN</th>
              <th style={{ textAlign: "right" }}>Amount</th>
            </tr>
          </thead>
          <tbody>
            {lines.map((line, index) => (
              <tr key={`${line.title}-${index}`}>
                <td>{index + 1}</td>
                <td>{line.title}</td>
                <td>{line.size ?? "—"}</td>
                <td>{line.quantity}</td>
                <td>{GST_HSN_APPAREL}</td>
                <td style={{ textAlign: "right" }}>{inr(line.gross)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <section className="invoice-totals">
          <div>
            <p className="invoice-label">Tax summary</p>
            <p className="invoice-muted" style={{ margin: 0 }}>
              Taxable value: {inr(taxable)}
              <br />
              {interState ? `IGST: ${inr(igst)}` : `CGST: ${inr(cgst)} · SGST: ${inr(sgst)}`}
              <br />
              Total GST: {inr(totalTax)}
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="invoice-muted" style={{ margin: 0 }}>
              Subtotal: {inr(invoice.subtotal)}
              <br />
              Shipping: Free
            </p>
            <p style={{ margin: "6px 0 0", fontSize: 18, fontWeight: 700 }}>
              Total: {inr(invoice.total)}
            </p>
          </div>
        </section>

        <footer className="invoice-foot">
          <p>{invoice.notes ?? "Tax inclusive invoice. Exchange within 7 days with original tags."}</p>
          <p>
            This is a computer generated invoice · Noor Ethnic Wear
          </p>
        </footer>
      </article>

      <style>{`
        .invoice-wrap { max-width: 860px; }
        .invoice-sheet {
          background: #fff; border: 1px solid #e6e6e6; padding: 28px 30px; margin-top: 16px;
          font-size: 12.5px; color: #222; line-height: 1.5;
        }
        .invoice-head { display: flex; justify-content: space-between; gap: 20px; border-bottom: 1px solid #e6e6e6; padding-bottom: 14px; }
        .invoice-head h2 { font-size: 16px; }
        .invoice-muted { color: #666; font-size: 11.5px; }
        .invoice-label { font-size: 10px; letter-spacing: .12em; text-transform: uppercase; color: #888; margin: 0 0 4px; }
        .invoice-parties { display: flex; justify-content: space-between; gap: 24px; padding: 16px 0; border-bottom: 1px solid #eee; }
        .invoice-table { width: 100%; border-collapse: collapse; margin-top: 14px; }
        .invoice-table th { text-align: left; font-size: 10.5px; letter-spacing: .1em; text-transform: uppercase; color: #777; border-bottom: 1px solid #ddd; padding: 8px 6px; }
        .invoice-table td { padding: 8px 6px; border-bottom: 1px solid #f0f0f0; vertical-align: top; }
        .invoice-totals { display: flex; justify-content: space-between; gap: 24px; padding-top: 14px; }
        .invoice-foot { margin-top: 24px; border-top: 1px solid #eee; padding-top: 10px; color: #777; font-size: 10.5px; }
        @media print {
          .no-print, nav, header.site { display: none !important; }
          .invoice-sheet { border: none; margin: 0; padding: 0; }
          body { background: #fff; }
        }
      `}</style>
    </div>
  );
}
