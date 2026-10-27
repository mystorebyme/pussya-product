import Link from "next/link";
import type { Metadata } from "next";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { getOrder } from "@/lib/orders";
import { formatPrice, imageUrl } from "@/lib/format";
import { siteConfig } from "@/config/site";
import { SafeImage } from "@/components/safe-image";
import { getStoreSettingsFast } from "@/lib/store-settings";
import { UpiPayment } from "@/components/upi-payment";
import { signUpiReturn } from "@/lib/upi-return";
import { PaymentStatusWatcher } from "@/components/payment-status-watcher";
import { reviewUrl } from "@/lib/checkout-session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Complete payment", robots: { index: false, follow: false } };

/**
 * Payment page — deep links (WhatsApp/email/QR) ke liye. Checkout me payment ab
 * **step 3** par usi page ke andar hota hai (`/checkout?step=payment&order=NE-…`);
 * ye route wahi `UpiPayment` render karta hai, isliye dono jagah ek jaisa flow hai.
 *
 * Flow (owner rule):
 *   checkout → "Place order" (validation + stock + pincode sab server par) →
 *   order DB me `pending` + unique order number (`NE-…`) →
 *   yahan redirect → UPI se pay → last-4 digit confirm (`processing`) →
 *   admin/UPI-return verify (`paid`) → order `confirmed`.
 *
 * Is page par order number, poora amount, items aur live payment status dikhta
 * hai. Paisa confirm hone se pehle order confirmed nahi hota.
 */
export default async function PaymentPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  /**
   * Speed: order (single row) aur settings **saath** padhe jaate hain — pehle
   * serial the, isliye step 3 khulne me 2-3 second extra lagta tha.
   */
  const [order, settings, headerList] = await Promise.all([
    getOrder(orderNumber),
    getStoreSettingsFast(),
    headers(),
  ]);
  if (!order) notFound();

  // already paid → seedha order page (dobara pay karne ka koi matlab nahi)
  if (order.paymentStatus === "paid") redirect(`/orders/${order.orderNumber}`);

  const fallbackHost = new URL(siteConfig.url).host;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? fallbackHost;
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const siteUrl = `${proto}://${host}`;

  return (
    <div className="container-noor py-8 lg:py-12">
      <div className="mx-auto max-w-[760px]">
        <nav aria-label="Breadcrumb" className="mb-4 text-[11px] text-[#9c8f82]">
          <Link href="/" className="hover:text-[#862222]">
            Home
          </Link>{" "}
          /{" "}
          <Link href={`/orders/${order.orderNumber}`} className="hover:text-[#862222]">
            Order {order.orderNumber}
          </Link>{" "}
          / <span className="text-[#5c534b]">Payment</span>
        </nav>

        {/*
          Owner rule (R33): payment se **back** karne par customer review (step 2)
          par jaaye — address form dobara nahi. Review me order ki items + address
          snapshot se dikhte hain (cart already khali ho chuka hota hai).
        */}
        <Link
          href={reviewUrl(order.orderNumber)}
          data-testid="back-to-review"
          className="mb-3 inline-flex items-center gap-1.5 border border-[#e0d6ca] bg-white px-3 py-2 text-[10.5px] font-semibold tracking-[.12em] text-[#6b6259] uppercase transition-colors hover:border-[#862222] hover:text-[#862222]"
        >
          <span aria-hidden="true">←</span> Review order
        </Link>

        <div className="border border-[#e9dfd4] bg-white p-5 sm:p-7">
          <p className="text-[10.5px] tracking-[.18em] text-[#9c8f82] uppercase">Step 3 of 3 — payment</p>
          <h1 className="mt-1 font-display text-[26px] leading-tight font-medium sm:text-[32px]">
            Pay {formatPrice(order.total)}
          </h1>
          <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6259]">
            Order place ho gaya hai. Neeche UPI se payment kariye — paisa milne par order khud confirm ho jayega
            aur tracking shuru hogi.
          </p>

          <div className="mt-4 grid gap-3 border-y border-[#eee6de] py-4 sm:grid-cols-3">
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Order number</p>
              <p className="mt-0.5 font-display text-[17px] text-[#862222]" data-testid="pay-order-number">
                {order.orderNumber}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Amount to pay</p>
              <p className="mt-0.5 font-display text-[17px]" data-testid="pay-amount">
                {formatPrice(order.total)}
              </p>
            </div>
            <div>
              <p className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Items</p>
              <p className="mt-0.5 text-[12.5px] text-[#4a423b]">
                {order.items.length} {order.items.length === 1 ? "item" : "items"} · prepaid only
              </p>
            </div>
          </div>

          <div className="mt-4">
            <PaymentStatusWatcher orderNumber={order.orderNumber} initialStatus={order.paymentStatus} />
          </div>

          <UpiPayment
            orderNumber={order.orderNumber}
            amount={order.total}
            upiId={settings.upiId}
            upiName={settings.upiName}
            paymentStatus={order.paymentStatus}
            reference={order.payment?.reference ?? null}
            whatsapp={settings.whatsapp}
            returnToken={signUpiReturn(order.orderNumber)}
            siteUrl={siteUrl}
            /**
             * UPI app se wapas **isi page** par aana hai — pehle callback
             * `/orders/<n>` par jaata tha jahan ye component render hi nahi hota,
             * isliye `upi=return` koi nahi padhta tha (auto-confirm bekaar).
             */
            returnPath={`/orders/${encodeURIComponent(order.orderNumber)}/pay`}
            /** mobile ke last 4 digit pehle se — confirm ek tap me (owner, R36) */
            defaultLast4={order.phone.replace(/\D/g, "").slice(-4)}
          />

          <div className="mt-6 border-t border-[#eee6de] pt-4">
            <h2 className="text-[11px] font-semibold tracking-[.14em] uppercase">Aapka order</h2>
            <ul className="mt-3 space-y-2.5">
              {order.items.map((item) => (
                <li key={`${item.handle}-${item.size}`} className="flex items-center gap-3">
                  <span className="h-14 w-11 shrink-0 overflow-hidden bg-[#f4efe9]">
                    <SafeImage
                      src={imageUrl(item.image, 160)}
                      alt={item.title}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[12.5px] text-[#2f2a25]">{item.title}</span>
                    <span className="block text-[11px] text-[#8a8078]">
                      Size {item.size} · Qty {item.quantity}
                    </span>
                  </span>
                  <span className="text-[12.5px] text-[#4a423b]">{formatPrice(item.price * item.quantity)}</span>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex items-center justify-between border-t border-[#f0e9e1] pt-3 text-[13px]">
              <span className="text-[#6b6259]">Total payable</span>
              <strong className="text-[15px] text-[#862222]">{formatPrice(order.total)}</strong>
            </div>
            <p className="mt-2 text-[11px] leading-relaxed text-[#8a8078]">
              Deliver to {order.customerName}, {order.city} {order.pincode} · {order.phone.replace(/\d(?=\d{2})/g, "•")}
            </p>
          </div>
        </div>

        {/*
          Owner (R32): yahi wo link hai jahan se customer aage badhta hai, isliye
          ise highlight kiya gaya hai — pehle chhota grey text tha, customer
          miss kar deta tha. Button + neeche ek line "yahin click kariye".
        */}
        <div
          data-testid="order-details-callout"
          className="mt-5 border border-[#862222]/25 bg-[#fdf6f3] px-5 py-4 text-center"
        >
          <p className="text-[12px] font-semibold text-[#862222]">
            Payment confirm hone ke baad hi order confirm hota hai.
          </p>
          <Link
            href={`/orders/${order.orderNumber}`}
            data-testid="order-details-link"
            className="mt-3 inline-flex items-center gap-2 border border-[#862222] bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase transition-colors hover:bg-[#6d1b1b]"
          >
            Order details dekhein
            <span aria-hidden="true">→</span>
          </Link>
          <p className="mt-2.5 text-[11px] leading-relaxed text-[#8a8078]">
            Payment ke baad aage badhne ke liye <strong className="text-[#862222]">yahin click kariye</strong> —
            tracking, order status aur delivery date isi page par milegi.
          </p>
        </div>
      </div>
    </div>
  );
}
