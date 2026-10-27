import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { renderMarkdown } from "@/lib/markdown";
import { SupportChannels } from "@/components/contact-details";
import { policyMarkdown } from "@/content/policies.generated";

const policyMeta: Record<string, { title: string; description: string }> = {
  "privacy-policy": {
    title: "Privacy Policy",
    description: "How Noor Ethnic Wear collects, uses and protects your personal data under the DPDP Act.",
  },
  "terms-and-conditions": {
    title: "Terms & Conditions",
    description: "The terms that apply when you shop with Noor Ethnic Wear.",
  },
  "refund-and-return-policy": {
    title: "Refund & Return Policy",
    description: "7 day returns, exchanges and refund timelines at Noor Ethnic Wear.",
  },
  "shipping-policy": {
    title: "Shipping Policy",
    description: "Shipping charges, dispatch times and delivery estimates across India.",
  },
};

export function generateStaticParams() {
  return Object.keys(policyMeta).map((slug) => ({ slug }));
}

export const dynamicParams = false;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const meta = policyMeta[slug];
  if (!meta) return { title: "Policy not found" };
  return { title: meta.title, description: meta.description, alternates: { canonical: `/policies/${slug}` } };
}

export default async function PolicyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const meta = policyMeta[slug];
  if (!meta) notFound();

  /**
   * Policy text bundle me hai (`policies.generated.ts`) — runtime file system
   * par depend nahi karta, isliye Cloudflare Workers par bhi policy page chalta hai.
   * Source markdown: `apps/web/src/content/policies/*.md`.
   */
  const content = policyMarkdown[slug];
  if (!content) notFound();

  return (
    <div className="container-noor py-10 lg:py-14">
      <div className="mx-auto max-w-[820px]">
        <nav className="mb-6 flex flex-wrap gap-2 text-[11px]">
          {Object.entries(policyMeta).map(([key, value]) => (
            <Link
              key={key}
              href={`/policies/${key}`}
              className={`border px-2.5 py-1 ${
                key === slug
                  ? "border-[#862222] bg-[#862222] text-white"
                  : "border-[#e5dbd0] text-[#5c534b] hover:border-[#862222] hover:text-[#862222]"
              }`}
            >
              {value.title}
            </Link>
          ))}
        </nav>
        <article className="border border-[#eee6de] p-6 sm:p-9">{renderMarkdown(content)}</article>
        {/* number/email sheet se live — yahan hardcode nahi */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <p className="text-[11.5px] text-[#8a8078]">Questions? WhatsApp ya email kariye —</p>
          <SupportChannels />
        </div>
      </div>
    </div>
  );
}
