"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

/**
 * WhatsApp float — **har page** par bottom-right corner (R50, owner).
 *
 *   • official WhatsApp logo (single glyph, currentColor — theme ke saath rehta hai)
 *   • click = seedha chat (`wa.me/<number>`) — app me khulta hai, warna web
 *   • pehle 6 second par halka "pulse" ring + "Chat with us" tooltip (desktop)
 *   • page-specific prefilled message, English me, taaki owner ko context mile
 *
 * Number **sirf** Google Sheet → Settings (`whatsapp` / `support_phone`) se aata
 * hai; khaali ho to button dikhta hi nahi (dead `wa.me/` link kabhi nahi).
 */
const MESSAGES: Record<string, string> = {
  "/cart": "Hi Noor Ethnic Wear, I need help with my cart.",
  "/checkout": "Hi Noor Ethnic Wear, I am placing an order and need help.",
  "/track-order": "Hi Noor Ethnic Wear, I want to track my order.",
  "/contact": "Hi Noor Ethnic Wear, I have a question.",
};

function messageFor(pathname: string): string {
  const base = `/${pathname.split("/").filter(Boolean)[0] ?? ""}`;
  if (MESSAGES[base]) return MESSAGES[base];
  if (base === "/products") return "Hi Noor Ethnic Wear, I am interested in this product:";
  return "Hi Noor Ethnic Wear, I would like to place an order.";
}

export function WhatsappFab() {
  const { whatsapp, supportPhone } = useStoreSettings();
  const pathname = usePathname() ?? "/";
  const contactNumber = whatsappNumber(whatsapp || supportPhone);

  /** pehli baar par ek hi pulse — infinite animation scroll ko disturb na kare */
  const [hint, setHint] = useState(false);

  useEffect(() => {
    const seesMotion = !window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!seesMotion) return;
    const show = window.setTimeout(() => setHint(true), 6000);
    const hide = window.setTimeout(() => setHint(false), 16000);
    return () => {
      window.clearTimeout(show);
      window.clearTimeout(hide);
    };
  }, []);

  if (!contactNumber) return null;

  const href = `https://wa.me/${contactNumber}?text=${encodeURIComponent(messageFor(pathname))}`;

  return (
    <div
      className="wa-fab fixed right-3 bottom-3 z-40 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5"
      data-testid="whatsapp-fab"
    >
      <button
        type="button"
        onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        aria-label="Back to top"
        className="wa-top flex h-9 w-9 items-center justify-center rounded-full border border-[#e0d6ca] bg-white text-[#862222] shadow-md"
      >
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden>
          <path d="M12 19V5M5 12l7-7 7 7" />
        </svg>
      </button>

      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        data-testid="whatsapp-fab-link"
        aria-label="Chat with Noor Ethnic Wear on WhatsApp"
        title="Chat on WhatsApp"
        onClick={() => setHint(false)}
        className={`wa-fab-btn group relative flex h-14 w-14 items-center justify-center rounded-full text-white shadow-[0_10px_28px_-6px_rgba(18,140,75,.55)] ${
          hint ? "wa-fab-pulse" : ""
        }`}
      >
        {/* official WhatsApp logo */}
        <svg width="30" height="30" viewBox="0 0 32 32" fill="currentColor" aria-hidden>
          <path d="M16.04 3C8.9 3 3.1 8.8 3.1 15.94c0 2.28.6 4.51 1.74 6.47L3 29l6.76-1.77a12.9 12.9 0 0 0 6.28 1.6h.01c7.13 0 12.94-5.8 12.94-12.94 0-3.46-1.35-6.7-3.79-9.14A12.85 12.85 0 0 0 16.04 3Zm0 23.66h-.01a10.72 10.72 0 0 1-5.46-1.5l-.39-.23-4.02 1.05 1.08-3.92-.26-.4a10.7 10.7 0 0 1-1.64-5.72c0-5.93 4.83-10.75 10.76-10.75 2.87 0 5.57 1.12 7.6 3.15a10.68 10.68 0 0 1 3.15 7.61c0 5.93-4.83 10.75-10.75 10.75Zm5.9-8.05c-.32-.16-1.91-.94-2.2-1.05-.3-.11-.51-.16-.73.16-.21.32-.84 1.05-1.03 1.27-.19.21-.38.24-.7.08-.32-.16-1.36-.5-2.58-1.6a9.72 9.72 0 0 1-1.79-2.23c-.19-.32-.02-.5.14-.66.15-.15.32-.38.48-.57.16-.19.21-.32.32-.53.11-.21.05-.4-.03-.56-.08-.16-.72-1.75-.99-2.39-.26-.63-.53-.54-.72-.55h-.62c-.21 0-.56.08-.85.4-.29.32-1.11 1.09-1.11 2.65s1.14 3.08 1.3 3.29c.16.21 2.24 3.42 5.42 4.79.76.33 1.35.52 1.81.67.76.24 1.46.21 2.01.13.61-.09 1.91-.78 2.18-1.54.27-.75.27-1.4.19-1.54-.08-.13-.29-.21-.61-.37Z" />
        </svg>
        <span className="wa-fab-label pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-[#1f1b17] px-3 py-1.5 text-[11px] font-medium tracking-[.06em] text-white opacity-0 transition group-hover:opacity-100 sm:block">
          Chat on WhatsApp
        </span>
      </a>
    </div>
  );
}
