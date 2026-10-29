"use client";

import Link from "next/link";
import { PaymentStatusWatcher } from "@/components/payment-status-watcher";
import { UpiPayment } from "@/components/upi-payment";
import { formatPrice } from "@/lib/format";
import { paymentUrl } from "@/lib/checkout-session";

/**
 * Checkout ka **step 3 — payment** (owner, R36).
 *
 * Pehle order place hote hi `/orders/<n>/pay` (alag page) khulta tha. Ab payment
 * checkout ke andar hi rehta hai:
 *   1) delivery details → 2) review → 3) **payment (yahin)**
 *
 * Isliye:
 *   • customer ko naya page load nahi dekhna padta, order summary saath rehti hai;
 *   • browser ka **back** review (step 2) par jaata hai (`checkout-form.tsx` history
 *     me review URL rakhta hai);
 *   • wahi order dobara kholne par (`/checkout?step=payment&order=NE-…`) payment
 *     phir se chal jaata hai — amount/UPI/status/token `/api/orders/<n>/payment-context`
 *     se aate hain.
 *
 * UPI app **apne aap nahi khulti** (owner rule): page khulte hi redirect nahi,
 * sirf "Pay on UPI" dabane par intent chalta hai.
 */
export function CheckoutPaymentStep({
  orderNumber,
  total,
  paymentStatus,
  reference,
  upiId,
  upiName,
  whatsapp,
  returnToken,
  last4Hint,
  loading,
  onStatusChange,
  onBackToReview,
}: {
  orderNumber: string;
  total: number;
  paymentStatus: string;
  reference?: string | null;
  upiId: string;
  upiName: string;
  whatsapp: string;
  returnToken?: string | null;
  /** customer ke mobile ke last 4 digit (form/saved details se) — confirm form me prefill */
  last4Hint?: string;
  /** payment context abhi load ho raha hai (amount/UPI sheet se) */
  loading?: boolean;
  onStatusChange: (status: string) => void;
  onBackToReview: () => void;
}) {
  return (
    <section data-testid="checkout-payment">
      <p className="text-[10.5px] tracking-[.18em] text-[#9c8f82] uppercase">Step 3 of 3 — payment</p>
      <h2 className="mt-1 font-display text-[24px] leading-tight font-medium sm:text-[28px]">
        Pay {formatPrice(total)}
      </h2>
      <p className="mt-1.5 text-[12.5px] leading-relaxed text-[#6b6259]">
        Order <strong className="text-[#862222]">{orderNumber}</strong> has been placed. Pay by UPI below —
        the order confirms itself once the money arrives.
      </p>

      <button
        type="button"
        onClick={onBackToReview}
        data-testid="payment-back-review"
        className="mt-3 inline-flex items-center gap-1.5 border border-[#e0d6ca] bg-white px-3 py-2 text-[10.5px] font-semibold tracking-[.12em] text-[#6b6259] uppercase transition-colors hover:border-[#862222] hover:text-[#862222]"
      >
        <span aria-hidden="true">←</span> Review order
      </button>

      <div className="mt-4">
        <PaymentStatusWatcher
          orderNumber={orderNumber}
          initialStatus={paymentStatus}
          onStatusChange={onStatusChange}
        />
      </div>

      {loading ? (
        <p
          className="mt-3 border border-[#eee6de] bg-white px-3 py-2.5 text-[11.5px] text-[#8a8078]"
          data-testid="payment-context-loading"
        >
          Opening payment options…
        </p>
      ) : null}

      <UpiPayment
        orderNumber={orderNumber}
        amount={total}
        upiId={upiId}
        upiName={upiName}
        paymentStatus={paymentStatus}
        reference={reference ?? null}
        whatsapp={whatsapp}
        returnToken={returnToken ?? undefined}
        /** UPI app se wapas isi step 3 par aana hai — order auto-confirm yahin hota hai */
        returnPath={paymentUrl(orderNumber)}
        defaultLast4={last4Hint}
        onConfirmed={() => onStatusChange("paid")}
      />

      <div
        data-testid="order-details-callout"
        className="mt-5 border border-[#862222]/25 bg-[#fdf6f3] px-5 py-4 text-center"
      >
        <p className="text-[12px] font-semibold text-[#862222]">
          The order is confirmed only after the payment is confirmed.
        </p>
        <Link
          href={`/orders/${encodeURIComponent(orderNumber)}`}
          data-testid="order-details-link"
          className="mt-3 inline-flex items-center gap-2 border border-[#862222] bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase transition-colors hover:bg-[#6d1b1b]"
        >
          View order details
          <span aria-hidden="true">→</span>
        </Link>
        <p className="mt-2.5 text-[11px] leading-relaxed text-[#8a8078]">
          After payment you can see tracking, order status and the delivery date{" "}
          <strong className="text-[#862222]">by tapping here</strong>.
        </p>
      </div>
    </section>
  );
}
