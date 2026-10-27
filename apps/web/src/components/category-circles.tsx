import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { imageUrl } from "@/lib/format";

/**
 * Home ke category circles — ek hi line me, round photo + category ka naam
 * (Anarkali Suit · Lehenga Choli · Printed Suit Set · New Arrivals …).
 * Mobile par horizontally swipe hota hai, desktop par center me fit.
 */
export function CategoryCircles({
  items,
}: {
  items: { href: string; title: string; image?: string | null; count?: number }[];
}) {
  if (!items.length) return null;
  return (
    <section className="container-noor pt-7 lg:pt-9" data-testid="category-circles">
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 sm:justify-center sm:gap-7 lg:gap-10">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="group flex w-[76px] shrink-0 snap-start flex-col items-center sm:w-[92px] lg:w-[104px]"
          >
            <span className="relative block h-[76px] w-[76px] overflow-hidden rounded-full bg-[#f3ece4] ring-1 ring-[#e9dfd4] transition group-hover:ring-2 group-hover:ring-[#862222] sm:h-[92px] sm:w-[92px] lg:h-[104px] lg:w-[104px]">
              {item.image ? (
                <SafeImage
                  src={imageUrl(item.image, 300)}
                  alt={item.title}
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                />
              ) : null}
            </span>
            <span className="mt-2 text-center text-[10.5px] font-medium tracking-[.1em] text-[#2f2a25] uppercase transition group-hover:text-[#862222] sm:text-[11px]">
              {item.title}
            </span>
            {typeof item.count === "number" ? (
              <span className="text-[9.5px] text-[#9c8f82]">{item.count} styles</span>
            ) : null}
          </Link>
        ))}
      </div>
    </section>
  );
}
