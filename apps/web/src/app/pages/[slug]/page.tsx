import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ContactForm } from "@/components/contact-form";
import { ContactDetails } from "@/components/contact-details";
import { TrackOrderForm } from "@/components/track-order-form";
import { WhatsAppLink } from "@/components/whatsapp-link";

type PageContent = {
  title: string;
  eyebrow: string;
  intro: string;
  sections: { heading: string; body: string[] }[];
  showContactForm?: boolean;
  showContactDetails?: boolean;
  showTrackOrder?: boolean;
  showSizeTable?: boolean;
};

const pages: Record<string, PageContent> = {
  "about-us": {
    title: "About Us",
    eyebrow: "Our Story",
    intro:
      "Noor Ethnic Wear is a celebration of Indian craftsmanship — designed for the woman who carries tradition with effortless modernity.",
    sections: [
      {
        heading: "Crafted for your celebrations",
        body: [
          "What began as a small studio has grown into a destination for hand-finished Anarkali suits, lehengas and printed suit sets loved across India. Every silhouette is developed in-house, from the first sketch to the final dori latkan.",
          "We work closely with karigars who have spent generations perfecting zari, sequin and thread work. That is why each piece carries a weight, a drape and a finish you can feel the moment you open the box.",
        ],
      },
      {
        heading: "Premium fabrics, honest prices",
        body: [
          "We buy fabric directly from mills, cut out the middlemen and pass the savings to you. Vichitra silk, fendy, georgette, faux blooming and micro cotton — sourced for comfort, longevity and a beautiful fall.",
          "Every suit set is stitched and quality-checked in our own unit before it is dispatched, so you receive ready-to-wear pieces with no last-minute tailor visits.",
        ],
      },
      {
        heading: "Here when you need us",
        body: [
          "Our team is available on WhatsApp 24/7 for sizing help, fabric close-ups and order tracking. Free shipping across India on every prepaid order, with 7 days replacement.",
        ],
      },
    ],
  },
  contact: {
    title: "Contact Information",
    eyebrow: "We're here to help",
    intro:
      "Questions on sizing, fabric or your order? Message us on WhatsApp for the fastest response — our stylists reply within a few minutes.",
    sections: [
    ],
    showContactDetails: true,
    showContactForm: true,
  },
  "track-order": {
    title: "Track Your Order",
    eyebrow: "Order tracking",
    intro:
      "Enter your order number to see the live status — from placed to delivered, with courier and AWB details.",
    sections: [
      {
        heading: "Where do I find my order number?",
        body: [
          "Your order number (for example NE-1A2B3C) appears on screen when the order is confirmed and is sent on WhatsApp and email.",
          "The same number is in the WhatsApp message we send with your order — use it any time to check the status.",
        ],
      },
      {
        heading: "Need help?",
        body: [
          "If the status has not updated or the parcel is late, send the order number on WhatsApp — our team checks and replies right away.",
        ],
      },
    ],
    showTrackOrder: true,
  },
  "shipping-policy": {
    title: "Shipping Policy",
    eyebrow: "Delivery",
    intro: "Free shipping across India on every order — all orders are prepaid and dispatched within 1-2 business days.",
    sections: [
      {
        heading: "Dispatch timelines",
        body: [
          "In-stock orders are packed and handed to our courier partner within 1-2 business days. Delivery typically takes 4-7 business days depending on your pincode. Remote locations may take up to 10 days.",
          "You will receive a tracking link on WhatsApp and email as soon as the parcel is picked up.",
        ],
      },
      {
        heading: "Payment",
        body: [
          "We accept prepaid orders only — UPI, credit/debit cards and netbanking. A secure payment link is shared on WhatsApp as soon as the order is placed, and dispatch begins the same day.",
        ],
      },
      {
        heading: "International shipping",
        body: [
          "We currently ship within India. For international requests, please WhatsApp us your address and we will share a custom quote.",
        ],
      },
    ],
  },
  "replacement-policy": {
    title: "Replacement Policy",
    eyebrow: "Easy exchanges",
    intro: "Simply return it within 7 days for an exchange.",
    sections: [
      {
        heading: "7 days replacement",
        body: [
          "If the product is damaged, has a manufacturing defect or was incorrectly shipped, request a replacement within 7 days of delivery.",
          "The item must be unused, unwashed and have all original tags intact. Share an unboxing video or clear photographs on WhatsApp along with your order number (number neeche diya hai).",
        ],
      },
      {
        heading: "Non-returnable cases",
        body: [
          "Custom-stitched or altered garments, and products marked final sale, cannot be returned. Colour variation of up to 10% may occur due to photography lighting and screen calibration and is not considered a defect.",
        ],
      },
      {
        heading: "Refunds",
        body: [
          "Approved refunds are processed to the original payment method within 5-7 business days. If the original method is unavailable, we refund via UPI or bank transfer.",
        ],
      },
    ],
  },
  "privacy-policy": {
    title: "Privacy Policy",
    eyebrow: "Your data, protected",
    intro:
      "We collect only what we need to deliver your order and keep you updated. We never sell your information.",
    sections: [
      {
        heading: "Information we collect",
        body: [
          "Name, email, phone number, shipping address and order history. For prepaid orders, payments are processed on PCI-DSS compliant gateways — we never store card details.",
          "We also use cookies to remember your cart and to understand which products are popular, so we can improve the store.",
        ],
      },
      {
        heading: "How we use it",
        body: [
          "To process and ship your order, to provide customer support, and to send order updates. With your consent we may send occasional offers — you can unsubscribe at any time.",
        ],
      },
      {
        heading: "Your rights",
        body: [
          "You may request access, correction or deletion of your personal data by emailing our support address (Contact page par). We respond within 30 days.",
        ],
      },
    ],
  },
  "terms-and-conditions": {
    title: "Terms and Conditions",
    eyebrow: "The fine print",
    intro: "These terms apply to every purchase made on our website.",
    sections: [
      {
        heading: "Pricing & availability",
        body: [
          "All prices are in Indian Rupees and inclusive of GST. Product availability is updated regularly; in the rare event an item sells out after your order, we will offer an exchange or a full refund.",
        ],
      },
      {
        heading: "Orders",
        body: [
          "We reserve the right to cancel orders that appear fraudulent or where the shipping address is incomplete. For multiple items, an advance payment may be required before dispatch.",
        ],
      },
      {
        heading: "Intellectual property",
        body: [
          "All photography, designs and content on this site belong to Noor Ethnic Wear and may not be reused without written permission.",
        ],
      },
    ],
  },
  "size-guide": {
    title: "Size Guide",
    eyebrow: "Find your fit",
    intro:
      "Most of our suits are ready-to-wear. Compare your body measurements with the chart below — when in doubt, size up or message us on WhatsApp with your bust, waist and height.",
    sections: [
      {
        heading: "How to measure",
        body: [
          "Bust: measure around the fullest part of the bust, keeping the tape parallel to the floor.",
          "Waist: measure around the narrowest part of your natural waist.",
          "Hips: measure around the widest part of your hips, roughly 8 inches below your waist.",
          "Always wear light clothing while measuring, and keep one finger between the tape and your body.",
        ],
      },
    ],
    showSizeTable: true,
  },
};

/**
 * Purane URL jo kabhi share ho gaye — same content par resolve hote hain
 * (redirect nahi, kyunki static export par redirect ka bharosa nahi; canonical
 * hamesha sahi slug par jaata hai taaki duplicate page index na ho).
 */
const PAGE_ALIASES: Record<string, string> = {
  "size-cheart": "size-guide",
};

function resolvePage(slug: string): { page: PageContent; canonicalSlug: string } | null {
  if (pages[slug]) return { page: pages[slug], canonicalSlug: slug };
  const canonical = PAGE_ALIASES[slug];
  if (canonical && pages[canonical]) return { page: pages[canonical], canonicalSlug: canonical };
  return null;
}

/** content pages build ke waqt prerender hote hain (fast + static export safe) */
export function generateStaticParams() {
  return [...Object.keys(pages), ...Object.keys(PAGE_ALIASES)].map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const resolved = resolvePage(slug);
  if (!resolved) return { title: "Page not found", robots: { index: false, follow: true } };
  return {
    title: resolved.page.title,
    description: resolved.page.intro,
    alternates: { canonical: `/pages/${resolved.canonicalSlug}` },
  };
}

export default async function ContentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const resolved = resolvePage(slug);
  if (!resolved) notFound();
  const page = resolved.page;

  return (
    <div>
      <div className="border-b border-[#eee6de] bg-[#faf7f3] py-10 text-center">
        <p className="text-[10.5px] tracking-[.18em] text-[#9c8f82] uppercase">{page.eyebrow}</p>
        <h1 className="mt-1.5 font-display text-[30px] font-medium tracking-[.03em] sm:text-[38px]">{page.title}</h1>
        <p className="mx-auto mt-2 max-w-[620px] px-4 text-[12.5px] leading-relaxed text-[#6b6259]">{page.intro}</p>
      </div>

      <div className="container-noor py-10">
        <div className="mx-auto max-w-[860px]">
          <div className="space-y-8">
            {page.sections.map((section) => (
              <section key={section.heading}>
                <h2 className="font-display text-[21px] font-medium text-[#862222] sm:text-[24px]">
                  {section.heading}
                </h2>
                <div className="mt-2 space-y-2.5">
                  {section.body.map((paragraph) => (
                    <p key={paragraph} className="text-[13px] leading-relaxed text-[#5c534b]">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          {page.showSizeTable ? (
            <div className="mt-9 overflow-x-auto">
              <table className="w-full min-w-[460px] border-collapse text-[12.5px]">
                <thead>
                  <tr className="bg-[#862222] text-white">
                    {["Size", "Bust (in)", "Waist (in)", "Hip (in)", "Bottom length"].map((head) => (
                      <th key={head} className="px-3 py-2.5 text-left font-medium tracking-[.06em] uppercase">
                        {head}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {[
                    ["S", "34", "30", "36", "38"],
                    ["M", "36", "32", "38", "38"],
                    ["L", "38", "34", "40", "38"],
                    ["XL", "40", "36", "42", "38"],
                    ["XXL", "42", "38", "44", "38"],
                  ].map((row) => (
                    <tr key={row[0]} className="border-b border-[#eee6de] even:bg-[#faf8f5]">
                      {row.map((cell, index) => (
                        <td key={index} className="px-3 py-2.5">
                          {cell}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {page.showContactDetails ? (
            <div className="mt-9">
              <h2 className="font-display text-[21px] font-medium text-[#862222] sm:text-[24px]">Reach us</h2>
              <div className="mt-3">
                <ContactDetails />
              </div>
            </div>
          ) : null}

          {page.showTrackOrder ? (
            <div className="mt-9 border border-[#eee6de] bg-[#faf8f5] p-5 sm:p-6">
              <TrackOrderForm />
            </div>
          ) : null}

          {page.showContactForm ? (
            <div className="mt-9">
              <ContactForm />
            </div>
          ) : null}

          <div className="mt-10 flex flex-wrap gap-3 border-t border-[#eee6de] pt-6">
            <Link
              href="/collections/party-wear-gown"
              className="bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
            >
              Shop Anarkali Suits
            </Link>
            <WhatsAppLink
              label="WhatsApp us"
              className="border border-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
