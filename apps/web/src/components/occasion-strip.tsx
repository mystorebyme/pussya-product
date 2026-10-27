import Link from "next/link";
import { getCollections } from "@/lib/store";
import { imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";

export async function OccasionStrip() {
  const collections = await getCollections();
  return (
    <section className="container-noor pb-12">
      <div className="flex flex-col items-center">
        <h2 className="font-display text-[25px] font-medium tracking-[.03em] sm:text-[30px]">
          Shop by edit
        </h2>
        <p className="mt-1 text-[11px] tracking-[.16em] text-[#9c8f82] uppercase">
          Curated for weddings, festivities & everyday ease
        </p>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-2.5 sm:grid-cols-4 sm:gap-4">
        {collections.slice(0, 8).map((collection) => (
          <Link key={collection.handle} href={`/collections/${collection.handle}`} className="group block">
            <div className="relative aspect-[4/5] overflow-hidden bg-[#f3ece4]">
              <SafeImage
                src={imageUrl(collection.image, 600)}
                alt={collection.title}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.05]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-2.5 text-center">
                <p className="text-[10.5px] font-medium tracking-[.12em] text-white uppercase">
                  {collection.title}
                </p>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function EditorialBand() {
  return (
    <section className="bg-[#faf6f1] py-12">
      <div className="container-noor grid items-center gap-8 lg:grid-cols-2">
        <div className="relative aspect-[4/3] overflow-hidden bg-[#f0e7dd]">
          <SafeImage
            src={imageUrl("https://cdn.shopify.com/s/files/1/0738/8345/1696/files/IMG_9512.webp", 900)}
            alt="Noor Ethnic Wear signature craftsmanship"
            className="h-full w-full object-cover"
          />
        </div>
        <div className="max-w-[520px]">
          <p className="text-[10.5px] tracking-[.2em] text-[#862222] uppercase">The Designer signature</p>
          <h2 className="mt-2 font-display text-[28px] leading-tight font-medium sm:text-[36px]">
            Heirloom embroidery, finished by hand
          </h2>
          <p className="mt-3 text-[13px] leading-relaxed text-[#5c534b]">
            Every Noor Ethnic Wear anarkali, lehenga and suit set is cut from premium fabric and finished by
            karigars who have spent generations perfecting zari, sequin and thread work. Fully stitched,
            ready to wear and delivered across India.
          </p>
          <ul className="mt-4 grid grid-cols-2 gap-2 text-[11.5px] text-[#4a423b]">
            {[
              "Fully stitched & ready",
              "Premium mill-direct fabric",
              "Prepaid UPI checkout",
              "7 days easy replacement",
            ].map((item) => (
              <li key={item} className="flex items-center gap-1.5">
                <span className="text-[#862222]">✓</span>
                {item}
              </li>
            ))}
          </ul>
          <Link
            href="/pages/about-us"
            className="mt-5 inline-block border border-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-[#862222] uppercase transition hover:bg-[#862222] hover:text-white"
          >
            Our story
          </Link>
        </div>
      </div>
    </section>
  );
}
