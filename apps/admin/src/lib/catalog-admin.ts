import fs from "node:fs";
import path from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import type { Catalog, Product } from "@noor/types";
import catalogJson from "../data/catalog.json";
import {
  catalogWritable,
  readOverrides,
  repoRoot,
  overridesFile,
  writeOverrides,
  type NewProduct,
  type OverridesFile,
  type ProductOverride,
} from "./overrides";

const run = promisify(execFile);

export { catalogWritable, overridesFile, readOverrides };
export type { NewProduct, OverridesFile, ProductOverride };

/** admin list/edit ke liye catalogue + overrides merged */
export function mergedProducts(): Product[] {
  const catalog = catalogJson as unknown as Catalog;
  const overrides = readOverrides();
  const hidden = new Set(overrides.hidden);
  // publish se pehle bhi admin me naye products dikhein (catalogue build agle step me)
  const added: Product[] = (overrides.newProducts ?? []).map((item) => ({
    handle: item.handle,
    sourceHandle: item.handle,
    title: item.title,
    price: item.price,
    compareAtPrice: item.compareAtPrice ?? null,
    images: item.images,
    collections: item.collections ?? [],
    category: (item.category ?? "anarkali") as Product["category"],
    fabric: item.fabric ?? "Silk blend",
    color: item.color ?? "As shown",
    sizes: item.sizes ?? ["S", "M", "L", "XL"],
    sizePricing: Object.fromEntries(
      (item.sizes ?? ["S", "M", "L", "XL"]).map((size) => [
        size,
        { price: item.price, compareAtPrice: item.compareAtPrice ?? null, available: true },
      ]),
    ),
    details: [],
    description: item.description ?? item.title,
    descriptionHtml: `<p>${item.description ?? item.title}</p>`,
    productType: "Admin upload",
    rating: 0,
    reviewCount: 0,
    inStock: item.inStock !== false,
    featured: false,
    publishedAt: item.createdAt ?? null,
  }));
  return [...catalog.products, ...added].map((product) => {
    const patch = overrides.products[product.handle];
    const merged: Product & { hidden?: boolean } = patch
      ? {
          ...product,
          title: patch.title ?? product.title,
          price: patch.price ?? product.price,
          compareAtPrice: patch.compareAtPrice === undefined ? product.compareAtPrice : patch.compareAtPrice,
          inStock: patch.inStock ?? product.inStock,
          featured: patch.featured ?? product.featured,
          description: patch.description ?? product.description,
          collections: patch.collections ?? product.collections,
          images: patch.images?.length ? patch.images : product.images,
          sizePricing: { ...product.sizePricing, ...(patch.sizePricing ?? {}) } as Product["sizePricing"],
        }
      : product;
    merged.hidden = hidden.has(product.handle);
    return merged;
  });
}

export type AdminProduct = Product & { hidden?: boolean };

export function mergedProduct(handle: string): AdminProduct | null {
  return (mergedProducts() as AdminProduct[]).find((product) => product.handle === handle) ?? null;
}

/** sale ladder — admin naya product sirf inhi final prices par bana sakta hai */
export const ADMIN_PRICE_LADDER = [49_900, 54_900, 59_900, 64_900, 69_900] as const;

export function handleFromTitle(title: string): string {
  return String(title)
    .normalize("NFKD")
    .replace(/[^a-zA-Z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase()
    .slice(0, 70);
}

/**
 * Naya product + uski photos (1–10) catalogue me jodo.
 * Actual catalogue publish `publishCatalog()` karta hai (build script).
 */
export function createAdminProduct(
  input: {
    title: string;
    handle?: string;
    price: number;
    images: string[];
    collections?: string[];
    description?: string;
    sizes?: string[];
    fabric?: string;
    color?: string;
    category?: string;
  },
  actor: string,
): { ok: boolean; handle?: string; error?: string } {
  if (!catalogWritable()) {
    return { ok: false, error: "Is deployment me catalogue files read-only hain — GitHub repo me run karke publish kariye." };
  }
  const title = input.title.trim();
  if (title.length < 3) return { ok: false, error: "Product ka naam likhiye." };

  const images = [...new Set(input.images.map((image) => image.trim()).filter(Boolean))];
  if (!images.length) return { ok: false, error: "Kam se kam ek product photo chahiye (10 tak)." };
  if (images.length > 10) return { ok: false, error: "Ek product par 10 se zyada photo nahi." };
  const badImage = images.find((image) => !/^https:\/\/[^\s]+\.(png|jpe?g|webp|avif)(\?.*)?$/i.test(image));
  if (badImage) {
    return { ok: false, error: `Photo link direct image hona chahiye (.jpg/.png/.webp): ${badImage.slice(0, 60)}` };
  }
  if (!ADMIN_PRICE_LADDER.includes(input.price as (typeof ADMIN_PRICE_LADDER)[number])) {
    return { ok: false, error: "Final price ₹499 / ₹549 / ₹599 / ₹649 / ₹699 me se chuniye." };
  }

  const overrides = readOverrides();
  const existing = new Set(mergedProducts().map((product) => product.handle));
  let handle = handleFromTitle(input.handle || title);
  if (!handle) return { ok: false, error: "URL handle nahi ban paya — naam badal kar dekhiye." };
  if (existing.has(handle)) handle = `${handle}-${Date.now().toString(36).slice(-4)}`;

  const sizes = (input.sizes?.length ? input.sizes : ["S", "M", "L", "XL"]).filter((size) =>
    ["XS", "S", "M", "L", "XL", "XXL", "3XL", "Free Size"].includes(size),
  );

  const product: NewProduct = {
    handle,
    title,
    price: input.price,
    compareAtPrice: null,
    images,
    collections: input.collections?.length ? input.collections : ["new-arrivals"],
    description: input.description?.trim() || title,
    sizes: sizes.length ? sizes : ["S", "M", "L", "XL"],
    fabric: input.fabric?.trim() || "Silk blend",
    color: input.color?.trim() || "As shown",
    category: input.category || "anarkali",
    inStock: true,
    createdAt: new Date().toISOString(),
    createdBy: actor,
  };

  overrides.newProducts = [...(overrides.newProducts ?? []).filter((item) => item.handle !== handle), product];
  if (!writeOverrides(overrides)) return { ok: false, error: "File write fail hua — dobara try kariye." };
  return { ok: true, handle };
}

export function saveProductOverride(handle: string, patch: ProductOverride, actor: string): boolean {
  const overrides = readOverrides();
  overrides.products[handle] = {
    ...overrides.products[handle],
    ...patch,
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  return writeOverrides(overrides);
}

export function setProductHidden(handle: string, hidden: boolean, actor: string): boolean {
  const overrides = readOverrides();
  const set = new Set(overrides.hidden);
  if (hidden) set.add(handle);
  else set.delete(handle);
  overrides.hidden = [...set];
  overrides.products[handle] = {
    ...overrides.products[handle],
    updatedAt: new Date().toISOString(),
    updatedBy: actor,
  };
  return writeOverrides(overrides);
}

export function saveCollectionOverride(
  handle: string,
  patch: { title?: string; subtitle?: string },
): boolean {
  const overrides = readOverrides();
  overrides.collections[handle] = { ...overrides.collections[handle], ...patch };
  return writeOverrides(overrides);
}

/**
 * Publish: seed overrides -> catalogue rebuild. Website usi build se serve hoti hai,
 * isliye admin ka edit live storefront par chala jaata hai.
 */
export async function publishCatalog(): Promise<{ ok: boolean; log: string }> {
  const root = repoRoot();
  if (!catalogWritable()) {
    return {
      ok: false,
      log: "Catalogue publish sirf repo checkout par chalta hai (deployed panel read-only hai). Edits local se push karein.",
    };
  }
  try {
    const { stdout, stderr } = await run("node", ["scripts/build-catalog.mjs"], {
      cwd: root,
      timeout: 120_000,
      maxBuffer: 4 * 1024 * 1024,
    });
    const overrides = readOverrides();
    overrides.meta = { ...(overrides.meta ?? {}), lastPublishedAt: new Date().toISOString() };
    writeOverrides(overrides);
    return { ok: true, log: `${stdout}\n${stderr}`.trim().slice(-4000) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "build failed";
    return { ok: false, log: message.slice(0, 4000) };
  }
}

/** Kaunse products par admin edits hain (dashboard ke liye) */
export function overrideStats() {
  const overrides = readOverrides();
  return {
    edited: Object.keys(overrides.products).length,
    hidden: overrides.hidden.length,
    lastPublishedAt: overrides.meta?.lastPublishedAt ?? null,
  };
}
