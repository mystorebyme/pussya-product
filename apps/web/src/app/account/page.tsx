import Link from "next/link";
import type { Metadata } from "next";
import { TrackOrderForm } from "@/components/track-order-form";
import { getStoreSettings } from "@/lib/store-settings";
import { whatsappNumber } from "@/lib/phone";

export const metadata: Metadata = {
  title: "My account & order tracking",
  description: "Track your Noor Ethnic Wear order, download your invoice or get help on WhatsApp.",
  robots: { index: true, follow: true },
};

const helpLinks = [
  { label: "Size guide", href: "/pages/size-guide" },
  { label: "Shipping & delivery", href: "/policies/shipping-policy" },
  { label: "Returns & refunds", href: "/policies/refund-and-return-policy" },
  { label: "Contact us", href: "/pages/contact" },
];

export default async function AccountPage() {
  /** number/email ka source Google Sheet + owner settings — koi hardcoded value nahi */
  const settings = await getStoreSettings();
  return (
    <div className="container-noor py-10 lg:py-14">
      <div className="mx-auto max-w-[900px]">
        <div className="text-center">
          <h1 className="font-display text-[30px] font-medium tracking-[.03em] sm:text-[36px]">
            Track your order
          </h1>
          <p className="mt-1 text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
            Your order number is sent on WhatsApp
          </p>
        </div>

        <div className="mt-8 grid gap-5 sm:grid-cols-2">
          <div className="border border-[#eee6de] bg-[#faf8f5] p-5 sm:p-6">
            <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">
              Order status
            </h2>
            <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6259]">
              Enter your order number to see the live status, items and delivery address.
            </p>
            <TrackOrderForm />
            <p className="mt-3 text-[11px] text-[#8a8078]">
              Lost your order number?{" "}
              {settings.whatsapp ? (
                <>
                  WhatsApp{" "}
                  <a href={`https://wa.me/${whatsappNumber(settings.whatsapp)}`} className="text-[#862222]">
                    {settings.whatsapp}
                  </a>
                </>
              ) : (
                <Link href="/pages/contact" className="text-[#862222]">
                  contact page
                </Link>
              )}
            </p>
          </div>

          <div className="border border-[#eee6de] p-5 sm:p-6">
            <h2 className="text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase">
              Need help?
            </h2>
            <ul className="mt-3 space-y-2">
              {helpLinks.map((link) => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[12.5px] text-[#5c534b] hover:text-[#862222]">
                    {link.label} →
                  </Link>
                </li>
              ))}
            </ul>
            <div className="mt-4 border-t border-[#f0eae3] pt-3 text-[12px] text-[#6b6259]">
              {settings.supportEmail ? <p>Email: {settings.supportEmail}</p> : null}
              {settings.supportPhone ? <p className="mt-1">Phone: {settings.supportPhone}</p> : null}
              <p className="mt-1 text-[11px] text-[#8a8078]">
                Account login with saved addresses and wishlist is coming in Phase 2.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
