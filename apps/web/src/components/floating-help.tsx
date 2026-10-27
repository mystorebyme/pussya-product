"use client";

import { useEffect, useState } from "react";
import { useCart } from "@/components/cart-provider";
import { useStoreSettings } from "@/components/store-settings-provider";
import { whatsappNumber } from "@/lib/phone";

export function FloatingHelp() {
  const { isOpen } = useCart();
  const { whatsapp } = useStoreSettings();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (isOpen) return null;

  return (
    <div className="fixed right-3 bottom-3 z-30 flex flex-col items-end gap-2 sm:right-5 sm:bottom-5">
      {visible ? (
        <button
          type="button"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          className="flex h-10 w-10 items-center justify-center rounded-full border border-[#e0d6ca] bg-white text-[#862222] shadow-md"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 19V5M5 12l7-7 7 7" />
          </svg>
        </button>
      ) : null}
      <a
        href={`https://wa.me/${whatsappNumber(whatsapp.replace(/\D/g, "").slice(-10))}`}
        target="_blank"
        rel="noreferrer"
        className="flex h-12 w-12 items-center justify-center rounded-full bg-[#25D366] text-white shadow-lg transition hover:scale-105"
        aria-label="Chat on WhatsApp"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" />
          <path d="M9 9c.5 3 2.5 5 5.5 5.5" />
        </svg>
      </a>
    </div>
  );
}
