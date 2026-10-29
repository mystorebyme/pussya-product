import "server-only";

import PDFDocument from "pdfkit";
import { amountInWords } from "@/lib/amount-in-words";
import { invoiceLogoImage } from "@/lib/invoice-logo";
import type { InvoiceLine, InvoiceView } from "@/lib/invoice";

const money = (paise: number) =>
  ((paise ?? 0) / 100).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/** R39: invoice PDF ki date hamesha IST me (server UTC par render hota hai). */
const dateLabel = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric", timeZone: "Asia/Kolkata" });

const MAROON = "#862222";
const INK = "#2f2a25";
const MUTED = "#6b6259";
const LINE = "#dcd2c7";
const SOFT = "#f7f2ec";

export async function renderInvoicePdf(view: InvoiceView): Promise<Buffer> {
  // masthead logo pehle load (live store ka asli logo; na mile to text masthead)
  const logo = await invoiceLogoImage();
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 36, bufferPages: true });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const left = doc.page.margins.left;
    const right = doc.page.width - doc.page.margins.right;
    const width = right - left;

    /* ── masthead: brand logo (exact wordmark) + tax invoice label ── */
    try {
      if (!logo) throw new Error("logo unavailable");
      doc.image(logo, left, 34, { fit: [150, 46], valign: "center" });
    } catch {
      // logo render fail ho jaye to bhi invoice rukna nahi chahiye
      doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(19).text(view.seller.name.toUpperCase(), left, 44);
    }
    doc
      .fillColor(MAROON)
      .font("Helvetica-Bold")
      .fontSize(14)
      .text("TAX INVOICE", left, 38, { width, align: "right" });
    doc
      .fillColor(MUTED)
      .font("Helvetica")
      .fontSize(7)
      .text("ORIGINAL FOR RECIPIENT", left, 56, { width, align: "right" })
      .text("Designer Anarkali Suits · Lehenga Choli · Suit Sets", left, 68, { width, align: "right" });

    doc.moveTo(left, 90).lineTo(right, 90).lineWidth(1.2).strokeColor(MAROON).stroke();
    doc.moveTo(left, 93).lineTo(right, 93).lineWidth(0.5).strokeColor("#c9a86a").stroke();

    /* ── sold by / invoice meta ── */
    let y = 108;
    const halfWidth = width / 2 - 12;

    doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(7.5).text("SOLD BY", left, y);
    doc.fillColor(INK).font("Helvetica-Bold").fontSize(9.5).text(view.seller.name, left, y + 12, { width: halfWidth });
    doc.fillColor(MUTED).font("Helvetica").fontSize(8.2);
    doc.text(view.seller.address, left, y + 26, { width: halfWidth });
    doc.text(`GSTIN: ${view.seller.gstin}`, left, y + 48, { width: halfWidth });
    doc.text(`${view.seller.email}  ·  ${view.seller.phone}`, left, y + 60, { width: halfWidth });

    const metaX = left + width / 2;
    const metaRows: [string, string][] = [
      ["Invoice No.", view.number],
      ["Invoice Date", dateLabel(view.issuedAt)],
      ["Order No.", view.order.orderNumber],
      ["Order Date", dateLabel(view.order.createdAt)],
      ["Place of Supply", view.placeOfSupply],
      ["Payment Mode", view.order.paymentMethod === "cod" ? "Cash on Delivery" : "Prepaid (online)"],
    ];
    metaRows.forEach(([label, value], index) => {
      const rowY = y + index * 13;
      doc.fillColor(MUTED).font("Helvetica").fontSize(8.2).text(label, metaX, rowY, { width: halfWidth * 0.45 });
      doc.fillColor(INK).font("Helvetica-Bold").fontSize(8.2).text(value, metaX, rowY, { width: halfWidth, align: "right" });
    });

    /* ── billing / shipping boxes ── */
    y = 196;
    const boxHeight = 74;
    const box = (x: number, title: string, lines: string[]) => {
      doc.rect(x, y, halfWidth + 6, boxHeight).lineWidth(0.7).strokeColor(LINE).stroke();
      doc.fillColor(SOFT).rect(x, y, halfWidth + 6, 15).fill();
      doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(7.5).text(title, x + 8, y + 4.5, { width: halfWidth - 10 });
      doc.fillColor(INK).font("Helvetica").fontSize(8.2);
      let textY = y + 21;
      for (const line of lines.filter(Boolean).slice(0, 5)) {
        doc.text(line, x + 8, textY, { width: halfWidth - 8, height: 12, ellipsis: true });
        textY += 10.5;
      }
    };

    box(left, "BILLING ADDRESS", [
      view.buyer.name,
      view.buyer.address,
      `${view.buyer.city}, ${view.buyer.state} - ${view.buyer.pincode}`,
      `Phone: ${view.buyer.phone}`,
      view.buyer.email,
    ]);
    box(metaX, "SHIPPING ADDRESS", [
      view.buyer.name,
      view.buyer.address,
      `${view.buyer.city}, ${view.buyer.state} - ${view.buyer.pincode}`,
      `Phone: ${view.buyer.phone}`,
      view.buyer.email,
    ]);

    /* ── item table ── */
    y += boxHeight + 18;

    const cols = {
      index: left + 4,
      item: left + 20,
      hsn: left + width * 0.49,
      qty: left + width * 0.55,
      rate: left + width * 0.6,
      taxable: left + width * 0.715,
      gstRate: left + width * 0.81,
      cgst: left + width * 0.855,
      sgst: left + width * 0.925,
    };
    const itemWidth = width * 0.44;
    const moneyCol = 52;
    const moneyColSmall = 46;
    const taxCol = 34;

    const drawHeader = () => {
      doc.rect(left, y, width, 20).fill(SOFT);
      doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(7);
      doc.text("#", cols.index, y + 6.5, { width: 12, align: "center" });
      doc.text("DESCRIPTION OF GOODS", cols.item, y + 6.5, { width: itemWidth });
      doc.text("HSN", cols.hsn, y + 6.5, { width: 26 });
      doc.text("QTY", cols.qty, y + 6.5, { width: 20, align: "center" });
      doc.text("RATE", cols.rate, y + 6.5, { width: moneyCol, align: "right" });
      doc.text("TAXABLE", cols.taxable, y + 6.5, { width: moneyColSmall, align: "right" });
      doc.text("GST%", cols.gstRate, y + 6.5, { width: 22, align: "right" });
      if (view.interState) {
        doc.text("IGST", cols.cgst, y + 6.5, { width: taxCol + 34, align: "right" });
      } else {
        doc.text("CGST", cols.cgst, y + 6.5, { width: taxCol, align: "right" });
        doc.text("SGST", cols.sgst, y + 6.5, { width: taxCol, align: "right" });
      }
      doc.moveTo(left, y + 20).lineTo(right, y + 20).strokeColor(LINE).stroke();
      y += 20;
    };
    drawHeader();

    const rows: InvoiceLine[] = [...view.lines, ...(view.shippingLine ? [view.shippingLine] : [])];
    rows.forEach((line, index) => {
      const title = `${line.title}${line.size && line.size !== "—" ? ` (Size: ${line.size})` : ""}`;
      const titleHeight = doc.heightOfString(title, { width: itemWidth });
      const rowHeight = Math.max(24, titleHeight + 12);

      if (y + rowHeight > doc.page.height - doc.page.margins.bottom - 150) {
        doc.addPage();
        y = doc.page.margins.top;
        drawHeader();
      }

      doc.fillColor(MUTED).font("Helvetica").fontSize(7.8);
      doc.text(String(index + 1), cols.index, y + 6, { width: 12, align: "center" });
      doc.fillColor(INK).fontSize(8);
      doc.text(title, cols.item, y + 6, { width: itemWidth });
      doc.fillColor(MUTED).text(line.hsn, cols.hsn, y + 6, { width: 26 });
      doc.fillColor(INK).text(String(line.quantity), cols.qty, y + 6, { width: 20, align: "center" });
      doc.text(money(line.unitPrice), cols.rate, y + 6, { width: moneyCol, align: "right" });
      doc.text(money(line.taxable), cols.taxable, y + 6, { width: moneyColSmall, align: "right" });
      doc.fillColor(MUTED).text(`${line.rate}%`, cols.gstRate, y + 6, { width: 22, align: "right" });
      doc.fillColor(INK);
      if (view.interState) {
        doc.text(money(line.igst), cols.cgst, y + 6, { width: taxCol + 34, align: "right" });
      } else {
        doc.text(money(line.cgst), cols.cgst, y + 6, { width: taxCol, align: "right" });
        doc.text(money(line.sgst), cols.sgst, y + 6, { width: taxCol, align: "right" });
      }

      y += rowHeight;
      doc.moveTo(left, y).lineTo(right, y).strokeColor("#efe7de").stroke();
      doc.rect(left, y - rowHeight, width, rowHeight).strokeColor("#f6f0ea").lineWidth(0.4).stroke();
    });

    /* ── tax summary by rate (GST compliance) ── */
    const byRate = new Map<number, { taxable: number; cgst: number; sgst: number; igst: number }>();
    for (const line of rows) {
      const bucket = byRate.get(line.rate) ?? { taxable: 0, cgst: 0, sgst: 0, igst: 0 };
      bucket.taxable += line.taxable;
      bucket.cgst += line.cgst;
      bucket.sgst += line.sgst;
      bucket.igst += line.igst;
      byRate.set(line.rate, bucket);
    }

    y += 14;
    const summaryRight = left + width * 0.58;
    const summaryRows: [string, string][] = [];
    if (view.order.discount > 0) summaryRows.push(["Discount", `- ${money(view.order.discount)}`]);
    summaryRows.push(["Total taxable value", money(view.totals.taxable)]);
    for (const [rate, bucket] of byRate) {
      if (view.interState) {
        summaryRows.push([`IGST @ ${rate}%`, money(bucket.igst)]);
      } else {
        summaryRows.push([`CGST @ ${rate}%`, money(bucket.cgst)]);
        summaryRows.push([`SGST @ ${rate}%`, money(bucket.sgst)]);
      }
    }
    summaryRows.push(["Total tax", money(view.totals.tax)]);

    const summaryLabelWidth = width * 0.26;
    const summaryValueWidth = width * 0.16;
    for (const [label, value] of summaryRows) {
      doc.fillColor(MUTED).font("Helvetica").fontSize(8.2).text(label, summaryRight, y, {
        width: summaryLabelWidth,
        lineBreak: false,
      });
      doc.fillColor(INK).text(value, summaryRight + summaryLabelWidth, y, {
        width: summaryValueWidth,
        align: "right",
        lineBreak: false,
      });
      y += 12;
    }

    y += 3;
    doc.rect(summaryRight, y, width * 0.42, 24).fill(MAROON);
    doc.fillColor("#ffffff").font("Helvetica-Bold").fontSize(9.5).text("INVOICE TOTAL", summaryRight + 8, y + 7, { width: width * 0.24 });
    doc.text(`Rs. ${money(view.order.total)}`, summaryRight, y + 7, { width: width * 0.42 - 8, align: "right" });
    y += 34;

    doc.fillColor(INK).font("Helvetica-Bold").fontSize(8).text("Amount in words: ", left, y, { continued: true });
    doc.font("Helvetica").text(amountInWords(view.order.total), { width });
    y += 20;

    /* ── declaration / signature ── */
    if (y > doc.page.height - doc.page.margins.bottom - 150) {
      doc.addPage();
      y = doc.page.margins.top;
    }
    doc.rect(left, y, width, 0.6).fill(LINE).strokeColor(LINE);
    y += 10;
    doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(7.5).text("DECLARATION", left, y);
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.6).text(
      "We declare that this invoice shows the actual price of the goods described and that all particulars are true and correct. " +
        "Goods are dispatched from our India warehouse. Prices are inclusive of GST. The goods once sold are eligible for 7 days replacement " +
        "only if unused and tags are intact. This is a computer-generated invoice and does not require a physical signature.",
      left,
      y + 11,
      { width: width * 0.64, align: "left" },
    );
    doc.fillColor(INK).font("Helvetica").fontSize(7.6).text(
      "Whether tax payable under reverse charge: No",
      left,
      y + 50,
      { width: width * 0.64 },
    );
    doc.fillColor(MUTED).fontSize(7.4).text(
      `For any query on this invoice, WhatsApp ${view.seller.phone} or write to ${view.seller.email}.`,
      left,
      y + 62,
      { width: width * 0.64 },
    );

    const signX = left + width * 0.7;
    doc.fillColor(MAROON).font("Helvetica-Bold").fontSize(8).text(`For ${view.seller.name.toUpperCase()}`, signX, y + 52, { width: width * 0.3 });
    doc.moveTo(signX, y + 72).lineTo(right, y + 72).strokeColor(LINE).stroke();
    doc.fillColor(MUTED).font("Helvetica").fontSize(7.2).text("Authorised Signatory", signX, y + 76, { width: width * 0.3 });

    /* ── page footers ── */
    const range = doc.bufferedPageRange();
    for (let index = range.start; index < range.start + range.count; index += 1) {
      doc.switchToPage(index);
      // footer ko page-break trigger na karne dein
      doc.page.margins.bottom = 0;
      const footerY = doc.page.height - 30;
      doc.moveTo(left, footerY - 8).lineTo(right, footerY - 8).strokeColor(LINE).lineWidth(0.6).stroke();
      doc.fillColor("#9a8f85").font("Helvetica").fontSize(7).text(
        `${view.number}  ·  ${dateLabel(view.issuedAt)}  ·  ${view.seller.name}  ·  GSTIN ${view.seller.gstin}`,
        left,
        footerY,
        { width: width * 0.75 },
      );
      doc.text(`Page ${index + 1} of ${range.count}`, left, footerY, { width, align: "right" });
    }

    doc.end();
  });
}
