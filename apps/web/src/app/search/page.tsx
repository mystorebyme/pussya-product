import type { Metadata } from "next";
import { ProductGrid } from "@/components/product-card";
import { ProductGridWithMore } from "@/components/product-grid-client";
import { getProducts, recommendedProducts, searchSuggestions } from "@/lib/store";
import { SearchBar } from "@/components/search-bar";

export const metadata: Metadata = {
  title: "Search",
  // search results ko Google me index karne ka koi faayda nahi (duplicate/thin)
  robots: { index: false, follow: true },
  alternates: { canonical: "/search" },
};
export const dynamic = "force-dynamic";

const POPULAR_TAGS = ["Anarkali", "Lehenga", "Black", "Ivory", "Printed", "Georgette", "Maroon", "Silk"];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const term = (q ?? "").trim();
  const products = await getProducts();
  const results = term
    ? products.filter((product) => {
        const haystack = `${product.title} ${product.color} ${product.fabric} ${product.category}`.toLowerCase();
        return term
          .toLowerCase()
          .split(/\s+/)
          .filter(Boolean)
          .every((word) => haystack.includes(word));
      })
    : [];

  const suggestions = term ? searchSuggestions(term, 6) : [];
  const fallback = recommendedProducts(8);

  return (
    <div className="container-noor py-9">
      <div className="mx-auto max-w-[640px] text-center">
        <h1 className="font-display text-[28px] font-medium sm:text-[34px]">Search our store</h1>
        <p className="mt-1 text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
          Anarkali suits · Lehenga choli · Printed suit sets
        </p>
        <div className="mt-4">
          <SearchBar initialQuery={term} />
        </div>
      </div>

      <div className="mt-9">
        {term ? (
          <>
            <p className="mb-5 text-[11.5px] tracking-[.1em] text-[#8a8078] uppercase">
              {results.length} results for &ldquo;{term}&rdquo;
            </p>

            {suggestions.length > 0 ? (
              <div className="mb-6 flex flex-wrap items-center gap-2" data-testid="search-terms">
                <span className="text-[10.5px] tracking-[.14em] text-[#9c8f82] uppercase">Related searches</span>
                {suggestions.map((suggestion) => (
                  <a
                    key={suggestion}
                    href={`/search?q=${encodeURIComponent(suggestion)}`}
                    className="border border-[#e0d6ca] px-3 py-1.5 text-[11.5px] hover:border-[#862222] hover:text-[#862222]"
                  >
                    {suggestion}
                  </a>
                ))}
              </div>
            ) : null}

            {results.length > 0 ? (
              <ProductGridWithMore
                initial={results.slice(0, 24)}
                total={results.length}
                query={`q=${encodeURIComponent(term)}`}
              />
            ) : (
              <div>
                <p className="py-8 text-center text-sm text-[#6b6259]">
                  No products were found matching your selection.
                </p>
                <div className="mt-2">
                  <h2 className="text-center font-display text-[22px] font-medium sm:text-[26px]">
                    You may also like
                  </h2>
                  <p className="mt-1 text-center text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
                    Handpicked from our best-selling edits
                  </p>
                  <div className="mt-6">
                    <ProductGrid products={fallback.slice(0, 4)} />
                  </div>
                </div>
              </div>
            )}
          </>
        ) : (
          <div>
            <div className="text-center">
              <p className="text-[12px] tracking-[.14em] text-[#9c8f82] uppercase">Popular searches</p>
              <div className="mt-3 flex flex-wrap justify-center gap-2">
                {POPULAR_TAGS.map((tag) => (
                  <a
                    key={tag}
                    href={`/search?q=${encodeURIComponent(tag)}`}
                    className="border border-[#e0d6ca] px-3 py-1.5 text-[11.5px] hover:border-[#862222] hover:text-[#862222]"
                  >
                    {tag}
                  </a>
                ))}
              </div>
            </div>

            <div className="mt-12" data-testid="search-recommended">
              <h2 className="text-center font-display text-[24px] font-medium sm:text-[28px]">
                Recommended for you
              </h2>
              <p className="mt-1 text-center text-[11px] tracking-[.14em] text-[#9c8f82] uppercase">
                Trending picks
              </p>
              <div className="mt-6">
                <ProductGrid products={fallback} />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
