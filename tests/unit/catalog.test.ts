import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import type { Catalog, Product } from "@noor/types";

const root = process.cwd(); // npm test root se chalta hai
const file = path.join(root, "database/seeds/catalog.json");
const catalog = JSON.parse(fs.readFileSync(file, "utf8")) as Catalog;
const products: Product[] = catalog.products;
/** extra store (guest) products — live-store parity sirf sample catalogue ke products par hoti hai */
const sampleProducts = products.filter((product) => (product as Product & { source?: string }).source !== "extra");
const liveDir = path.join(root, "database/seeds/live");
const liveProducts: any[] = JSON.parse(fs.readFileSync(path.join(liveDir, "products.json"), "utf8")).products;
const liveMembership: Record<string, string[]> = JSON.parse(
  fs.readFileSync(path.join(liveDir, "membership.json"), "utf8"),
).collections;

test("catalogue has the full live product set", () => {
  assert.equal(sampleProducts.length, 287);
  assert.equal(catalog.meta.liveProductCount, 287);
  assert.equal(catalog.meta.productCount, products.length);
  assert.equal(catalog.meta.moneyUnit, "paise");
  // meta.source = sample catalogue ka source (jab owner apne products daalega tab badlega)
  assert.match(String(catalog.meta.source), /^https?:\/\//);
});

test("web and admin copies are identical to the canonical seed", () => {
  const canonical = fs.readFileSync(file, "utf8");
  for (const app of ["web", "admin"]) {
    const copy = path.join(root, `apps/${app}/src/data/catalog.json`);
    assert.equal(fs.readFileSync(copy, "utf8"), canonical, `${app} copy is stale — run npm run catalog:build`);
  }
});

test("handles are unique and url-safe", () => {
  const handles = products.map((product) => product.handle);
  assert.equal(new Set(handles).size, handles.length);
  for (const handle of handles) assert.match(handle, /^[a-z0-9-]+$/);
});

test("every product has a positive integer price in paise", () => {
  for (const product of products) {
    assert.equal(Number.isInteger(product.price), true, `${product.handle} price not integer`);
    assert.ok(product.price > 0, `${product.handle} price <= 0`);
  }
});

test("festive sale: every final price is ₹499 / ₹549 / ₹599 / ₹649 / ₹699", () => {
  const allowed = [49_900, 54_900, 59_900, 64_900, 69_900];
  for (const product of products) {
    assert.ok(
      allowed.includes(product.price),
      `${product.handle}: final price ${product.price} sale set me nahi hai`,
    );
    // har size par bhi wahi final price
    for (const [size, pricing] of Object.entries(product.sizePricing ?? {})) {
      assert.equal(pricing.price, product.price, `${product.handle} ${size} price mismatch`);
    }
  }
});

test("festive sale: discount badge only shows 60% or 70%", () => {
  for (const product of products) {
    const percent = Math.round(((product.compareAtPrice! - product.price) / product.compareAtPrice!) * 100);
    assert.ok([60, 70].includes(percent), `${product.handle}: ${percent}% discount`);
  }
});

test("compare-at price is always above selling price when present", () => {
  for (const product of products) {
    if (product.compareAtPrice === null) continue;
    assert.equal(Number.isInteger(product.compareAtPrice), true);
    assert.ok(
      product.compareAtPrice > product.price,
      `${product.handle}: MRP ${product.compareAtPrice} <= price ${product.price}`,
    );
  }
});

test("every product has at least one CDN image and one size", () => {
  for (const product of products) {
    assert.ok(product.images.length >= 1, `${product.handle} has no image`);
    assert.match(product.images[0]!, /^https:\/\/cdn\.shopify\.com\//);
    assert.ok(product.sizes.length >= 1, `${product.handle} has no sizes`);
  }
});

test("sizes use the store's display format", () => {
  const allowed = /^(XS|S|M|L|XL|2XL|3XL|4XL|5XL|Free Size)( \[[0-9]{2}\])?$/;
  for (const product of products) {
    for (const size of product.sizes) {
      assert.match(size, allowed, `${product.handle}: unexpected size "${size}"`);
    }
  }
});

test("nine live collections exist and membership is from the real set", () => {
  const handles = catalog.collections.map((collection) => collection.handle).sort();
  // 9 live collections + extra store ki alag collections (guest edits)
  for (const handle of [
    "lehnga-choli",
    "noors-choice",
    "new-arrivals",
    "party-wear-gown",
    "printed-suit-set",
    "sale",
    "saree",
    "trending",
    "weddin-collection",
  ]) {
    assert.ok(handles.includes(handle), `${handle} missing`);
  }
  const known = new Set(handles);
  for (const product of products) {
    for (const collection of product.collections) {
      assert.ok(known.has(collection), `${product.handle} points at unknown collection ${collection}`);
    }
  }
});

test("collection counts match the live store snapshot", () => {
  const counts: Record<string, number> = {};
  for (const product of sampleProducts) {
    for (const collection of product.collections) {
      counts[collection] = (counts[collection] ?? 0) + 1;
    }
  }
  for (const [handle, handles] of Object.entries(liveMembership)) {
    if (handle === "frontpage") continue; // home-page grouping, nav collection nahi
    assert.equal(counts[handle] ?? 0, handles.length, `${handle} count drifted from the live store`);
  }
  assert.equal(counts["saree"], undefined); // store par bhi khaali
});

test("every product carries the full live gallery", () => {
  const liveByHandle = new Map(liveProducts.map((product) => [product.handle, product]));
  const liveHandles = new Set(liveByHandle.keys());
  // ek image sirf ek product par dikhni chahiye — isliye jo photo kisi dusre product par
  // pehle use ho chuki hai wo is product se hata di jaati hai.
  const owner = new Map<string, string>();
  for (const product of products) {
    for (const image of product.images) owner.set(image, product.handle);
  }
  for (const product of sampleProducts) {
    const source: any = liveByHandle.get(product.sourceHandle);
    assert.ok(source, `${product.handle} missing from the live snapshot`);
    // catalogue me image URL se `?v=` query hata di jaati hai — compare usi form me karo
    const liveImages: string[] = [
      ...new Set<string>((source.images ?? []).map((image: any) => String(image.src ?? image).split("?")[0])),
    ];
    assert.ok(product.images.length > 0, `${product.handle} has no images`);
    assert.ok(product.images.length <= liveImages.length, `${product.handle} has more images than live`);
    const sharedWithOthers = liveImages.filter((image) => {
      const other = owner.get(image);
      return other !== undefined && other !== product.handle;
    });
    assert.equal(
      product.images.length,
      liveImages.length - sharedWithOthers.length,
      `${product.handle} gallery mismatch`,
    );
    for (const image of product.images) assert.match(image, /^https:\/\/cdn\.shopify\.com\//);
  }
});

test("live descriptions are sanitized and rendered, not dropped", () => {
  for (const product of products) {
    assert.ok(product.descriptionHtml && product.descriptionHtml.length > 3, `${product.handle} has no descriptionHtml`);
    assert.doesNotMatch(product.descriptionHtml!, /<(script|iframe|img)\b/i, `${product.handle} has unsanitized html`);
  }
});

test("every size has live pricing attached", () => {
  for (const product of products) {
    for (const size of product.sizes) {
      const pricing = product.sizePricing?.[size];
      assert.ok(pricing, `${product.handle}: ${size} has no pricing`);
      assert.equal(Number.isInteger(pricing!.price), true);
      assert.ok(pricing!.price > 0);
    }
  }
});

test("every product carries a description and details", () => {
  for (const product of products) {
    assert.ok(product.description.trim().length >= 3, `${product.handle} description missing`);
    assert.ok(Array.isArray(product.details), `${product.handle} details missing`);
    assert.ok(product.category.length > 0, `${product.handle} category missing`);
  }
});

test("handles are ASCII slugs with the source handle kept", () => {
  for (const product of products) {
    assert.match(product.handle, /^[a-z0-9-]+$/, `${product.handle} is not an ASCII slug`);
    assert.ok(product.sourceHandle.length > 0);
  }
});
