import type { Order } from "@noor/types";
import { siteConfig } from "@/config/site";
import { whatsappNumber } from "@/lib/phone";

/**
 * Order WhatsApp par bhejna — customer "Confirm on WhatsApp" dabata hai,
 * poora order (number, har item ka link + size + qty + price, total, address)
 * pre-filled message ke saath khulta hai. Koi API key nahi, koi 3rd party nahi.
 */

const money = (paise: number) => `Rs. ${(paise / 100).toLocaleString("en-IN")}`;

export const WHATSAPP_NUMBER = "";

/**
 * Site ka apna live URL — WhatsApp message me **hamari** site ka link jaata hai,
 * cloned/purani store ka nahi. Static preview par base path bhi jud jaata hai.
 */
export function currentSiteUrl(): string {
  if (typeof window !== "undefined") {
    const base = process.env.NEXT_PUBLIC_PAGES_BASE_PATH ?? "";
    return `${window.location.origin}${base}`;
  }
  return siteConfig.url;
}

export function productUrl(handle: string): string {
  return `${currentSiteUrl()}/products/${handle}`;
}

/** wa.me link — number me country code zaroori hai (dekho `phone.ts`) */
export function whatsappLink(message: string, phone = WHATSAPP_NUMBER): string {
  return `https://wa.me/${whatsappNumber(phone, WHATSAPP_NUMBER)}?text=${encodeURIComponent(message)}`;
}

export function orderWhatsAppMessage(order: Order, origin = siteConfig.url): string {
  const lines: string[] = [];
  lines.push("*Noor Ethnic Wear — order confirmation*");
  lines.push("");
  lines.push(`Order number: *${order.orderNumber}*`);
  lines.push(`Name: ${order.customerName}`);
  lines.push(`Phone: ${order.phone}`);
  lines.push("");
  lines.push(`*Items (${order.items.length})*`);
  order.items.forEach((item, index) => {
    const link = `${origin}/products/${item.handle}`;
    lines.push(
      `${index + 1}. ${item.title}` +
        `\n   Size: ${item.size}` +
        `\n   Qty: ${item.quantity} × ${money(item.price)} = ${money(item.price * item.quantity)}` +
        `\n   Link: ${link}`,
    );
  });
  lines.push("");
  lines.push(`Subtotal: ${money(order.subtotal)}`);
  if (order.discount > 0) lines.push(`Discount: -${money(order.discount)}`);
  lines.push(`Shipping: ${order.shipping > 0 ? money(order.shipping) : "Free"}`);
  lines.push(`*Total: ${money(order.total)}*`);
  lines.push(`Payment: Prepaid (${order.paymentStatus})`);
  lines.push("");
  lines.push("*Delivery address*");
  lines.push(`${order.address}, ${order.city}, ${order.state} - ${order.pincode}`);
  if (order.notes) {
    lines.push("");
    lines.push(`Note: ${order.notes}`);
  }
  lines.push("");
  lines.push("Please confirm my order on WhatsApp.");
  return lines.join("\n");
}

export function orderWhatsAppLink(order: Order, origin = siteConfig.url): string {
  return whatsappLink(orderWhatsAppMessage(order, origin));
}

/** Cart se seedha WhatsApp par enquiry (order place karne se pehle bhi). */
export function cartWhatsAppMessage(
  lines: { title: string; handle: string; size?: string; colour?: string; quantity: number; price: number }[],
  origin = siteConfig.url,
): string {
  const parts = ["*Noor Ethnic Wear — order enquiry*", ""];
  lines.forEach((line, index) => {
    parts.push(
      `${index + 1}. ${line.title}` +
        `\n   Size: ${line.size ?? "-"}${line.colour ? ` · Colour: ${line.colour}` : ""}` +
        `\n   Qty: ${line.quantity} × ${money(line.price)} = ${money(line.price * line.quantity)}` +
        `\n   Link: ${origin}/products/${line.handle}`,
    );
  });
  const total = lines.reduce((sum, line) => sum + line.price * line.quantity, 0);
  parts.push("", `*Total: ${money(total)}*`, "", "Please confirm availability and payment link.");
  return parts.join("\n");
}
