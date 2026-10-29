"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SizeGuideContent } from "@/components/size-guide-content";
import { SIZE_GUIDE_EVENT } from "@/lib/panels";

/**
 * Size guide — header aur product page se khulne wala slide-over.
 *
 * R47 (owner): "size guide ko open karne par uski saari cheezein check kar lein".
 * R48 (owner): poora Saga-style guide — 3 tabs (Measurements Chart / Find My
 * Size / How to Measure), inches↔cm toggle, XS–XXL chart, bust se size
 * recommendation, unstitched fabric note.
 *
 * Body `SizeGuideContent` me hai — wahi component `/pages/size-guide` page par
 * bhi chalta hai, isliye panel aur page ke numbers/content kabhi alag nahi hote.
 * Data ka source `lib/size-chart.ts` hai.
 */
export function SizeGuideDialog() {
  const [open, setOpen] = useState(false);
  const closeRef = useRef<HTMLButtonElement>(null);

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
        className="motion-panel-right absolute inset-y-0 right-0 flex w-full max-w-[560px] flex-col bg-white shadow-2xl"
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
          <SizeGuideContent variant="panel" onNavigate={close} />
        </div>
      </aside>
    </div>
  );
}
