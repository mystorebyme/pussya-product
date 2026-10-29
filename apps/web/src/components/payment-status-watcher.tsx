"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { API_AVAILABLE, apiUrl } from "@/lib/api-base";
import { readJson } from "@/lib/http-json";

export type PaymentState = "pending" | "processing" | "paid" | "failed" | string;

const COPY: Record<string, { label: string; note: string; tone: string }> = {
  pending: {
    label: "Payment pending",
    note: "Payment is still pending — pay by UPI, then confirm with the last 4 digits of your mobile number.",
    tone: "border-[#e6d3a8] bg-[#fdf9ee] text-[#8a6a1f]",
  },
  processing: {
    label: "Payment submitted",
    note: "We have your payment confirmation request. Our team verifies it against the UPI statement and confirms the order (usually 10–30 minutes).",
    tone: "border-[#c9d9ea] bg-[#f4f8fd] text-[#2f5d8a]",
  },
  paid: {
    label: "Payment confirmed",
    note: "Payment received — the order is confirmed and ready to dispatch.",
    tone: "border-[#cfe6d4] bg-[#f3faf4] text-[#2f7a3f]",
  },
  failed: {
    label: "Payment failed",
    note: "No money was deducted or the payment failed — try again or let us know on WhatsApp.",
    tone: "border-[#f0c9c5] bg-[#fdf5f4] text-[#a3312a]",
  },
};

/**
 * Payment ka live status. Har 5-6 second me `/api/orders/<num>/payment` poll karta
 * hai aur status badalte hi server component refresh kar deta hai, isliye customer
 * ko page reload nahi karna padta.
 *
 * `onStatusChange` (R36): checkout ka step 3 client-side hai (server prop nahi),
 * isliye wahan parent ko status chahiye — UPI card ko "paid" dikhane ke liye.
 */
export function PaymentStatusWatcher({
  orderNumber,
  initialStatus,
  onStatusChange,
}: {
  orderNumber: string;
  initialStatus: PaymentState;
  onStatusChange?: (status: PaymentState) => void;
}) {
  const [status, setStatus] = useState<PaymentState>(initialStatus);
  const router = useRouter();
  const statusRef = useRef<PaymentState>(initialStatus);

  useEffect(() => {
    if (!API_AVAILABLE) return;
    if (status === "paid") return;
    let cancelled = false;
    let timer: number | undefined;

    const poll = async () => {
      try {
        const response = await fetch(apiUrl(`/api/orders/${encodeURIComponent(orderNumber)}/payment`), {
          cache: "no-store",
        });
        if (!response.ok) return;
        const { data } = await readJson<{ paymentStatus?: PaymentState }>(response);
        const next = data?.paymentStatus;
        if (cancelled || !next) return;
        if (next !== statusRef.current) {
          statusRef.current = next;
          setStatus(next);
          onStatusChange?.(next);
          router.refresh();
        }
        if (next === "paid") return;
      } catch {
        /* offline — agle poll par try */
      }
      // pending → 6s, processing (confirm request mili) → 5s: customer ko jaldi pata chale
      if (!cancelled) timer = window.setTimeout(poll, statusRef.current === "processing" ? 5_000 : 6_000);
    };

    timer = window.setTimeout(poll, 4_000);
    const onVisible = () => {
      if (document.visibilityState === "visible") void poll();
    };
    document.addEventListener("visibilitychange", onVisible);
    // UPI app se desktop par wapas aane par bhi turant check
    window.addEventListener("focus", onVisible);
    return () => {
      cancelled = true;
      if (timer) window.clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onVisible);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderNumber, router, status]);

  const copy = COPY[status] ?? COPY.pending!;

  return (
    <div className={`border px-4 py-3 sm:px-5 ${copy.tone}`} data-testid="payment-state" data-payment-status={status}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-[11px] font-semibold tracking-[.14em] uppercase">{copy.label}</p>
        <span className="text-[10.5px]">Order {orderNumber}</span>
      </div>
      <p className="mt-1 text-[12px] leading-relaxed">{copy.note}</p>
    </div>
  );
}
