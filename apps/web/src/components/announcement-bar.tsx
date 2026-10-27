"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useStoreSettings } from "@/components/store-settings-provider";

/**
 * Announcement bar — live store par 3 messages rotate hote hain (flickity autoplay).
 * Yahan lightweight fade/slide rotation hai, koi library nahi.
 */
const MESSAGES = [
  { text: "Diwali Sale — Up to 70% OFF · Final price ₹499 onwards", href: "/collections/sale" },
  { text: "Express Delivery on Prepaid Orders", href: "/policies/shipping-policy" },
  { text: "Free Shipping within India", href: "/policies/shipping-policy" },
  { text: "Secure Prepaid Checkout — UPI, Cards & Netbanking", href: "/policies/payment-policy" },
];

export function AnnouncementBar() {
  const { announcement } = useStoreSettings();
  const [index, setIndex] = useState(0);
  const [visible, setVisible] = useState(true);

  // owner ki Google Sheet / admin se aaya announcement sabse pehle
  const messages = useMemo(
    () =>
      announcement
        ? [{ text: announcement, href: "/collections/sale" }, ...MESSAGES]
        : MESSAGES,
    [announcement],
  );

  useEffect(() => {
    if (messages.length < 2) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % messages.length);
    }, 4200);
    return () => window.clearInterval(timer);
  }, [messages.length]);

  if (!visible) return null;
  const message = messages[index % messages.length];

  return (
    <div className="relative bg-[#862222] text-white" data-testid="announcement-bar">
      <div className="container-noor flex h-9 items-center justify-center">
        <Link
          key={message.text}
          href={message.href}
          className="animate-soft-fade px-6 text-center text-[10.5px] font-medium tracking-[.16em] uppercase hover:underline sm:text-[11px]"
        >
          {message.text}
        </Link>
      </div>
      <button
        type="button"
        onClick={() => setVisible(false)}
        aria-label="Dismiss announcement"
        className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-white/70 transition hover:text-white"
      >
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M5 5l14 14M19 5 5 19" />
        </svg>
      </button>
    </div>
  );
}
