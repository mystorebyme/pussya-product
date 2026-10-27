import Link from "next/link";
import type { Metadata } from "next";
import { getCollections, getProductsByCollection } from "@/lib/store";
import { SafeImage } from "@/components/safe-image";
import { imageUrl } from "@/lib/format";
import { siteConfig } from "@/config/site";

/**
 * `/collections` — "Shop" ka landing page.
 *
 * Header ka SHOP link pehle kisi ek collection par jaata tha (ya 404 hota tha).
 * Yahan saari **khaali na hone wali** collections ek grid me hain, har card par
 * asli product count + collection image. Khaali collection (jaise saree = 0)
 * chhup jaati hai — dead link kabhi nahi.
 */
export const revalidate = 600;

export const metadata: Metadata = {
  title: "Shop all collections — Anarkali, Lehenga, Printed Suit Sets",
  description:
    "Browse every Noor Ethnic Wear edit: Anarkali suits, lehenga choli, printed suit sets, new arrivals and the Diwali sale — secure prepaid UPI checkout.",
  alternates: { canonical: "/collections" },
};

export default async function CollectionsIndexPage() {
  const collections = await getCollections();
  const withCounts = await Promise.all(
    collections.map(async (collection) => ({
      ...collection,
      count: (await getProductsByCollection(collection.handle)).length,
      href: `/collections/${collection.handle}`,
    })),
  );
  const visible = withCounts
    .filter((collection) => collection.count > 0)
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));

  return (
    <div className="container-noor py-9 lg:py-12">
      <div className="mx-auto max-w-[720px] text-center">
        <p className="text-[10.5px] tracking-[.28em] text-[#9c8f82] uppercase">Shop</p>
        <h1 className="mt-2 font-display text-[28px] leading-tight font-medium text-[#2f2a25] sm:text-[36px]">
          Every Noor Ethnic Wear edit
        </h1>
        <p className="mt-2 text-[12.5px] leading-relaxed text-[#6b6259]">
          Hand-finished suits, lehengas and festive sets — {siteConfig.name}. Prepaid orders only,
          4–7 day delivery.
        </p>
      </div>

      <div className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
        {visible.map((collection) => (
          <Link
            key={collection.handle}
            href={collection.href}
            className="group border border-[#eee6de] bg-white transition hover:border-[#862222]"
            data-testid="collection-card"
          >
            <div className="relative aspect-[3/4] overflow-hidden bg-[#f7f1e9]">
              <SafeImage
                src={imageUrl(collection.image, 480)}
                alt={collection.title}
                className="h-full w-full object-cover transition duration-700 group-hover:scale-[1.04]"
              />
            </div>
            <div className="px-3 py-3">
              <h2 className="truncate text-[13px] font-medium text-[#2f2a25]">{collection.title}</h2>
              <p className="mt-0.5 text-[10.5px] tracking-[.12em] text-[#9c8f82] uppercase">
                {collection.count} styles
              </p>
            </div>
          </Link>
        ))}
      </div>

      <div className="mt-10 flex justify-center">
        <Link
          href="/search"
          className="border border-[#862222] px-8 py-3 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
        >
          Search the full catalogue
        </Link>
      </div>
    </div>
  );
}
