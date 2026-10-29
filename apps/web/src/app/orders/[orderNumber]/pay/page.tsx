import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { formatPrice, imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import { getStoreSettingsFast } from "@/lib/store-settings";
import { whatsappNumber } from "@/lib/phone";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Confirm your order", robots: { index: false, follow: false } };

/**
 * Old "complete payment" links (WhatsApp messages, emails, bookmarks) still
 * land here — R50 removed online payment from the site, so this page now hands
 * the order over to WhatsApp instead of showing a UPI screen.
 */
export default async function ConfirmOrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [order, settings] = await Promise.all([getOrder(orderNumber), getStoreSettingsFast()]);
  if (!order) notFound();

  const contactNumber = whatsappNumber(settings.whatsapp || settings.supportPhone);
  const message = [
    `Hi Noor Ethnic Wear, please confirm my order ${order.orderNumber}.`,
    "",
    ...order.items.map(
      (item) => `• ${item.title} — size ${item.size ?? "—"} × ${item.quantity} — ${formatPrice(item.price * item.quantity)}`,
    ),
    "",
    `Total: ${formatPrice(order.total)}`,
    `Name: ${order.customerName}`,
    `Address: ${order.address}, ${order.city}, ${order.state} — ${order.pincode}`,
    "",
    "Please share the payment details here. Thank you!",
  ].join("\n");
  const waHref = contactNumber ? `https://wa.me/${contactNumber}?text=${encodeURIComponent(message)}` : "";

  return (
    <div className="container-noor py-8 lg:py-12">
      <div className="mx-auto max-w-[720px]">
        <nav aria-label="Breadcrumb" className="mb-4 text-[11px] text-[#9c8f82]">
          <Link href="/" className="hover:text-[#862222]">
            Home
          </Link>{" "}
          /{" "}
          <Link href={`/orders/${order.orderNumber}`} className="hover:text-[#862222]">
            Order {order.orderNumber}
          </Link>{" "}
          / <span className="text-[#5c534b]">Confirm on WhatsApp</span>
        </nav>

        <div className="border border-[#e6d3a8] bg-[#fdf9ee] p-5 sm:p-7">
          <p className="text-[10.5px] tracking-[.18em] text-[#9c8f82] uppercase">One last step</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight font-medium sm:text-[32px]">
            Confirm order {order.orderNumber} on WhatsApp
          </h1>
          <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6259]">
            We do not take online payments on this site. Press the button below — WhatsApp opens with your whole order already
            written — and our team replies with the payment details and confirms your order.
          </p>

          <div className="mt-4 grid gap-3 border-y border-[#eee6de] py-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Order number</p>
              <p className="mt-0.5 font-display text-[17px] text-[#862222]" data-testid="pay-order-number">
                {order.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Order total</p>
              <p className="mt-0.5 font-display text-[17px]" data-testid="pay-amount">
                {formatPrice(order.total)}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Items</p>
              <p className="mt-0.5 text-[12.5px] text-[#4a423b]">
                {order.items.length} {order.items.length === 1 ? "item" : "items"}
              </p>
            </div>
          </div>

          <ul className="mt-4 divide-y divide-[#f0eae3]">
            {order.items.map((item) => (
              <li key={`${item.handle}-${item.size ?? ""}`} className="flex gap-3 py-3">
                <div className="relative h-16 w-12 shrink-0 overflow-hidden bg-white">
                  {item.image ? (
                    <SafeImage src={imageUrl(item.image, 160)} alt={item.title} sizes="48px" className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12.5px] leading-snug text-[#2f2a25]">{item.title}</p>
                  <p className="text-[11px] text-[#8a8078]">Size {item.size ?? "—"} · Qty {item.quantity}</p>
                </div>
                <p className="text-[12.5px]">{formatPrice(item.price * item.quantity)}</p>
              </li>
            ))}
          </ul>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            {waHref ? (
              <a
                href={waHref}
                target="_blank"
                rel="noopener noreferrer"
                data-testid="confirm-whatsapp"
                className="wa-cta flex flex-1 items-center justify-center gap-2 bg-[#128c4b] px-6 py-3 text-[11.5px] font-semibold tracking-[.14em] text-white uppercase"
              >
                Send order on WhatsApp
              </a>
            ) : null}
            <Link
              href={`/orders/${order.orderNumber}`}
              className="flex flex-1 items-center justify-center border border-[#862222] px-6 py-3 text-[11.5px] font-semibold tracking-[.14em] text-[#862222] uppercase"
            >
              View order
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
