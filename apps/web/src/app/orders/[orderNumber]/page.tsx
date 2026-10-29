import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getOrder } from "@/lib/orders";
import { mergeSheetTracking, readSheetTracking } from "@/lib/sheet-tracking";
import { formatDate, formatPrice, imageUrl } from "@/lib/format";
import { ORDER_STATUS_COPY, siteConfig } from "@/config/site";
import { SafeImage } from "@/components/safe-image";
import { orderWhatsAppLink } from "@/lib/whatsapp";
import { getStoreSettingsFast } from "@/lib/store-settings";
import {
  estimatedDelivery,
  orderTrackingUrl,
  statusLabel,
  trackingSteps,
  trackingTimeLabel,
  trackingUpdates,
} from "@/lib/tracking";
import { customerFeatures } from "@/lib/features";

export const dynamic = "force-dynamic";
/**
 * Title order ke asli haal ke hisaab se — pehle har page "Order confirmed" kehta tha,
 * chahe order mila hi na ho ya payment pending ho (browser tab + share preview galat).
 */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ orderNumber: string }>;
}): Promise<Metadata> {
  const { orderNumber } = await params;
  const order = await getOrder(orderNumber);
  if (!order) return { title: "Order not found", robots: { index: false } };
  const title =
    order.paymentStatus === "paid"
      ? "Order confirmed"
      : order.paymentStatus === "processing"
        ? "Verifying payment"
        : order.paymentStatus === "failed"
          ? "Payment failed"
          : order.paymentStatus === "refunded"
            ? "Refunded"
            : "Payment pending";
  return { title, robots: { index: false } };
}

export default async function OrderPage({ params }: { params: Promise<{ orderNumber: string }> }) {
  const { orderNumber } = await params;
  const [dbOrder, settings, headerList] = await Promise.all([
    getOrder(orderNumber),
    getStoreSettingsFast(),
    headers(),
  ]);
  const fallbackHost = new URL(siteConfig.url).host;
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host") ?? fallbackHost;
  const proto = headerList.get("x-forwarded-proto") ?? "https";
  const siteUrl = `${proto}://${host}`;
  if (!dbOrder) notFound();
  /**
   * R37 (owner): sheet = order ka DB. `Orders` tab me `Order status` / courier /
   * AWB badalte hi yahan wahi dikhta hai (5s TTL + background refresh;
   * `?fresh=1` par bilkul taaza). Payment status hamesha DB se.
   */
  const sheet = dbOrder
    ? await readSheetTracking(dbOrder.orderNumber, dbOrder.phone, {
        fresh: typeof window === "undefined" && Boolean(process.env.SHEET_TRACKING_FRESH),
      })
    : null;
  const order = dbOrder ? mergeSheetTracking(dbOrder, sheet) : dbOrder;

  const etaLabel = estimatedDelivery(order.createdAt);
  /** 5 step + har step ki asli date + cancelled/returned handle (lib/tracking.ts) */
  const { steps, stopped } = trackingSteps(order);
  const updates = trackingUpdates(order);
  /**
   * R39 (owner): note-box ka text **sheet se** — Orders tab ke `Admin Note`
   * column me jo likha hai (2s me live), warna admin ka DB note, warna default
   * "Waiting for confirmation". Static AWB waada hata diya: owner jo likhe wahi
   * dikhega, har order ke liye alag.
   */
  const noteText = (order.statusNote?.text ?? "").trim();
  /** admin ne URL na diya ho to courier + AWB se link khud ban jaata hai */
  const courierUrl = orderTrackingUrl(order);

  return (
    <div className="container-noor py-10 lg:py-14">
      <div className="mx-auto max-w-[860px]">
        <div className="border border-[#e9dfd4] bg-[#faf8f5] p-6 text-center sm:p-9">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#e6f2e8] text-[#2f7a3f]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="m5 13 4 4L19 7" />
            </svg>
          </span>
          <h1 className="mt-4 font-display text-[27px] font-medium sm:text-[32px]">
            Thank you, {order.customerName.split(" ")[0]}!
          </h1>
          <p className="mt-1.5 text-[12.5px] text-[#6b6259]">
            {order.paymentMethod === "cod"
              ? "Your order is confirmed. Please pay the amount on delivery."
              : order.paymentStatus === "paid"
                ? "Payment received — thank you! Your order is confirmed and being prepared for dispatch."
                : order.paymentStatus === "processing"
                  ? "We have your payment reference and are verifying it. You will get an update as soon as it clears."
                  : "Your order is saved. Send it once on WhatsApp so our team can confirm it and share the payment details."}
          </p>
          <a
            href={orderWhatsAppLink(order, siteUrl)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="confirm-whatsapp"
            className="mt-4 inline-flex items-center gap-2 bg-[#25D366] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase transition hover:bg-[#1eb457]"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
              <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a11.6 11.6 0 0 1-5.9-5.2c-.4-.7-.6-1.4-.6-2 0-.6.3-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3-.1.5a7.5 7.5 0 0 0 3.3 2.9c.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .2 0 .9-.2 1.4Z" />
            </svg>
            Confirm order on WhatsApp
          </a>
          <p className="mt-1.5 text-[11px] text-[#8a8078]">
            This button sends your order number, every item with size and quantity, and the total on WhatsApp.
          </p>

          <div className="mt-4 inline-flex flex-wrap items-center justify-center gap-x-6 gap-y-2 border-t border-[#e9dfd4] pt-4 text-[12px]">
            <span>
              Order:{" "}
              <strong data-testid="order-number" className="text-[#862222]">
                {order.orderNumber}
              </strong>
            </span>
            <span>Estimated delivery: <strong>{etaLabel}</strong></span>
            <span>Placed: <strong>{formatDate(order.createdAt)}</strong></span>
          </div>
        </div>

        {/* R50: no online payment on the site — the order is confirmed in WhatsApp chat */}
        <div className="mt-4 flex flex-wrap items-center gap-3 border border-[#e6d3a8] bg-[#fdf9ee] px-4 py-3" data-testid="order-whatsapp-block">
          <a
            href={orderWhatsAppLink(order, siteUrl)}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="complete-payment"
            className="wa-cta bg-[#128c4b] px-5 py-2.5 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
          >
            {order.paymentStatus === "paid" ? "Message us on WhatsApp" : "Confirm on WhatsApp"}
          </a>
          <p className="text-[11.5px] text-[#6b6259]">
            {formatPrice(order.total)} · We confirm every order in chat and share the payment details there.
          </p>
        </div>

        <div className="mt-4 border border-[#eee6de] p-5" data-testid="order-tracking">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[11px] font-semibold tracking-[.16em] uppercase">Order tracking</h2>
            <span className="text-[11px] text-[#8a8078]">
              Status: <strong className="text-[#862222]" data-testid="tracking-status">{statusLabel(order.status)}</strong>
            </span>
          </div>

          {stopped ? (
            <p
              className="mt-3 border border-[#e7c9c4] bg-[#fdf2f0] px-4 py-3 text-[12.5px] leading-relaxed text-[#8c2f22]"
              data-testid="tracking-stopped"
            >
              {stopped === "cancelled"
                ? "This order was cancelled. If money was deducted, the refund reaches you in 5–7 working days — message us on WhatsApp for anything else."
                : "This order was returned. Message us on WhatsApp for a replacement and our team will take it forward."}
            </p>
          ) : (
            <ol className="mt-4 grid grid-cols-5 gap-1.5 text-center">
              {steps.map((step, index) => (
                <li key={step.step} className="flex flex-col items-center gap-1.5">
                  <span
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-[10px] font-semibold ${
                      step.done ? "bg-[#862222] text-white" : "bg-[#efe7dd] text-[#a49a90]"
                    }`}
                  >
                    {step.done ? "✓" : index + 1}
                  </span>
                  <span className="text-[10px] tracking-[.08em] uppercase text-[#6b6259]">{step.label}</span>
                  {step.at ? (
                    <span className="text-[9.5px] text-[#a49a90]">{trackingTimeLabel(step.at)}</span>
                  ) : null}
                </li>
              ))}
            </ol>
          )}

          {updates.length ? (
            <ul className="mt-4 space-y-2 border-t border-[#f1ebe5] pt-3" data-testid="tracking-updates">
              {updates.map((update) => (
                <li
                  key={`${update.at}-${update.kind}-${update.text ?? ""}`}
                  data-testid={update.kind === "note" ? "order-note" : "order-update"}
                  className="text-[12px] text-[#4a423b]"
                >
                  <span className="text-[10px] font-semibold tracking-[.1em] text-[#9c8f82] uppercase">
                    {update.label} · {trackingTimeLabel(update.at)}
                  </span>
                  {update.text ? <span className="mt-0.5 block leading-relaxed">{update.text}</span> : null}
                </li>
              ))}
            </ul>
          ) : null}

          {order.tracking?.awb ? (
            <div className="mt-4 border-t border-[#f1ebe5] pt-3 text-[12.5px] text-[#5c534b]">
              <p>
                Courier: <strong data-testid="tracking-courier">{order.tracking.courier ?? "—"}</strong>
                <br />
                AWB / Tracking no: <strong data-testid="tracking-awb">{order.tracking.awb}</strong>
                {order.tracking.shippedAt ? (
                  <>
                    <br />
                    Shipped: {trackingTimeLabel(order.tracking.shippedAt)}
                  </>
                ) : null}
              </p>
              {courierUrl ? (
                <a
                  href={courierUrl}
                  target="_blank"
                  rel="noreferrer"
                  data-testid="track-courier"
                  className="mt-2 inline-block border border-[#862222] px-4 py-2 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase"
                >
                  Track with courier
                </a>
              ) : (
                <p className="mt-1.5 text-[11px] text-[#8a8078]">
                  Use this AWB number on the courier website to track the parcel.
                </p>
              )}
              {noteText ? (
                <p data-testid="order-note-box" className="mt-2 text-[11.5px] text-[#5c534b]">
                  {noteText}
                </p>
              ) : null}
            </div>
          ) : (
            <p data-testid="order-note-box" className="mt-3 border-t border-[#f1ebe5] pt-3 text-[11.5px] text-[#8a8078]">
              {noteText || "Waiting for confirmation"}
            </p>
          )}
        </div>

        {/*
          Invoice download abhi customer ke liye band hai (owner, R32):
          "sirf tracking chahiye". Block hi render nahi hota, isliye kahin
          aadha-adhoora invoice text nahi bachta. Chalu karna ho to
          `apps/web/src/lib/features.ts` me `invoice: true` kar dein.
        */}
        {customerFeatures.invoice ? (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border border-[#eee6de] p-5">
          <div>
            <h2 className="text-[11px] font-semibold tracking-[.16em] uppercase">GST invoice</h2>
            <p className="mt-1 text-[11.5px] text-[#6b6259]">
              Download the tax invoice (GST 5% / 18% based on product value) — you will be asked for the last
              4 digits of the order phone number.
            </p>
          </div>
          <Link
            href={`/orders/${order.orderNumber}/invoice`}
            data-testid="download-invoice"
            className="border border-[#862222] px-5 py-2.5 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase"
          >
            Download invoice
          </Link>
        </div>
        ) : null}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="border border-[#eee6de] p-5">
            <h2 className="text-[11px] font-semibold tracking-[.16em] uppercase">Delivery address</h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#5c534b]">
              {order.customerName}
              <br />
              {order.address}
              <br />
              {order.city}, {order.state} — {order.pincode}
              <br />
              +91 {maskPhone(order.phone)}
              <br />
              {maskEmail(order.email)}
            </p>
          </div>
          <div className="border border-[#eee6de] p-5">
            <h2 className="text-[11px] font-semibold tracking-[.16em] uppercase">Payment</h2>
            <p className="mt-2 text-[12.5px] text-[#5c534b]">
              Method: <strong>{order.paymentMethod === "cod" ? "Cash on delivery" : "Prepaid (UPI / card)"}</strong>
              <br />
              Status: <strong data-testid="payment-status">{order.paymentStatus}</strong>
              {order.paymentStatus === "paid" && order.payment?.verifiedAt ? (
                <>
                  <br />
                  Verified by our team: <strong>{formatDate(order.payment.verifiedAt)}</strong>
                  {order.payment.reference ? (
                    <>
                      <br />
                      Reference: <strong>{order.payment.reference}</strong>
                    </>
                  ) : null}
                </>
              ) : null}
              <br />
              Items: <strong>{order.items.reduce((sum, item) => sum + item.quantity, 0)}</strong>
            </p>
            <div className="mt-3 space-y-1.5 border-t border-[#f0eae3] pt-3 text-[12.5px]">
              <Row label="Subtotal" value={formatPrice(order.subtotal)} />
              {order.discount > 0 ? (
                <Row label={`Coupon ${order.couponCode ?? ""}`} value={`− ${formatPrice(order.discount)}`} />
              ) : null}
              <Row label="Shipping" value="Free" />
              <Row label="Total" value={formatPrice(order.total)} strong />
            </div>
          </div>
        </div>

        <div className="mt-4 border border-[#eee6de]">
          <h2 className="border-b border-[#eee6de] px-5 py-3 text-[11px] font-semibold tracking-[.16em] uppercase">
            Items
          </h2>
          <ul className="divide-y divide-[#f1ebe5]">
            {order.items.map((item) => (
              <li key={`${item.handle}-${item.size}`} className="flex gap-3 p-4">
                <SafeImage
                  src={imageUrl(item.image, 200)}
                  alt={item.title}
                  className="h-24 w-20 shrink-0 object-cover"
                />
                <div className="flex-1">
                  <Link href={`/products/${item.handle}`} className="text-[12.5px] font-medium hover:text-[#862222]">
                    {item.title}
                  </Link>
                  <p className="mt-1 text-[11px] text-[#8a8078]">
                    Size {item.size} · Qty {item.quantity}
                  </p>
                </div>
                <span className="text-[12.5px] font-semibold text-[#862222]">
                  {formatPrice(item.price * item.quantity)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/collections/new-arrivals"
            className="bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
          >
            Continue shopping
          </Link>
          <a
            href={orderWhatsAppLink(order, siteUrl)}
            target="_blank"
            rel="noopener noreferrer"
            className="border border-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase"
          >
            Send order on WhatsApp
          </a>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, strong = false }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className={`flex justify-between ${strong ? "font-semibold" : ""}`}>
      <span className="text-[#6b6259]">{label}</span>
      <span>{value}</span>
    </div>
  );
}

/** Tracking page link-only hota hai — phone/email mask rehte hain (PII leak nahi) */
function maskPhone(phone: string): string {
  const digits = String(phone ?? "").replace(/\D/g, "");
  if (digits.length < 4) return "••••";
  return `${"•".repeat(Math.max(0, digits.length - 4))}${digits.slice(-4)}`;
}

function maskEmail(email: string): string {
  const [user, domain] = String(email ?? "").split("@");
  if (!user || !domain) return "••••";
  return `${user.slice(0, 2)}${"•".repeat(Math.max(1, user.length - 2))}@${domain}`;
}
