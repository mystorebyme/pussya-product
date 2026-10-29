"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { productsByHandles } from "@/lib/catalog-lite";
import { useWishlist } from "@/components/wishlist-provider";
import { useCart } from "@/components/cart-provider";
import { discountPercent, formatPrice, imageUrl } from "@/lib/format";
import { SafeImage } from "@/components/safe-image";
import type { Product } from "@/types/catalog";

/** Compare — max 4 pieces side-by-side (price, MRP, sizes, fabric, colour). */
export default function ComparePage() {
  const { compare, ready, toggleCompare, clearCompare } = useWishlist();
  const { addItem } = useCart();
  const [items, setItems] = useState<Product[]>([]);

  useEffect(() => {
    if (!ready) return;
    if (!compare.length) {
      setItems([]);
      return;
    }
    let active = true;
    productsByHandles(compare)
      .then((products) => {
        if (active) setItems(products);
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [compare, ready]);

  const rows: { label: string; value: (product: Product) => string }[] = [
    { label: "Price", value: (product) => formatPrice(product.price) },
    {
      label: "MRP",
      value: (product) =>
        product.compareAtPrice && product.compareAtPrice > product.price ? formatPrice(product.compareAtPrice) : "—",
    },
    { label: "Discount", value: (product) => `${discountPercent(product.price, product.compareAtPrice)}% off` },
    { label: "Fabric", value: (product) => product.fabric },
    { label: "Colour", value: (product) => product.colourName ?? product.color },
    { label: "Sizes", value: (product) => product.sizes.join(" · ") },
    { label: "Availability", value: (product) => (product.inStock ? "In stock" : "Sold out") },
  ];

  return (
    <div className="container-noor py-9 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-medium sm:text-[34px]">Compare products</h1>
          <p className="mt-1 text-[11.5px] tracking-[.12em] text-[#9c8f82] uppercase">
            {ready ? `${compare.length} of 4 selected` : "Loading…"}
          </p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearCompare}
            className="border border-[#ddd2c6] px-4 py-2 text-[10.5px] font-semibold tracking-[.14em] text-[#6b6259] uppercase transition hover:border-[#862222] hover:text-[#862222]"
          >
            Clear all
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border border-[#eee6de] px-6 py-20 text-center">
          <p className="text-sm text-[#6b6259]">
            {ready ? "Your compare list is empty — tap the eye icon on any product card." : "Loading…"}
          </p>
          <Link
            href="/collections/noors-choice"
            className="mt-5 inline-block bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
          >
            Browse our choice
          </Link>
        </div>
      ) : (
        <div className="mt-7 overflow-x-auto">
          <table className="w-full min-w-[640px] border-collapse text-left text-[12.5px]">
            <thead>
              <tr>
                <th className="w-[130px] border-b border-[#eee6de] p-2" />
                {items.map((product) => (
                  <th key={product.handle} className="border-b border-[#eee6de] p-2 align-top">
                    <div className="relative">
                      <Link href={`/products/${product.handle}`}>
                        <SafeImage
                          src={imageUrl(product.images[0], 400)}
                          alt={product.title}
                          className="aspect-[3/4] w-full object-cover"
                        />
                      </Link>
                      <button
                        type="button"
                        onClick={() => toggleCompare(product.handle)}
                        aria-label={`Remove ${product.title} from compare`}
                        className="absolute right-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/95 text-[#862222] shadow"
                      >
                        ×
                      </button>
                    </div>
                    <Link
                      href={`/products/${product.handle}`}
                      className="mt-2 block text-[12px] font-medium leading-snug hover:text-[#862222]"
                    >
                      {product.title}
                    </Link>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} className="even:bg-[#faf8f5]">
                  <th className="p-2 align-top text-[10.5px] font-semibold tracking-[.12em] text-[#8a8078] uppercase">
                    {row.label}
                  </th>
                  {items.map((product) => (
                    <td key={product.handle} className="p-2 align-top text-[#3f3830]">
                      {row.value(product)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr>
                <th className="p-2" />
                {items.map((product) => {
                  const size =
                    product.sizes.find((option) => product.sizePricing?.[option]?.available) ??
                    product.sizes[0] ??
                    "Free Size";
                  return (
                    <td key={product.handle} className="p-2">
                      <button
                        type="button"
                        onClick={() =>
                          addItem({
                            handle: product.handle,
                            title: product.title,
                            price: product.sizePricing?.[size]?.price ?? product.price,
                            compareAtPrice: product.compareAtPrice,
                            image: imageUrl(product.images[0], 400),
                            size,
                            colour: product.colourName ?? product.color,
                          })
                        }
                        className="w-full bg-[#862222] py-2.5 text-[10.5px] font-semibold tracking-[.14em] text-white uppercase"
                      >
                        Add to cart
                      </button>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
