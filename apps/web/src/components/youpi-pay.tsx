"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/http-json";
import { apiUrl } from "@/lib/api-base";
import { formatPrice } from "@/lib/format";
import { useStoreSettings } from "@/components/store-settings-provider";

/**
 * YouPI PG — browser checkout (R48).
 *
 * Owner: "YouPI ko uske system ke hisaab se integrate karo".
 * YouPI ka official integration do hisson me hai:
 *
 *   1. **Browser** — `youpi.js` embed (`data-youpi-key` = merchant id) aur
 *      `window.Youpi.pay({...})`. Ye sirf checkout modal kholta hai; UI ke liye.
 *   2. **Server** — authoritative proof: HMAC-signed webhook
 *      (`/api/payments/webhook/youpi`) aur server-to-server
 *      `GET /api/v1/payments/{id}`. Order tabhi confirm hota hai jab server
 *      gateway se status + amount verify kare.
 *
 * Static GitHub Pages par webhook receive nahi ho sakta, isliye callback par
 * `/api/payments/youpi/confirm` call hota hai — wahan bhi **server** gateway se
 * verify karta hai (client ke "success" par bharosa nahi).
 *
 * Config sheet se live aati hai (`youpi_enabled`, `youpi_pay_url`,
 * `youpi_merchant_id`); na mile to component kuch render nahi karta aur seedha
 * UPI QR wala flow chalta rehta hai.
 */
type YoupiHandlerResult = {
  status?: string;
  order_id?: string;
  orderId?: string;
  paymentId?: string;
  payment_id?: string;
  amount_received?: number | string;
  utr?: string;
};

type YoupiSdk = {
  pay: (options: Record<string, unknown>) => Promise<unknown> | unknown;
};

declare global {
  interface Window {
    Youpi?: YoupiSdk;
  }
}

function sdkUrl(payUrl: string): string {
  return `${payUrl.replace(/\/+$/, "")}/youpi.js`;
}

/** script ek hi baar — `data-youpi-key` gateway ke merchant id par set hota hai */
function loadSdk(payUrl: string, merchantId: string): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Youpi) return Promise.resolve();

  const existing = document.querySelector<HTMLScriptElement>("script[data-noor-youpi]");
  if (existing) {
    return new Promise((resolve, reject) => {
      existing.addEventListener("load", () => resolve(), { once: true });
      existing.addEventListener("error", () => reject(new Error("gateway script load nahi hua")), { once: true });
      // already loaded (race) — thoda wait karke check
      window.setTimeout(() => (window.Youpi ? resolve() : undefined), 400);
    });
  }

  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = sdkUrl(payUrl);
    script.async = true;
    script.dataset.noorYoupi = "1";
    script.dataset.youpiKey = merchantId;
    script.dataset.currency = "INR";
    script.dataset.themeColor = "#862222";
    script.dataset.name = "Noor Ethnic Wear";
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("gateway script load nahi hua")), { once: true });
    document.head.appendChild(script);
  });
}

export function YoupiPayButton({
  orderNumber,
  amount,
  onConfirmed,
}: {
  orderNumber: string;
  /** paise me (order total) */
  amount: number;
  onConfirmed?: () => void;
}) {
  const { youpiEnabled, youpiPayUrl, youpiMerchantId } = useStoreSettings();
  const payUrl = (youpiPayUrl ?? "").trim().replace(/\/+$/, "");
  const merchantId = (youpiMerchantId ?? "").trim();
  const configured = youpiEnabled !== false && Boolean(payUrl && merchantId);

  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const mounted = useRef(true);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const confirmOnServer = useCallback(
    async (paymentId: string) => {
      const result = await postJson<{ ok?: boolean; paid?: boolean; alreadyPaid?: boolean; error?: string }>(
        apiUrl("/api/payments/youpi/confirm"),
        { orderNumber, paymentId },
        { timeoutMs: 25_000 },
      );
      if (result.data?.ok) {
        setNote("Payment verified — aapka order confirm ho gaya.");
        onConfirmed?.();
        return true;
      }
      setNote(
        result.data?.error ??
          "Gateway se confirmation abhi nahi aayi — thodi der me apne aap confirm ho jayega. Page refresh kar sakti hain.",
      );
      return false;
    },
    [orderNumber, onConfirmed],
  );

  async function pay() {
    if (!configured) return;
    setBusy(true);
    setFailed(false);
    setNote(null);
    try {
      await loadSdk(payUrl, merchantId);
      if (!window.Youpi) throw new Error("gateway script ne Youpi nahi banaya");

      await window.Youpi.pay({
        key: merchantId,
        order_id: orderNumber,
        orderId: orderNumber,
        amount: (Math.round(amount) / 100).toFixed(2),
        currency: "INR",
        name: "Noor Ethnic Wear",
        description: `Noor Ethnic Wear order ${orderNumber}`,
        apiUrl: payUrl,
        portalUrl: payUrl,
        theme: { color: "#862222" },
        metadata: { orderNumber },
        successUrl: typeof window !== "undefined" ? `${window.location.origin}${window.location.pathname}` : undefined,
        handler: (result: YoupiHandlerResult) => {
          const status = String(result?.status ?? "").toUpperCase();
          const paymentId = String(result?.paymentId ?? result?.payment_id ?? "");
          if (status === "SUCCESS" && paymentId) {
            void confirmOnServer(paymentId);
          } else if (status && status !== "SUCCESS") {
            setNote(`Payment ${status.toLowerCase()} — dobara try kar sakti hain ya UPI se pay kar sakti hain.`);
          }
        },
        onClose: () => {
          if (mounted.current) setBusy(false);
        },
      });
    } catch (error) {
      setFailed(true);
      setNote(
        error instanceof Error && /load nahi hua/.test(error.message)
          ? "Payment gateway abhi khul nahi paaya — neeche UPI QR se pay kar sakti hain."
          : "Payment gateway abhi available nahi hai — neeche UPI QR se pay kar sakti hain.",
      );
      setBusy(false);
    }
  }

  if (!configured) return null;

  return (
    <div className="border-b border-[#ecd9b0] px-4 py-4 sm:px-5" data-testid="youpi-pay">
      <p className="text-[11px] font-semibold tracking-[.14em] text-[#8a6a1f] uppercase">
        Secure UPI checkout
      </p>
      <p className="mt-1 text-[11.5px] leading-relaxed text-[#6b6259]">
        Gateway se pay kariye — UPI app, card ya net banking. Payment verify hote hi order apne aap confirm ho
        jaata hai.
      </p>
      <button
        type="button"
        onClick={pay}
        disabled={busy}
        data-testid="youpi-pay-button"
        className="cta-sheen mt-3 inline-flex h-11 w-full items-center justify-center gap-2 bg-[#862222] px-5 text-[11.5px] font-semibold tracking-[.12em] text-white uppercase transition hover:bg-[#6d1b1b] disabled:opacity-50 sm:w-auto"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden>
          <rect x="4" y="10" width="16" height="10" rx="2" />
          <path d="M8 10V7a4 4 0 0 1 8 0v3" />
        </svg>
        {busy ? "Gateway khul raha hai…" : `Pay ${formatPrice(amount)} securely`}
      </button>
      {note ? (
        <p
          className={`mt-2 text-[11px] leading-relaxed ${failed ? "text-[#8a6a1f]" : "text-[#2f6b3f]"}`}
          data-testid="youpi-note"
          aria-live="polite"
        >
          {note}
        </p>
      ) : null}
      <p className="mt-3 border-t border-dashed border-[#e2cf9f] pt-2 text-[10.5px] tracking-[.1em] text-[#8a7a5f] uppercase">
        Ya neeche diye QR / UPI ID se seedha pay kariye
      </p>
    </div>
  );
}
