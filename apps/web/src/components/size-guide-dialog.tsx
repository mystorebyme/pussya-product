"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FIT_TIPS, MEASURE_STEPS } from "@/lib/size-chart";
import { SizeChartTable } from "@/components/size-chart-table";
import { SIZE_GUIDE_EVENT } from "@/lib/panels";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

/**
 * Size guide — header aur product page se khulne wala slide-over.
 *
 * R47 (owner): "size guide ko open karne par uski saari cheezein check kar lein".
 * Isliye panel me sab kuch hai — inches/cm toggle, poori chart, naapne ka tareeqa,
 * fit tips aur WhatsApp help. Data `lib/size-chart.ts` se aata hai (ek hi source),
 * wahi data `/pages/size-guide` page bhi use karta hai.
 */
export function SizeGuideDialog() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);
  const { whatsapp, supportPhone } = useStoreSettings();
  const contactNumber = (whatsapp || supportPhone).replace(/\D/g, "").slice(-10);

  useEffect(() => {
    const handler = () => setOpen(true);
    window.addEventListener(SIZE_GUIDE_EVENT, handler);
    return () => window.removeEventListener(SIZE_GUIDE_EVENT, handler);
  }, []);

  const close = useCallback(() => setOpen(false), []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") close();
    };
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [open, close]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[60]" data-testid="size-guide-dialog">
      <button
        type="button"
        aria-label="Close size guide"
        onClick={close}
        className="motion-backdrop absolute inset-0 bg-black/45"
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby="size-guide-title"
        className="motion-panel-right absolute inset-y-0 right-0 flex w-full max-w-[540px] flex-col bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-[#eee6de] px-5 py-4">
          <div>
            <p className="text-[9.5px] tracking-[.3em] text-[#a67c2e] uppercase">Find your fit</p>
            <h2 id="size-guide-title" className="font-display text-[24px] leading-tight text-[#862222]">
              Size guide
            </h2>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={close}
            aria-label="Close"
            className="rounded-full p-2 text-[#5c534b] transition hover:bg-[#f6f1ec] hover:text-[#862222]"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M5 5l14 14M19 5 5 19" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <p className="text-[12.5px] leading-relaxed text-[#5c534b]">
            Most of our suits are ready-to-wear. Apne body measurements chart se compare karein — confusion ho
            to size up karein ya WhatsApp par bust, waist aur height bhej dein.
          </p>

          <div className="mt-4">
            <SizeChartTable compact />
          </div>

          <h3 className="mt-6 text-[11px] font-semibold tracking-[.16em] text-[#2f2a25] uppercase">
            How to measure
          </h3>
          <ol className="mt-3 space-y-3">
            {MEASURE_STEPS.map((step, index) => (
              <li key={step.title} className="flex gap-3">
                <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[#f4ece2] text-[11px] font-semibold text-[#862222]">
                  {index + 1}
                </span>
                <div>
                  <p className="text-[12.5px] font-medium text-[#2f2a25]">{step.title}</p>
                  <p className="mt-0.5 text-[12px] leading-relaxed text-[#5c534b]">{step.body}</p>
                  <p className="mt-1 text-[11px] leading-relaxed text-[#9c8f82]">{step.tip}</p>
                </div>
              </li>
            ))}
          </ol>

          <h3 className="mt-6 text-[11px] font-semibold tracking-[.16em] text-[#2f2a25] uppercase">Fit tips</h3>
          <ul className="mt-2 space-y-1.5">
            {FIT_TIPS.map((tip) => (
              <li key={tip} className="flex gap-2 text-[12px] leading-relaxed text-[#5c534b]">
                <span aria-hidden className="mt-[7px] h-1 w-1 shrink-0 rounded-full bg-[#a67c2e]" />
                {tip}
              </li>
            ))}
          </ul>

          <div className="mt-6 rounded-lg border border-[#eadfce] bg-[#faf6f1] p-4">
            <p className="text-[12px] leading-relaxed text-[#5c534b]">
              Still unsure? Apna bust, waist aur height bhej dein — hum sahi size bata denge.
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {contactNumber ? (
                <a
                  href={`https://wa.me/${whatsappNumber(contactNumber)}?text=${encodeURIComponent(
                    "Hi Noor Ethnic Wear, please help me pick the right size.",
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-10 items-center bg-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase transition hover:bg-[#6d1b1b]"
                >
                  Ask on WhatsApp
                </a>
              ) : null}
              <Link
                href="/pages/size-guide"
                onClick={close}
                className="inline-flex h-10 items-center border border-[#862222] px-5 text-[10.5px] font-semibold tracking-[.14em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
              >
                Full size guide
              </Link>
            </div>
          </div>
        </div>
      </aside>
    </div>
  );
}
