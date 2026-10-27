import Link from "next/link";
import type { Metadata } from "next";
import { getStoreSettings } from "@/lib/store-settings";
import { whatsappNumber } from "@/lib/phone";

/**
 * Order tracking ka apna "not found" — global 404 ki jagah customer ko saaf
 * batata hai ki is number se koi order nahi mila, aur aage kya kare.
 *
 * Har jagah se reachable: galat number, purana deleted number, ya (Render par)
 * database reset ke baad ka number.
 */
/** Browser tab / share preview me bhi "Order nahi mila" — default site title nahi. */
export const metadata: Metadata = { title: "Order nahi mila", robots: { index: false, follow: false } };

export default async function OrderNotFound() {
  /** number sirf owner settings / Google Sheet se aata hai */
  const settings = await getStoreSettings();
  const wa = settings.whatsapp.replace(/\D/g, "").slice(-10);
  /** number sirf Sheet/owner settings se — khaali ho to WhatsApp button nahi */
  const hasWhatsApp = Boolean(wa);
  return (
    <div className="container-noor py-14 lg:py-20" data-testid="order-not-found">
      <div className="mx-auto max-w-[620px] border border-[#eee6de] bg-[#faf8f5] p-6 text-center sm:p-9">
        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f7e9e9] text-[#862222]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
            <circle cx="12" cy="12" r="9" />
            <path d="M9 9.5a3 3 0 1 1 4.2 2.7c-.8.4-1.2 1-1.2 1.8" />
            <path d="M12 17h.01" />
          </svg>
        </span>
        <h1 className="mt-4 font-display text-[26px] font-medium sm:text-[32px]">Order nahi mila</h1>
        <p className="mx-auto mt-2 max-w-[460px] text-[13px] leading-relaxed text-[#6b6259]">
          Is number se koi order humare system me nahi hai. Ho sakta hai number galat type ho gaya ho,
          ya order abhi sync na hua ho. Number <strong>NE-</strong> se shuru hota hai — dobara check kar
          ke try kariye.
        </p>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link
            href="/track-order"
            className="bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
          >
            Try another number
          </Link>
          {hasWhatsApp ? (
          <a
            href={`https://wa.me/${whatsappNumber(wa)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 border border-[#25D366] px-6 py-3 text-[11px] font-semibold tracking-[.14em] text-[#128c4b] uppercase"
          >
            WhatsApp support
          </a>
          ) : null}
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-[#8a8078]">
          Order kiya tha aur number bilkul sahi hai? WhatsApp par order number bhejiye — team 24 ghante
          me status bata degi.
          {settings.supportPhone ? (
            <>
              {" "}Support: <strong>{settings.supportPhone}</strong>
            </>
          ) : null}
        </p>
      </div>
    </div>
  );
}
