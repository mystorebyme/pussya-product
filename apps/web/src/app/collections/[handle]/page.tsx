import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { CollectionBrowser } from "@/components/collection-browser";
import {
  canonicalCollectionHandle,
  COLLECTION_ALIASES,
  getCollection,
  getCollections,
  getProductsByCollection,
} from "@/lib/store";

/**
 * Collection page is fully static: `generateStaticParams` se 9 pages prerender hote hain.
 * Sort/price filtering client side hoti hai (CollectionBrowser) — isliye URL param
 * badalne par server round-trip nahi hota aur TTFB edge se aata hai.
 */
export async function generateStaticParams() {
  const list = await getCollections();
  return [...list.map((collection) => ({ handle: collection.handle })), ...Object.keys(COLLECTION_ALIASES).map((handle) => ({ handle }))];
}

type Params = { handle: string };

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { handle } = await params;
  const collection = await getCollection(handle);
  if (!collection) return { title: "Collection not found", robots: { index: false, follow: true } };
  const products = await getProductsByCollection(collection.handle);
  return {
    title: `${collection.title} — ${products.length} styles`,
    description: `${collection.title}: ${collection.subtitle}. ${products.length} designer pieces at Noor Ethnic Wear, free shipping across India and secure prepaid checkout.`,
    alternates: { canonical: `/collections/${canonicalCollectionHandle(collection.handle)}` },
    // khaali collection par thin content — index mat karo (par page accessible rahe)
    robots: products.length === 0 ? { index: false, follow: true } : undefined,
  };
}

export default async function CollectionPage({ params }: { params: Promise<Params> }) {
  const { handle } = await params;
  // alias URL (jaise /collections/wedding-collection) bhi yahi page dikhata hai
  const collection = await getCollection(handle);
  if (!collection) notFound();

  const allCollections = await getCollections();
  const products = await getProductsByCollection(collection.handle);
  const initial = products.slice(0, 24);

  const emptyState = (
    <div className="py-20 text-center">
      <p className="font-display text-[24px] text-[#2f2a25]">
        {collection.handle === "saree" ? "Our saree edit is being styled" : "No styles here just yet"}
      </p>
      <p className="mx-auto mt-2 max-w-[420px] text-[12.5px] leading-relaxed text-[#6b6259]">
        {collection.handle === "saree"
          ? "New six-yard drops are on the way. In the meantime, our anarkali and lehenga edits are full of festive favourites."
          : "Try a different filter, or browse the edits our customers are loving right now."}
      </p>
      <Link
        href="/collections/new-arrivals"
        className="mt-5 inline-block bg-[#862222] px-6 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
      >
        Shop new arrivals
      </Link>
    </div>
  );

  return (
    <div>
      <nav aria-label="Breadcrumb" className="container-noor pt-5">
        <ol className="flex items-center gap-1.5 text-[11px] text-[#9c8f82]">
          <li>
            <Link href="/" className="hover:text-[#862222]">
              Home
            </Link>
          </li>
          <li>/</li>
          <li className="text-[#5c534b]">{collection.title}</li>
        </ol>
      </nav>

      <header className="container-noor pt-3 pb-5 text-center">
        <h1 className="font-display text-[30px] leading-tight font-medium tracking-[.03em] text-[#2f2a25] sm:text-[38px]">
          {collection.title}
        </h1>
        <p className="mt-1 text-[11.5px] tracking-[.14em] text-[#9c8f82] uppercase">{collection.subtitle}</p>
      </header>

      <CollectionBrowser
        handle={collection.handle}
        initial={initial}
        initialTotal={products.length}
        emptyState={emptyState}
      />

      <div className="container-noor pb-12">
        <div className="border-t border-[#eee6de] pt-8">
          <h2 className="text-center text-[11px] font-semibold tracking-[.18em] text-[#862222] uppercase">
            Explore more collections
          </h2>
          <div className="no-scrollbar mt-4 flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-center">
            {allCollections.map((item) => (
              <Link
                key={item.handle}
                href={`/collections/${item.handle}`}
                className={`whitespace-nowrap border px-3.5 py-2 text-[11px] tracking-[.08em] uppercase transition ${
                  item.handle === collection.handle
                    ? "border-[#862222] bg-[#862222] text-white"
                    : "border-[#e0d6ca] text-[#5c534b] hover:border-[#862222] hover:text-[#862222]"
                }`}
              >
                {item.title}
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
