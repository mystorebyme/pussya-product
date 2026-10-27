"use client";

import Link from "next/link";
import { useState } from "react";
import { BrandLockup } from "@/components/brand-lockup";
import { useStoreSettings } from "@/components/store-settings-provider";
import { siteConfig } from "@/config/site";
import { apiUrl } from "@/lib/api-base";
import { whatsappNumber } from "@/lib/phone";

/**
 * Footer — live store (noorethnicwear.in) ka same structure:
 * dark maroon band (#8a000e), white wordmark, Contact Us / Follow Us /
 * CUSTOMER SUPPORT / Menu columns, phir copyright strip.
 */

const supportLinks = [
  { label: "Search", href: "/search" },
  { label: "Privacy Policy", href: "/policies/privacy-policy" },
  { label: "Replacement Policy", href: "/policies/refund-and-return-policy" },
  { label: "Shipping Policy", href: "/policies/shipping-policy" },
  { label: "Contact Information", href: "/pages/contact" },
  { label: "Track your order", href: "/track-order" },
  { label: "About Us", href: "/pages/about-us" },
  { label: "Terms and Conditions", href: "/policies/terms-and-conditions" },
];

const menuLinks = [
  { label: "HOME", href: "/" },
  { label: "NOOR'S CHOICE", href: "/collections/noors-choice" },
  { label: "ANARKALI SUIT", href: "/collections/party-wear-gown" },
  { label: "LEHENGA CHOLI", href: "/collections/lehnga-choli" },
  { label: "PRINTED SUIT SET", href: "/collections/printed-suit-set" },
  { label: "CONTACT US", href: "/pages/contact" },
  { label: "SALE", href: "/collections/sale" },
  { label: "SHOP ALL", href: "/collections" },
  { label: "WEDDING COLLECTION", href: "/collections/wedding-collection" },
];

/**
 * Social — abhi ke liye **sirf Instagram ka URL text** dikhta hai (clickable link
 * nahi, owner ne bola "abhi ke liye koi link nahi"), aur WhatsApp ka working link.
 * Facebook/Pinterest ke dummy links hata diye gaye hain (accounts hi nahi hain).
 */
const INSTAGRAM_URL = siteConfig.socials.instagram;

export function SiteFooter() {
  const { whatsapp, supportPhone } = useStoreSettings();
  /**
   * R42: ek hi contact number (`whatsapp` → warna `support_phone`) aur khaali hone
   * par row hi nahi. Pehle dono bhari hone par footer me **do same WhatsApp rows**
   * dikhti thi, aur dono khaali hone par `wa.me/91` jaisa dead link ban jaata tha.
   */
  const contactNumber = (whatsapp || supportPhone).replace(/\D/g, "").slice(-10);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "done" | "error">("idle");

  async function subscribe(event: React.FormEvent) {
    event.preventDefault();
    if (!email.trim()) return;
    setStatus("loading");
    try {
      const response = await fetch(apiUrl("/api/newsletter"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      setStatus(response.ok ? "done" : "error");
      if (response.ok) setEmail("");
    } catch {
      setStatus("error");
    }
  }

  return (
    <footer className="mt-16 bg-[#8a000e] text-white">
      <div className="mx-auto max-w-[1400px] px-4 pt-11 pb-8 lg:px-6">
        {/* logo footer me bhi center (owner ask) */}
        <div className="flex w-full flex-col items-center justify-center text-center">
          <Link
            href="/"
            aria-label="Noor Ethnic Wear home"
            className="mx-auto inline-flex justify-center"
          >
            {/* same brand lockup jo header me hai — maroon band par gold wordmark */}
            <BrandLockup tone="light" size="large" variant="stacked" />
          </Link>
        </div>

        <div className="mt-9 grid gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-6">
          {/* Contact us */}
          <div>
            <h3 className="text-[15px] font-medium text-white">Contact Us</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-[#ececec]">
              {contactNumber ? (
                <li className="flex items-start gap-2">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" className="mt-0.5 shrink-0" aria-hidden>
                    <path d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2Zm5.2 14.1c-.2.6-1.2 1.2-1.7 1.2-.5.1-1 .1-1.6-.1a11.6 11.6 0 0 1-5.9-5.2c-.4-.7-.6-1.4-.6-2 0-.6.3-1.2.6-1.6.2-.2.4-.3.6-.3h.5c.2 0 .4 0 .5.4l.7 1.7c.1.2 0 .4-.1.6l-.4.5c-.1.1-.2.3-.1.5a7.5 7.5 0 0 0 3.3 2.9c.2.1.4.1.5-.1l.6-.7c.2-.2.3-.2.5-.1l1.6.8c.2.1.4.2.4.4 0 .2 0 .9-.2 1.4Z" />
                  </svg>
                  <a
                    href={`https://wa.me/${whatsappNumber(contactNumber)}`}
                    target="_blank"
                    rel="noreferrer"
                    className="transition hover:text-[#e1d256]"
                  >
                    WhatsApp {contactNumber}
                  </a>
                </li>
              ) : null}
              {/* owner rule: site par support email kahin nahi — sirf WhatsApp.
                  Number sheet se aata hai; sheet me khaali ho to row dikhati hi nahi. */}
              {/* (R42: alag `support_phone` row hata di — upar wali WhatsApp row hi
                  dono keys cover karti hai, warna footer me duplicate contact dikhta tha) */}
            </ul>

            <p className="mt-5 text-[15px] font-medium text-white">Follow Us :</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              {/* Instagram — sirf URL text, koi clickable link nahi (abhi ke liye) */}
              <span className="flex items-center gap-2 text-[12.5px] break-all text-[#f1dede]" data-testid="instagram-url">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <rect x="3" y="3" width="18" height="18" rx="5" />
                  <circle cx="12" cy="12" r="4" />
                  <path d="M17.5 6.5h.01" />
                </svg>
                {INSTAGRAM_URL}
              </span>
              {/* WhatsApp — customer isi par order/query bhejta hai.
                  R42: number na ho to button hi nahi (pehle `wa.me/91` dead link tha). */}
              {contactNumber ? (
              <a
                href={`https://wa.me/${whatsappNumber(contactNumber)}`}
                target="_blank"
                rel="noopener noreferrer"
                aria-label="Chat on WhatsApp"
                className="flex h-8 items-center gap-2 rounded-full border border-white/35 px-3 text-[12px] text-white transition hover:border-[#e1d256] hover:text-[#e1d256]"
              >
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden>
                  <path d="M20 12a8 8 0 0 1-11.7 7.1L4 20l1-4.2A8 8 0 1 1 20 12Z" />
                  <path d="M9 9c.5 3 2.5 5 5.5 5.5" />
                </svg>
                WhatsApp
              </a>
              ) : null}
            </div>
          </div>

          {/* Customer support */}
          <div>
            <h3 className="text-[15px] font-medium text-white">CUSTOMER SUPPORT</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-[#ececec]">
              {supportLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-[#e1d256]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Menu */}
          <div>
            <h3 className="text-[15px] font-medium text-white">Menu</h3>
            <ul className="mt-4 space-y-2.5 text-[13.5px] text-[#ececec]">
              {menuLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="transition hover:text-[#e1d256]">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <h3 className="text-[15px] font-medium text-white">Sale alerts</h3>
            <p className="mt-2 text-[13px] leading-relaxed text-[#f1dede]">
              Join the Noor Ethnic Wear list for early access to new drops and festive sale prices.
            </p>
            <form onSubmit={subscribe} className="mt-3">
              <div className="flex border border-white/40 bg-white">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="Your email"
                  aria-label="Email address"
                  className="h-10 w-full bg-transparent px-2.5 text-[12.5px] text-[#2f2a25] outline-none"
                />
                <button
                  type="submit"
                  disabled={status === "loading"}
                  className="bg-[#222] px-3.5 text-[10.5px] font-semibold tracking-[.12em] text-white uppercase disabled:opacity-60"
                >
                  Join
                </button>
              </div>
              {status === "done" ? (
                <p className="mt-1.5 text-[11.5px] text-[#d9f0d9]">You&apos;re in! Sale alerts on the way.</p>
              ) : null}
              {status === "error" ? (
                <p className="mt-1.5 text-[11.5px] text-[#ffd6cf]">
                  Signup abhi save nahi hua.{" "}
                  <a
                    href={`https://wa.me/${whatsappNumber(contactNumber)}?text=${encodeURIComponent(
                      `Hi Noor Ethnic Wear! Please add me to the sale list: ${email}`,
                    )}`}
                    target="_blank"
                    rel="noreferrer"
                    className="underline"
                  >
                    send it to us on WhatsApp
                  </a>
                  .
                </p>
              ) : null}
            </form>

            <div className="mt-5 space-y-1.5 text-[13px] text-[#ececec]">
              <p>
                <Link href="/wishlist" className="transition hover:text-[#e1d256]">
                  My Wishlist
                </Link>
              </p>
              <p>
                <Link href="/compare" className="transition hover:text-[#e1d256]">
                  Compare Products
                </Link>
              </p>
              <p>
                <Link href="/track-order" className="transition hover:text-[#e1d256]">
                  Track your order
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-t border-white/20">
        <div className="mx-auto flex max-w-[1400px] flex-col items-center justify-between gap-2 px-4 py-4 text-[11.5px] text-[#f3e2e2] sm:flex-row lg:px-6">
          <p>© {new Date().getFullYear()}, Noor Ethnic Wear. All rights reserved.</p>
          <p className="text-[10.5px] tracking-[.1em] uppercase">Secure prepaid payments</p>
        </div>
      </div>
    </footer>
  );
}
