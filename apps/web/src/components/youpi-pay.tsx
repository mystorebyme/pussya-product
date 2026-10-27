"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { postJson } from "@/lib/http-json";
import { API_AVAILABLE, apiUrl } from "@/lib/api-base";
import { formatPrice } from "@/lib/format";
import { useStoreSettings } from "@/components/store-settings-provider";

/**
 * YouPI PG — browser checkout (R48).
 *
 * Owner: "payment gateway integrate karo — proper repo wala".
 * Integration bilkul YouPI-PG ke apne system (README + `openapi.yaml`, commit
 * `556bd43`) ke hisaab se hai:
 *
 *   1. **Session server se** — `POST /api/v1/payments` (`X-Merchant-Id` +
 *      `Idempotency-Key`) hamare `/api/payments/youpi/create` par hota hai, amount
 *      order se aata hai. Browser ko sirf `checkoutUrl` milta hai.
 *   2. **Official browser SDK** — `youpi.js` (`data-youpi-key`) aur
 *      `window.Youpi.pay({ checkoutUrl, ... })` checkout modal kholta hai.
 *   3. **Authoritative confirmation server par** — browser ka success sirf UI
 *      hai; order tab confirm hota hai jab server gateway se
 *      `GET /api/v1/payments/{paymentId}` karke status + amount verify kare
 *      (`/api/payments/youpi/confirm`) ya HMAC-verified webhook aaye
 *      (`/api/payments/webhook/youpi`).
 *
 * Static GitHub Pages par hamara API nahi hota — tab SDK khud gateway par
 * session banata hai (`apiUrl`/`portalUrl` = gateway origin) aur confirmation
 * server deploy hone par hi possible hai. Isliye gateway button tab tak kuch
 * nahi dikhata jab tak config na ho; purana UPI QR flow hamesha maujood hai.
 */
type YoupiHandlerResult = {
  status?: string;
  order_id?: string;
  orderId?: string;
  paymentId?: string;
  payment_id?: string;
  amount_received?: number | string;
  utr?: string;
  reason?: string;
  raw?: Record<string, unknown>;
};

type YoupiSdk = {
  pay: (options: Record<string, unknown>) => Promise<unknown> | unknown;
};

declare global {
  interface Window {
    Youpi?: YoupiSdk;
  }
}

/** session ke status jo "paisa aa gaya" maane jaate hain (baaki UI me explain) */
const PAID_STATUSES = new Set(["SUCCESS", "RECONCILED", "OBSERVED_SUCCESS"]);

/** script ek hi baar — `data-youpi-key` gateway ka merchant id hai */
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
    script.src = `${payUrl.replace(/\/+$/, "")}/youpi.js`;
    script.async = true;
    script.dataset.noorYoupi = "1";
    script.dataset.youpiKey = merchantId;
    // SDK default apiUrl script ke origin par hota hai — gateway origin explicitly do
    script.dataset.apiUrl = payUrl;
    script.dataset.portalUrl = payUrl;
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

  /** server gateway se verify karke order confirm karta hai (authoritative) */
  const confirmOnServer = useCallback(
    async (paymentId: string) => {
      if (!paymentId) {
        setNote("Payment mil gaya — order confirm hone me thoda waqt lagega. Team WhatsApp par update degi.");
        return false;
      }
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

  /** gateway ke saare result statuses ek hi jagah */
  const handleResult = useCallback(
    (result: YoupiHandlerResult, fallbackPaymentId?: string) => {
      const status = String(result?.status ?? "").toUpperCase();
      const rawPaymentId =
        (result?.raw?.paymentId as string | undefined) ??
        (result?.raw?.payment_id as string | undefined) ??
        result?.paymentId ??
        result?.payment_id ??
        fallbackPaymentId ??
        "";

      if (PAID_STATUSES.has(status)) {
        void confirmOnServer(rawPaymentId);
        return;
      }
      if (status === "MANUAL_REVIEW" || status === "SUSPICIOUS") {
        setNote(
          "Payment security review me gaya hai. Paisa kat gaya ho to WhatsApp par screenshot bhej dein — team verify karke order confirm karegi.",
        );
        return;
      }
      if (status === "EXPIRED") {
        setNote("Payment session expire ho gaya — dobara “Pay securely” dabaiye.");
        return;
      }
      if (status === "CANCELLED") {
        setNote("Payment cancel ho gaya. Dobara try kar sakti hain ya neeche UPI QR se pay kar sakti hain.");
        return;
      }
      if (status === "FAILED") {
        setNote(
          result?.reason
            ? `Payment fail hui (${result.reason}) — dobara try kariye ya neeche UPI QR se pay kariye.`
            : "Payment fail hui — dobara try kariye ya neeche UPI QR se pay kariye.",
        );
      }
    },
    [confirmOnServer],
  );

  async function pay() {
    if (!configured) return;
    setBusy(true);
    setFailed(false);
    setNote(null);

    let paymentId = "";
    try {
      await loadSdk(payUrl, merchantId);
      if (!window.Youpi) throw new Error("youpi-sdk-missing");

      /**
       * Step 1 — server se session (amount order se, browser se nahi).
       * API na ho (GitHub Pages) to SDK khud session banata hai.
       */
      let session: { checkoutUrl?: string; paymentId?: string } | null = null;
      if (API_AVAILABLE) {
        const created = await postJson<{ checkoutUrl?: string; paymentId?: string; alreadyPaid?: boolean }>(
          apiUrl("/api/payments/youpi/create"),
          { orderNumber },
          { timeoutMs: 20_000 },
        );
        if (created.data?.alreadyPaid) {
          setNote("Is order ka payment pehle hi confirm ho chuka hai.");
          onConfirmed?.();
          setBusy(false);
          return;
        }
        if (created.data?.checkoutUrl) {
          session = { checkoutUrl: created.data.checkoutUrl, paymentId: created.data.paymentId };
          paymentId = created.data.paymentId ?? "";
        }
      }

      await window.Youpi.pay({
        key: merchantId,
        order_id: orderNumber,
        orderId: orderNumber,
        amount: (Math.round(amount) / 100).toFixed(2),
        currency: "INR",
        name: "Noor Ethnic Wear",
        description: `Noor Ethnic Wear order ${orderNumber}`,
        // SDK ko gateway origin do — warna wo apne (site ke) origin par API call karega
        apiUrl: payUrl,
        portalUrl: payUrl,
        theme: { color: "#862222" },
        metadata: { orderNumber },
        ...(session?.checkoutUrl ? { checkoutUrl: session.checkoutUrl, paymentId: session.paymentId } : {}),
        handler: (result: YoupiHandlerResult) => handleResult(result, paymentId),
        onClose: () => {
          if (mounted.current) setBusy(false);
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setFailed(true);
      setNote(
        /load nahi hua|sdk-missing/i.test(message)
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
