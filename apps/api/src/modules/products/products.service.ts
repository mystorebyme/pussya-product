import { catalog } from "../../config/data";
import type { Product } from "@noor/types";

export function listProducts(params: {
  q?: string;
  collection?: string;
  category?: string;
  sort?: string;
  page?: number;
  perPage?: number;
}) {
  const { q, collection, category, sort = "featured", page = 1, perPage = 24 } = params;
  let items: Product[] = catalog().products;

  if (collection) items = items.filter((product) => product.collections.includes(collection));
  if (category) items = items.filter((product) => product.category === category);
  if (q) {
    const words = q.toLowerCase().split(/\s+/).filter(Boolean);
    items = items.filter((product) =>
      words.every((word) =>
        `${product.title} ${product.color} ${product.fabric} ${product.category}`
          .toLowerCase()
          .includes(word),
      ),
    );
  }

  items =
    sort === "price-low"
      ? [...items].sort((a, b) => a.price - b.price)
      : sort === "price-high"
        ? [...items].sort((a, b) => b.price - a.price)
        : sort === "discount"
          ? [...items].sort(
              (a, b) =>
                (b.compareAtPrice ?? b.price) - b.price - ((a.compareAtPrice ?? a.price) - a.price),
            )
          : items;

  const start = (page - 1) * perPage;
  return { items: items.slice(start, start + perPage), total: items.length };
}

export function findProduct(handle: string): Product | undefined {
  return catalog().products.find((product) => product.handle === handle);
}

export function listCollections() {
  return catalog().collections;
}

export function catalogMeta() {
  return catalog().meta;
}
