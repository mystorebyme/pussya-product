"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { productsByHandles } from "@/lib/catalog-lite";
import { ProductCard } from "@/components/product-card";
import { useWishlist } from "@/components/wishlist-provider";
import type { Product } from "@/types/catalog";

/**
 * Wishlist — handles localStorage me, product data `/api/products?handles=…` se
 * (poora 1.2MB catalog client bundle me nahi jaata).
 */
export default function WishlistPage() {
  const { wishlist, ready, clearWishlist } = useWishlist();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!ready) return;
    if (!wishlist.length) {
      setItems([]);
      return;
    }
    let active = true;
    setLoading(true);
    productsByHandles(wishlist)
      .then((products) => {
        if (active) setItems(products);
      })
      .catch(() => undefined)
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [wishlist, ready]);

  return (
    <div className="container-noor py-9 lg:py-12">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="font-display text-[28px] font-medium sm:text-[34px]">My wishlist</h1>
          <p className="mt-1 text-[11.5px] tracking-[.12em] text-[#9c8f82] uppercase">
            {ready ? `${wishlist.length} ${wishlist.length === 1 ? "piece" : "pieces"} saved` : "Loading…"}
          </p>
        </div>
        {items.length > 0 ? (
          <button
            type="button"
            onClick={clearWishlist}
            className="border border-[#ddd2c6] px-4 py-2 text-[10.5px] font-semibold tracking-[.14em] text-[#6b6259] uppercase transition hover:border-[#862222] hover:text-[#862222]"
          >
            Clear wishlist
          </button>
        ) : null}
      </div>

      {items.length === 0 ? (
        <div className="mt-10 border border-[#eee6de] px-6 py-20 text-center">
          <p className="text-sm text-[#6b6259]">
            {ready && !loading ? "Your wishlist is empty — tap the heart icon on any product card." : "Loading…"}
          </p>
          <Link
            href="/collections/party-wear-gown"
            className="mt-5 inline-block bg-[#862222] px-7 py-3 text-[11px] font-semibold tracking-[.16em] text-white uppercase"
          >
            Shop Anarkali suits
          </Link>
        </div>
      ) : (
        <div className="mt-7 grid grid-cols-2 gap-x-2.5 gap-y-7 sm:gap-x-5 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((product) => (
            <ProductCard key={product.handle} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}
