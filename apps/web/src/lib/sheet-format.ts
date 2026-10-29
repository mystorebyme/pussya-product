import type { Order } from "@noor/types";

/**
 * Google Sheet row formatting — pure functions (koi network / server-only nahi).
 * Isliye unit tests me seedha import ho sakte hain.
 */

export type SheetSettings = {
  announcement?: string;
  /** Today's Special ribbon (owner, R50) — one short English line, sheet-driven */
  dailySpecial?: string;
  supportPhone?: string;
  supportEmail?: string;
  whatsapp?: string;
  upiId?: string;
  upiName?: string;
  gstin?: string;
  freeShipping?: boolean;
  adminUrl?: string;
  /** R48 — YouPI PG (UPI gateway). Secret sirf server par rehta hai. */
  youpiEnabled?: boolean;
  youpiPayUrl?: string;
  youpiMerchantId?: string;
  youpiMerchantKey?: string;
  youpiWebhookSecret?: string;
};

function text(value: unknown, max = 240): string | undefined {
  if (typeof value !== "string") return undefined;
  const clean = value.replace(/\s+/g, " ").trim();
  return clean ? clean.slice(0, max) : undefined;
}

function truthy(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalised = value.trim().toLowerCase();
    if (["true", "yes", "y", "1", "on", "haan"].includes(normalised)) return true;
    if (["false", "no", "n", "0", "off", "nahi"].includes(normalised)) return false;
  }
  return undefined;
}

/** Apps Script kai shapes bhej sakta hai — sabko ek hi shape me laao */
export function normaliseSheetSettings(payload: unknown): SheetSettings | null {
  if (!payload || typeof payload !== "object") return null;
  const root = payload as Record<string, unknown>;
  if (root.ok === false) return null;
  const source =
    (root.settings as Record<string, unknown> | undefined) ??
    (root.data as Record<string, unknown> | undefined) ??
    root;

  const settings: SheetSettings = {
    announcement: text(source.announcement ?? source.Announcement, 180),
    dailySpecial: text(source.dailySpecial ?? source.daily_special ?? source.special_bar, 120),
    supportPhone: text(source.supportPhone ?? source.support_phone ?? source.phone, 16),
    supportEmail: text(source.supportEmail ?? source.support_email ?? source.email, 120),
    whatsapp: text(source.whatsapp ?? source.whatsapp_number, 16),
    upiId: text(source.upiId ?? source.upi_id ?? source.upi, 80),
    upiName: text(source.upiName ?? source.upi_name ?? source.payee_name, 80),
    gstin: text(source.gstin ?? source.GSTIN, 20),
    freeShipping: truthy(source.freeShipping ?? source.free_shipping),
    adminUrl: text(source.adminUrl ?? source.admin_url ?? source.admin_panel, 200),
    youpiEnabled: truthy(source.youpiEnabled ?? source.youpi_enabled),
    youpiPayUrl: text(source.youpiPayUrl ?? source.youpi_pay_url ?? source.youpi_url, 200),
    youpiMerchantId: text(source.youpiMerchantId ?? source.youpi_merchant_id ?? source.youpi_key, 120),
    youpiMerchantKey: text(
      source.youpiMerchantKey ?? source.youpi_merchant_key ?? source.youpi_secret_key,
      200,
    ),
    youpiWebhookSecret: text(
      source.youpiWebhookSecret ?? source.youpi_webhook_secret ?? source.youpi_secret,
      200,
    ),
  };

  const hasValue = Object.values(settings).some((value) => value !== undefined);
  return hasValue ? settings : null;
}

const inr = (paise: number) => Math.round(paise) / 100;

/**
 * Order ki ek sheet row. Har event (placed / payment submitted / paid / shipped)
 * apni row banata hai — owner ko timeline milti hai, purani row overwrite nahi hoti.
 */
export function orderSheetRow(
  order: Order,
  event: string,
  extra: Record<string, string | number | null> = {},
): Record<string, string | number> {
  const items = order.items.map((item) => `${item.title} (${item.size}) x${item.quantity}`).join(" | ");
  return {
    Timestamp: new Date().toISOString(),
    Event: event,
    "Order number": order.orderNumber,
    "Order status": order.status,
    "Payment status": order.paymentStatus,
    "Payment method": order.paymentMethod,
    "Payment reference": order.payment?.reference ?? "",
    "UPI ID": extra["UPI ID"] ?? "",
    Total: inr(order.total),
    Subtotal: inr(order.subtotal),
    Discount: inr(order.discount),
    Coupon: order.couponCode ?? "",
    Items: order.items.reduce((sum, item) => sum + item.quantity, 0),
    "Item details": items,
    Customer: order.customerName,
    Phone: order.phone,
    Email: order.email,
    Address: order.address,
    City: order.city,
    State: order.state,
    Pincode: order.pincode,
    "Tracking courier": order.tracking?.courier ?? "",
    AWB: order.tracking?.awb ?? "",
    "Tracking URL": order.tracking?.url ?? "",
    Notes: order.notes ?? "",
    ...extra,
  };
}

/**
 * CSV (key,value rows) → SheetSettings.
 *
 * Sheet ke **Settings tab me teesra column (`note`) hai** — pehle parser saare
 * bache hue columns ko value me jod deta tha, isliye live sheet se aisi value
 * aati thi: `9876543211,,"DEMO — apna asli number daaliye"`. Natija: site par
 * phone/UPI kharab dikhta tha (owner ke liye "sheet ki value show nahi ho rahi").
 * Ab sirf **A = key, B = value** padhe jaate hain, baaki columns ignore.
 */
export function parseSettingsCsv(csv: string): SheetSettings | null {
  const rows: Record<string, string> = {};
  for (const line of csv.split(/\r?\n/)) {
    const fields = splitCsvLine(line);
    if (fields.length < 2) continue;
    const key = fields[0].replace(/\s+/g, " ").trim().toLowerCase().replace(/ /g, "_");
    const value = fields[1].trim();
    if (!key || key === "key" || !value) continue;
    rows[key] = value;
  }
  return normaliseSheetSettings(rows);
}

/**
 * Ek CSV line ke fields — quoted field ke andar comma/quote handle karta hai
 * (`"Mon–Sat, 10 AM – 8 PM IST"` jaisi value bhi sahi aati hai).
 */
function splitCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const char = line[index];
    if (quoted) {
      if (char === '"' && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        current += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      fields.push(current);
      current = "";
    } else {
      current += char;
    }
  }
  fields.push(current);
  return fields;
}

/**
 * Checkout funnel ki sheet row ("Checkout" tab).
 * Apps Script header **naam** se column dhoondhta hai — isliye keys yahan aur
 * `scripts/google-apps-script/noor-sheets.gs` ke HEADERS me same hone chahiye
 * (`tests/unit/apps-script.test.ts` isi contract ko check karta hai).
 */
export function checkoutEventSheetRow(event: {
  createdAt: string;
  event: string;
  step?: string | null;
  orderNumber?: string | null;
  itemsCount: number;
  subtotal: number;
  reason?: string | null;
  phone?: string | null;
}): Record<string, string | number> {
  return {
    Timestamp: event.createdAt,
    Event: event.event,
    Step: event.step ?? "",
    "Order number": event.orderNumber ?? "",
    Items: event.itemsCount,
    Subtotal: inr(event.subtotal),
    Reason: event.reason ?? "",
    Phone: event.phone ?? "",
  };
}

/** Contact form ki row ("Messages" tab) */
export function messageSheetRow(message: {
  createdAt: string;
  name: string;
  email: string;
  phone?: string | null;
  subject?: string | null;
  message: string;
  handled?: boolean;
  replied?: boolean;
}): Record<string, string> {
  return {
    Timestamp: message.createdAt,
    Name: message.name,
    Email: message.email,
    Phone: message.phone ?? "",
    Subject: message.subject ?? "",
    Message: message.message,
    Status: message.replied ? "replied" : message.handled ? "handled" : "new",
  };
}

/** Newsletter subscriber ki row ("Newsletter" tab) */
export function subscriberSheetRow(email: string, at = new Date().toISOString()): Record<string, string> {
  return { Timestamp: at, Email: email };
}

/**
 * Order ki har item alag row — owner ko size/colour wise bikri dikhti hai
 * (OrderItems tab). Ek hi order ki saari items ek saath jaati hain.
 */
export function orderItemSheetRows(order: Order): Record<string, string | number>[] {
  return order.items.map((item) => ({
    Timestamp: new Date().toISOString(),
    "Order number": order.orderNumber,
    Product: item.title,
    Handle: item.handle,
    SKU: `${item.handle}-${item.size}`.toUpperCase(),
    Size: item.size,
    Colour: (item as { colour?: string }).colour ?? "",
    Quantity: item.quantity,
    Price: inr(item.price),
    "Line total": inr(item.price * item.quantity),
    Category: (item as { category?: string }).category ?? "",
    "Image URL": item.image ?? "",
    Status: order.status,
  }));
}

/** Shipment row — courier/AWB/tracking update par (Shipments tab) */
export function shipmentSheetRow(
  order: Order,
  status = "updated",
): Record<string, string | number> {
  return {
    Timestamp: new Date().toISOString(),
    "Order number": order.orderNumber,
    Courier: order.tracking?.courier ?? "",
    AWB: order.tracking?.awb ?? "",
    "Tracking URL": order.tracking?.url ?? "",
    Status: order.status || status,
    "Expected delivery": "",
    Note: "",
    "Updated by": (order as { updatedBy?: string }).updatedBy ?? "system",
  };
}

/**
 * GST invoice row (Invoices tab). Amounts **rupees** me jaate hain (sheet me
 * owner ko seedha padhne layak), paise nahi.
 */
export function invoiceSheetRow(
  invoice: {
    number: string;
    issuedAt: string;
    placeOfSupply?: string;
    interState?: boolean;
    buyer?: { name?: string; phone?: string; email?: string; address?: string; state?: string };
    totals: { taxable: number; cgst: number; sgst: number; igst: number };
  },
  order: Order,
  type = "gst",
): Record<string, string | number> {
  const buyer = invoice.buyer ?? {};
  return {
    Timestamp: invoice.issuedAt,
    "Invoice number": invoice.number,
    "Order number": order.orderNumber,
    Type: type,
    Customer: buyer.name ?? order.customerName,
    Phone: buyer.phone ?? order.phone,
    Email: buyer.email ?? order.email ?? "",
    GSTIN: "",
    Address: buyer.address ?? order.address,
    State: buyer.state ?? order.state,
    "Taxable value": inr(invoice.totals.taxable),
    CGST: inr(invoice.totals.cgst),
    SGST: inr(invoice.totals.sgst),
    IGST: inr(invoice.totals.igst),
    Shipping: inr(order.shipping),
    Discount: inr(order.discount),
    Total: inr(order.total),
    Notes: invoice.interState ? "Inter-state (IGST)" : "Intra-state (CGST+SGST)",
  };
}
