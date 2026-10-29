import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ensureInvoice, getOrder } from "@/lib/orders";
import { buildInvoice, sellerFromSettings } from "@/lib/invoice";
import { getStoreSettings } from "@/lib/store-settings";
import { amountInWords } from "@/lib/amount-in-words";
import { formatDate } from "@/lib/format";
import { logoUrl } from "@/config/site";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "GST invoice", robots: { index: false, follow: false } };

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export default async function InvoicePage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ phone?: string }>;
}) {
  const { orderNumber } = await params;
  const { phone = "" } = await searchParams;
  const order = await getOrder(orderNumber);
  if (!order) notFound();

  const digits = phone.replace(/\D/g, "");
  const verified = digits.length >= 4 && digits.slice(-4) === order.phone.replace(/\D/g, "").slice(-4);

  if (!verified) {
    return (
      <div className="container-noor py-14">
        <div className="mx-auto max-w-[420px] border border-[#e9dfd4] bg-[#faf8f5] p-6">
          <h1 className="font-display text-[24px] font-medium">Download GST invoice</h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6259]">
            Enter the last 4 digits of the phone number used for order <strong>{order.orderNumber}</strong>
            to open its invoice.
          </p>
          <form method="get" className="mt-4 flex">
            <input
              name="phone"
              inputMode="numeric"
              maxLength={10}
              required
              placeholder="Last 4 digits"
              className="h-11 w-full border border-[#ddd2c6] bg-white px-3 text-[13px] outline-none focus:border-[#862222]"
            />
            <button
              type="submit"
              className="shrink-0 bg-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase"
            >
              Open
            </button>
          </form>
          <p className="mt-3 text-[11px] text-[#8a8078]">
            <Link href={`/orders/${order.orderNumber}`} className="underline">
              Back to order
            </Link>
          </p>
        </div>
      </div>
    );
  }

  const { order: withInvoice, invoice } = await ensureInvoice(order.orderNumber);
  const settings = await getStoreSettings();
  const view = buildInvoice(withInvoice, invoice.number, invoice.issuedAt, sellerFromSettings(settings));
  const rows = [...view.lines, ...(view.shippingLine ? [view.shippingLine] : [])];

  return (
    <div className="container-noor py-8 print:py-0">
      <div className="mx-auto max-w-[860px]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 print:hidden">
          <Link href={`/orders/${order.orderNumber}`} className="text-[12px] text-[#862222] underline">
            ← Back to order
          </Link>
          <div className="flex gap-2">
            <a
              href={`/api/orders/${order.orderNumber}/invoice?phone=${encodeURIComponent(phone)}`}
              className="border border-[#862222] px-4 py-2 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase"
            >
              Download PDF
            </a>
            <a
              href="javascript:window.print()"
              className="bg-[#862222] px-4 py-2 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase"
            >
              Print
            </a>
          </div>
        </div>

        <div className="border border-[#e9dfd4] bg-white print:border-0">
          {/* masthead */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-[#862222] px-5 py-4 text-white sm:px-8">
            <div>
              {/* brand logo — PDF par bhi yahi exact asset lagta hai */}
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={logoUrl}
                alt={view.seller.name}
                width={196}
                height={57}
                className="h-[52px] w-auto rounded-sm bg-white px-2 py-1"
              />
              <p className="mt-1.5 text-[10px] tracking-[.14em] text-[#f6dcd6] uppercase">
                Designer Anarkali Suits · Lehanga Choli · Suit Sets
              </p>
            </div>
            <div className="text-right">
              <p className="text-[15px] font-semibold tracking-[.14em] uppercase">Tax Invoice</p>
              <p className="mt-0.5 text-[9.5px] tracking-[.2em] text-[#f6dcd6] uppercase">Original for recipient</p>
            </div>
          </div>

          <div className="px-5 py-5 sm:px-8">
            {/* sold by + invoice meta */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <p className="text-[9.5px] font-semibold tracking-[.18em] text-[#862222] uppercase">Sold by</p>
                <p className="mt-1.5 text-[12.5px] font-semibold">{view.seller.name}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[#6b6259]">
                  {view.seller.address}
                  <br />
                  GSTIN: <strong className="text-[#2f2a25]">{view.seller.gstin}</strong>
                  <br />
                  {view.seller.email} · {view.seller.phone}
                </p>
              </div>
              <dl className="space-y-1 text-[11.5px]">
                {[
                  ["Invoice No.", view.number],
                  ["Invoice Date", formatDate(view.issuedAt)],
                  ["Order No.", order.orderNumber],
                  ["Order Date", formatDate(order.createdAt)],
                  ["Place of Supply", view.placeOfSupply],
                  ["Payment Mode", order.paymentMethod === "cod" ? "Cash on Delivery" : "Prepaid (online)"],
                ].map(([label, value]) => (
                  <div key={label} className="flex justify-between gap-3 border-b border-[#f4eee8] pb-1">
                    <dt className="text-[#8a8078]">{label}</dt>
                    <dd className="text-right font-medium">{value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            {/* billing + shipping */}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {[
                { title: "Billing address", lines: [
                  view.buyer.name,
                  view.buyer.address,
                  `${view.buyer.city}, ${view.buyer.state} - ${view.buyer.pincode}`,
                  `Phone: ${view.buyer.phone}`,
                  view.buyer.email,
                ] },
                { title: "Shipping address", lines: [
                  view.buyer.name,
                  view.buyer.address,
                  `${view.buyer.city}, ${view.buyer.state} - ${view.buyer.pincode}`,
                  `Phone: ${view.buyer.phone}`,
                  view.buyer.email,
                ] },
              ].map((block) => (
                <div key={block.title} className="border border-[#e9dfd4]">
                  <p className="border-b border-[#e9dfd4] bg-[#f7f2ec] px-3 py-1.5 text-[9.5px] font-semibold tracking-[.16em] text-[#862222] uppercase">
                    {block.title}
                  </p>
                  <div className="px-3 py-2 text-[11.5px] leading-relaxed">
                    {block.lines.filter(Boolean).map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* items */}
            <div className="mt-5 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-[11px]">
                <thead>
                  <tr className="bg-[#f7f2ec] text-left text-[9.5px] tracking-[.1em] text-[#862222] uppercase">
                    <th className="p-2 font-semibold">#</th>
                    <th className="p-2 font-semibold">Description of goods</th>
                    <th className="p-2 font-semibold">HSN</th>
                    <th className="p-2 text-center font-semibold">Qty</th>
                    <th className="p-2 text-right font-semibold">Rate</th>
                    <th className="p-2 text-right font-semibold">Taxable</th>
                    <th className="p-2 text-right font-semibold">GST%</th>
                    <th className="p-2 text-right font-semibold">{view.interState ? "IGST" : "CGST"}</th>
                    {view.interState ? null : <th className="p-2 text-right font-semibold">SGST</th>}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((line, index) => (
                    <tr key={`${line.title}-${index}`} className="border-b border-[#f1ebe5]">
                      <td className="p-2 align-top text-[#8a8078]">{index + 1}</td>
                      <td className="p-2 align-top">
                        {line.title}
                        {line.size && line.size !== "—" ? <span className="text-[#8a8078]"> (Size: {line.size})</span> : null}
                      </td>
                      <td className="p-2 align-top text-[#6b6259]">{line.hsn}</td>
                      <td className="p-2 text-center align-top">{line.quantity}</td>
                      <td className="p-2 text-right align-top">{rupees(line.unitPrice)}</td>
                      <td className="p-2 text-right align-top">{rupees(line.taxable)}</td>
                      <td className="p-2 text-right align-top text-[#6b6259]">{line.rate}%</td>
                      <td className="p-2 text-right align-top">{rupees(view.interState ? line.igst : line.cgst)}</td>
                      {view.interState ? null : <td className="p-2 text-right align-top">{rupees(line.sgst)}</td>}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* totals */}
            <div className="mt-4 flex flex-col items-end gap-2">
              <div className="w-full max-w-[340px] space-y-1 text-[11.5px]">
                {order.discount > 0 ? <Row label="Discount" value={`− ${rupees(order.discount)}`} /> : null}
                <Row label="Total taxable value" value={rupees(view.totals.taxable)} />
                {view.interState ? (
                  <Row label="IGST" value={rupees(view.totals.igst)} />
                ) : (
                  <>
                    <Row label="CGST" value={rupees(view.totals.cgst)} />
                    <Row label="SGST" value={rupees(view.totals.sgst)} />
                  </>
                )}
                <Row label="Total tax" value={rupees(view.totals.tax)} />
              </div>
              <div className="flex w-full max-w-[340px] items-center justify-between bg-[#862222] px-4 py-2.5 text-[13px] font-semibold text-white">
                <span className="tracking-[.08em] uppercase">Invoice total</span>
                <span>{rupees(order.total)}</span>
              </div>
            </div>

            <p className="mt-4 text-[11.5px]">
              <span className="font-semibold">Amount in words: </span>
              {amountInWords(order.total)}
            </p>

            {/* declaration + signatory */}
            <div className="mt-5 grid gap-4 border-t border-[#e9dfd4] pt-4 sm:grid-cols-[1.6fr_1fr]">
              <div>
                <p className="text-[9.5px] font-semibold tracking-[.18em] text-[#862222] uppercase">Declaration</p>
                <p className="mt-1.5 text-[10.5px] leading-relaxed text-[#6b6259]">
                  We declare that this invoice shows the actual price of the goods described and that all
                  particulars are true and correct. Goods are dispatched from our India warehouse. Prices are
                  inclusive of GST. 7 days replacement on unused products with tags intact. This is a
                  computer-generated invoice.
                </p>
                <p className="mt-2 text-[10.5px] text-[#4a423b]">Whether tax payable under reverse charge: No</p>
                <p className="mt-1 text-[10.5px] text-[#8a8078]">
                  For any query on this invoice, WhatsApp {view.seller.phone} or write to {view.seller.email}.
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10.5px] font-semibold text-[#862222]">
                  For {view.seller.name.toUpperCase()}
                </p>
                <div className="mt-8 border-t border-[#e9dfd4] pt-1 text-[10px] text-[#8a8078]">
                  Authorised Signatory
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-[#6b6259]">{label}</span>
      <span>{value}</span>
    </div>
  );
}
