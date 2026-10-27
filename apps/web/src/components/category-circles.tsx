import Link from "next/link";
import { SafeImage } from "@/components/safe-image";
import { CategoryIcon, iconForCollection, type CategoryIconName } from "@/components/category-icon";
import { imageUrl } from "@/lib/format";

/**
 * Home ke category circles — round photo + category ka naam.
 *
 * R47: har circle par us category ka **apna animated gold icon** (badge me) —
 * photos ek jaisi lagti hain, isliye icon se pehchan turant ho jaati hai.
 * Icon khud ko draw karta hai (CSS, `globals.css` → `.cat-icon`), hover par
 * badge halka uthta hai aur shimmer chalti hai.
 */
export function CategoryCircles({
  items,
}: {
  items: {
    href: string;
    title: string;
    image?: string | null;
    count?: number;
    icon?: CategoryIconName;
  }[];
}) {
  if (!items.length) return null;
  return (
    <section className="container-noor pt-7 lg:pt-9" data-testid="category-circles">
      <div className="no-scrollbar -mx-4 flex snap-x snap-mandatory items-start gap-4 overflow-x-auto px-4 sm:justify-center sm:gap-7 lg:gap-10">
        {items.map((item) => {
          const handle = item.href.split("/").pop() ?? "";
          const icon = item.icon ?? iconForCollection(handle, item.title);
          return (
            <Link
              key={item.href}
              href={item.href}
              className="group flex w-[84px] shrink-0 snap-start flex-col items-center sm:w-[96px] lg:w-[108px]"
              data-testid="category-circle"
            >
              <span className="relative block h-[76px] w-[76px] rounded-full bg-[#f3ece4] ring-1 ring-[#e9dfd4] transition duration-500 group-hover:ring-2 group-hover:ring-[#862222] sm:h-[92px] sm:w-[92px] lg:h-[104px] lg:w-[104px]">
                <span className="absolute inset-0 overflow-hidden rounded-full">
                  {item.image ? (
                    <SafeImage
                      src={imageUrl(item.image, 300)}
                      alt={item.title}
                      className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-110"
                    />
                  ) : null}
                </span>
                {/* unique animated icon badge — white ring par gold line-art */}
                <span
                  className="cat-badge absolute -right-0.5 bottom-0 flex h-[26px] w-[26px] items-center justify-center rounded-full bg-white text-[#a67c2e] shadow-[0_2px_8px_rgba(90,50,20,.18)] ring-1 ring-[#eadfce] transition duration-500 group-hover:-translate-y-0.5 group-hover:text-[#862222] group-hover:ring-[#d9c3a1] sm:h-7 sm:w-7"
                  aria-hidden
                >
                  <CategoryIcon name={icon} className="h-[17px] w-[17px] sm:h-[18px] sm:w-[18px]" />
                </span>
              </span>
              <span className="mt-2 text-center text-[10.5px] font-medium tracking-[.1em] text-[#2f2a25] uppercase transition group-hover:text-[#862222] sm:text-[11px]">
                {item.title}
              </span>
              {typeof item.count === "number" ? (
                <span className="text-[9.5px] text-[#9c8f82]">{item.count} styles</span>
              ) : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}
