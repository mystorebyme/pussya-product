"use client";

import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

/**
 * Contact details — owner ki Google Sheet / admin settings se (real time).
 * Sheet me number badla -> site par bhi badal jaata hai, redeploy nahi.
 */
export function ContactDetails() {
  const { whatsapp } = useStoreSettings();
  const wa = whatsapp.replace(/\D/g, "").slice(-10);

  return (
    <div className="grid gap-3 sm:grid-cols-3" data-testid="contact-details">
      <a
        href={`https://wa.me/${whatsappNumber(wa)}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-1 border border-[#eee6de] bg-white p-4 transition hover:border-[#862222]"
      >
        <span className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">WhatsApp</span>
        <span className="text-[14px] font-medium break-words text-[#862222]">{whatsapp}</span>
      </a>
      <a
        href={`https://wa.me/${whatsappNumber(wa)}?text=${encodeURIComponent("Hi Noor Ethnic Wear, I need help choosing a size.")}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-1 border border-[#eee6de] bg-white p-4 transition hover:border-[#862222]"
      >
        <span className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Sizing help</span>
        <span className="text-[14px] font-medium">Chat on WhatsApp</span>
      </a>
      <a
        href={`https://wa.me/${whatsappNumber(wa)}?text=${encodeURIComponent("Hi Noor Ethnic Wear, I need help with an order.")}`}
        target="_blank"
        rel="noreferrer"
        className="flex flex-col gap-1 border border-[#eee6de] bg-white p-4 transition hover:border-[#862222]"
      >
        <span className="text-[10px] tracking-[.14em] text-[#9c8f82] uppercase">Order help</span>
        <span className="text-[14px] font-medium break-words">WhatsApp support</span>
      </a>
      <p className="text-[12px] text-[#6b6259] sm:col-span-3">
        WhatsApp support: Monday to Saturday, 10:00 AM – 8:00 PM IST (no phone calls)
      </p>
    </div>
  );
}

/** Compact WhatsApp row (track page, order page ke liye) — email nahi (owner rule) */
export function SupportChannels({ className = "" }: { className?: string }) {
  const { whatsapp } = useStoreSettings();
  const wa = whatsapp.replace(/\D/g, "").slice(-10);
  return (
    <div className={`flex flex-wrap gap-2 ${className}`}>
      <a
        href={`https://wa.me/${whatsappNumber(wa)}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center gap-1.5 bg-[#25D366] px-3 text-[10.5px] font-semibold tracking-[.1em] text-white uppercase"
      >
        WhatsApp {whatsapp}
      </a>
      <a
        href={`https://wa.me/${whatsappNumber(wa)}?text=${encodeURIComponent("Hi Noor Ethnic Wear, I need help with my order.")}`}
        target="_blank"
        rel="noreferrer"
        className="inline-flex h-9 items-center border border-[#862222] px-3 text-[10.5px] font-semibold tracking-[.1em] text-[#862222] uppercase"
      >
        Order help
      </a>
    </div>
  );
}
