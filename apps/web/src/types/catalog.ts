import type { Collection, ColourGroup, ColourOption, Product } from "@noor/types";

export type { Collection, ColourGroup, ColourOption, Product };

export type CatalogProduct = Product;
export type CatalogCollection = Collection;

export type SearchHit = Pick<Product, "handle" | "title" | "price" | "compareAtPrice" | "images"> & {
  color: string;
  fabric: string;
};

export type MiniProduct = {
  handle: string;
  title: string;
  price: number;
  compareAtPrice: number | null;
  image: string;
  size?: string;
};
