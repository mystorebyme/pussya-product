import "server-only";

import type { Catalog, Collection, ColourGroup, ColourOption, Product } from "@noor/types";
import catalog from "@/data/catalog.json";

/**
 * Catalog ek build-time JSON hai (database/seeds/catalog.json se generate hota hai).
 * Isliye har page static render ho sakta hai — koi DB call nahi, TTFB fast.
 */
const data = catalog as unknown as Catalog;

export const products: Product[] = data.products;
export const collections: Collection[] = data.collections;
export const catalogMeta = data.meta;
export const colourGroups: Record<string, ColourGroup> = data.colourGroups ?? {};

/**
 * Ek hi design ke alag colours store par alag products hain — listing par sirf
 * representative card dikhta hai (duplicate cards nahi), PDP par swatch se colour badalta hai.
 */
export function isRepresentative(product: Product): boolean {
  const group = product.colourGroup ? colourGroups[product.colourGroup] : null;
  return !group || group.handle === product.handle;
}

export function listed<T extends Product>(list: T[]): T[] {
  return list.filter(isRepresentative);
}

export function colourGroupFor(product: Product): ColourGroup | null {
  return product.colourGroup ? (colourGroups[product.colourGroup] ?? null) : null;
}

/** PDP ke swatches: is product ka colour pehle, phir baaki */
export function colourOptionsFor(product: Product): ColourOption[] {
  const group = colourGroupFor(product);
  if (!group) return [];
  const own = group.colours.find((option) => option.handle === product.handle);
  return own ? [own, ...group.colours.filter((option) => option.handle !== product.handle)] : group.colours;
}

/** listed products — colour groups ka sirf ek card */
export async function getProducts(): Promise<Product[]> {
  return listed(products);
}

export async function getProduct(handle: string): Promise<Product | undefined> {
  return products.find((product) => product.handle === handle);
}

export async function getCollections(): Promise<Collection[]> {
  return [...collections].sort((a, b) => a.sortOrder - b.sortOrder);
}

/**
 * Purane/short URLs jo live store par circulate ho chuke — clean handle par
 * resolve hote hain. Route dono par khulta hai, canonical sirf clean handle.
 */
export const COLLECTION_ALIASES: Record<string, string> = {
  "wedding-collection": "weddin-collection",
};

export function resolveCollectionHandle(handle: string): string {
  return COLLECTION_ALIASES[handle] ?? handle;
}

/**
 * Catalog me purana typo handle (`weddin-collection`) hai kyunki live store ne
 * wahi use kiya. Public/canonical URL clean spelling par rehta hai, taaki
 * Google ko ek hi page na do baar mile (duplicate content nahi).
 */
export const COLLECTION_CANONICAL: Record<string, string> = {
  "weddin-collection": "wedding-collection",
};

/** Canonical (clean) handle — dono spellings par page khulta hai, canonical ek. */
export function canonicalCollectionHandle(handle: string): string {
  return COLLECTION_CANONICAL[handle] ?? handle;
}

export async function getCollection(handle: string): Promise<Collection | undefined> {
  const canonical = resolveCollectionHandle(handle);
  return collections.find((collection) => collection.handle === canonical);
}

export async function getProductsByCollection(handle: string, limit?: number): Promise<Product[]> {
  const canonical = resolveCollectionHandle(handle);
  const list = listed(products.filter((product) => product.collections.includes(canonical)));
  return typeof limit === "number" ? list.slice(0, limit) : list;
}

export async function getFeatured(limit = 8): Promise<Product[]> {
  return listed(products).filter((product) => product.featured).slice(0, limit);
}

export async function getLatest(limit = 12): Promise<Product[]> {
  return listed(products).slice(0, limit);
}

export async function getRelated(handle: string, limit = 8): Promise<Product[]> {
  const current = products.find((product) => product.handle === handle);
  if (!current) return products.slice(0, limit);
  const sameCategory = listed(products).filter(
    (product) => product.handle !== handle && product.category === current.category,
  );
  const sameColor = sameCategory.filter((product) => product.color === current.color);
  return [...sameColor, ...sameCategory.filter((p) => !sameColor.includes(p))].slice(0, limit);
}

export function searchProducts(term: string, limit = 8) {
  const query = term.trim().toLowerCase();
  if (query.length < 2) return [];
  return listed(products)
    .filter((product) => {
      const haystack = `${product.title} ${product.color} ${product.fabric} ${product.category}`.toLowerCase();
      return query.split(/\s+/).every((word) => haystack.includes(word));
    })
    .slice(0, limit)
    .map((product) => ({
      handle: product.handle,
      title: product.title,
      price: product.price,
      compareAtPrice: product.compareAtPrice,
      images: product.images,
      color: product.color,
      fabric: product.fabric,
    }));
}

/** Search box ke "search suggestions" — curated phrases + live catalog se colours/categories. */
const CURATED_SEARCH_PHRASES = [
  "anarkali suit set",
  "designer anarkali",
  "wedding anarkali",
  "georgette anarkali",
  "silk anarkali",
  "printed suit set",
  "lehenga choli",
  "party wear gown",
  "sharara suit set",
  "saree",
  "sale",
];

let suggestionCache: string[] | null = null;

function allSearchPhrases(): string[] {
  if (suggestionCache) return suggestionCache;
  const colours = new Set<string>();
  const fabrics = new Set<string>();
  const categories = new Set<string>();
  for (const product of listed(products)) {
    if (product.color && product.color !== "As Shown") colours.add(product.color.toLowerCase());
    if (product.fabric && product.fabric !== "As Shown") fabrics.add(product.fabric.toLowerCase());
    if (product.category) categories.add(product.category.replace(/-/g, " "));
  }
  const collectionTitles = collections
    .filter((collection) => collection.handle !== "saree")
    .map((collection) => collection.title.toLowerCase());
  suggestionCache = Array.from(
    new Set([
      ...CURATED_SEARCH_PHRASES,
      ...collectionTitles,
      ...Array.from(colours).map((colour) => `${colour} anarkali`),
      ...Array.from(fabrics).map((fabric) => `${fabric} suit set`),
      ...Array.from(categories),
    ]),
  );
  return suggestionCache;
}

/** Typeahead terms — "ana" par "anarkali suit set", "anarkali suit set georgette" etc. */
export function searchSuggestions(term: string, limit = 6): string[] {
  const query = term.trim().toLowerCase();
  if (query.length < 2) return [];
  const words = query.split(/\s+/).filter(Boolean);
  return allSearchPhrases()
    .filter((phrase) => words.every((word) => phrase.includes(word)))
    .filter((phrase) => phrase !== query)
    .sort((a, b) => a.length - b.length)
    .slice(0, limit);
}

/** Search page ke liye "recommended" picks — trending pehle, phir Noor's choice. */
export function recommendedProducts(limit = 8): Product[] {
  const trending = listed(products).filter((product) => product.collections.includes("trending"));
  const picks = listed(products).filter((product) => product.collections.includes("noors-choice"));
  const newest = [...listed(products)].sort((a, b) =>
    String(b.publishedAt ?? "").localeCompare(String(a.publishedAt ?? "")),
  );
  const merged: Product[] = [];
  for (const product of [...trending, ...picks, ...newest]) {
    if (merged.length >= limit) break;
    if (!merged.some((item) => item.handle === product.handle)) merged.push(product);
  }
  return merged;
}

export const SORT_KEYS = ["featured", "price-low", "price-high", "discount", "new", "title-asc"] as const;
export type SortKey = (typeof SORT_KEYS)[number];

export function isSortKey(value: string | undefined): value is SortKey {
  return Boolean(value) && (SORT_KEYS as readonly string[]).includes(value as string);
}

export function sortProducts(list: Product[], key: SortKey = "featured"): Product[] {
  const copy = [...list];
  switch (key) {
    case "price-low":
      return copy.sort((a, b) => a.price - b.price);
    case "price-high":
      return copy.sort((a, b) => b.price - a.price);
    case "discount":
      return copy.sort(
        (a, b) =>
          (b.compareAtPrice ?? b.price) - b.price - ((a.compareAtPrice ?? a.price) - a.price),
      );
    case "new":
      return copy;
    case "title-asc":
      return copy.sort((a, b) => a.title.localeCompare(b.title));
    default:
      return copy.sort((a, b) => Number(b.featured) - Number(a.featured));
  }
}

export async function getRelatedProducts(product: Product, limit = 4): Promise<Product[]> {
  return getRelated(product.handle, limit);
}
