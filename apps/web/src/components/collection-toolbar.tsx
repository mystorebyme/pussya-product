"use client";

/**
 * Controlled toolbar — state CollectionBrowser ke paas hai (page static rehta hai).
 * URL params `replaceState` se sync hote hain taaki link share ho sake.
 */
const sortOptions = [
  { value: "featured", label: "Featured" },
  { value: "price-low", label: "Price, low to high" },
  { value: "price-high", label: "Price, high to low" },
  { value: "discount", label: "Biggest discount" },
  { value: "new", label: "Newest first" },
  { value: "title-asc", label: "Alphabetically, A-Z" },
];

const priceOptions = [
  { value: "all", label: "Price: all" },
  { value: "under-2500", label: "Under Rs. 2,500" },
  { value: "2500-3000", label: "Rs. 2,500 – 3,000" },
  { value: "3000-3500", label: "Rs. 3,000 – 3,500" },
  { value: "above-3500", label: "Rs. 3,500 & above" },
];

export function CollectionToolbar({
  total,
  sort,
  priceRange,
  loading = false,
  onSortChange,
  onPriceChange,
}: {
  total: number;
  sort: string;
  priceRange: string;
  loading?: boolean;
  onSortChange: (value: string) => void;
  onPriceChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-col gap-3 border-b border-[#eee6de] pb-3 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-[11.5px] tracking-[.1em] text-[#8a8078] uppercase">
        {total} {total === 1 ? "product" : "products"}
        {loading ? <span className="ml-2 text-[#862222]">updating…</span> : null}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <select
          value={priceRange}
          onChange={(event) => onPriceChange(event.target.value)}
          aria-label="Filter by price"
          className="h-9 border border-[#e0d6ca] bg-white px-2.5 text-[11.5px] tracking-[.04em] outline-none focus:border-[#862222]"
        >
          {priceOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(event) => onSortChange(event.target.value)}
          aria-label="Sort products"
          className="h-9 border border-[#e0d6ca] bg-white px-2.5 text-[11.5px] tracking-[.04em] outline-none focus:border-[#862222]"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
