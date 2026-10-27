"use client";

import Link from "next/link";
import { useEffect } from "react";

/**
 * Order page par server/DB error (Render down, Postgres unreachable) — user ko
 * generic crash ki jagah seedha WhatsApp raasta dikhta hai.
 */
export default function OrderError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.warn("order page error", error.message);
  }, [error]);

  return (
    <div className="container-noor py-16 lg:py-24">
      <div className="mx-auto max-w-[560px] border border-[#e9dfd4] bg-[#faf8f5] p-6 text-center sm:p-9">
        <h1 className="font-display text-[24px] font-medium">Order abhi load nahi ho paya</h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6259]">
          Aapka order safe hai — sirf order service se connection nahi ban paya. Thodi der baad dobara try kariye.
        </p>
        <div className="mt-5 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={reset}
            className="border border-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-[#862222] uppercase"
          >
            Try again
          </button>
          <a
            href="https://wa.me/?text=Hi%2C%20mera%20order%20page%20load%20nahi%20ho%20raha."
            target="_blank"
            rel="noreferrer"
            className="bg-[#25D366] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-white uppercase"
          >
            WhatsApp support
          </a>
        </div>
        <p className="mt-5 text-[11.5px] text-[#8a8078]">
          <Link href="/track-order" className="text-[#862222] underline">
            Track order
          </Link>{" "}
          ya{" "}
          <Link href="/pages/contact" className="text-[#862222] underline">
            contact page
          </Link>{" "}
          se bhi madad le sakte hain.
        </p>
      </div>
    </div>
  );
}
