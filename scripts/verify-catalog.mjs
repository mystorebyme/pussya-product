#!/usr/bin/env node
/**
 * verify-catalog.mjs — catalogue ko ship karne se pehle sanity check.
 * Errors par exit 1 (CI gate). Warnings sirf print hote hain.
 *
 *   node scripts/verify-catalog.mjs
 */
import fs from "node:fs";
import path from "node:path";

const ROOT = path.resolve(import.meta.dirname, "..");
const FILE = path.join(ROOT, "database/seeds/catalog.json");
const LIVE_DIR = path.join(ROOT, "database/seeds/live");
const LIVE_COLLECTIONS = [
  "new-arrivals",
  "party-wear-gown",
  "saree",
  "likshas-choice",
  "lehnga-choli",
  "printed-suit-set",
  "weddin-collection",
  "trending",
  "sale",
];

const errors = [];
const warnings = [];

function fail(message) {
  errors.push(message);
}
function warn(message) {
  warnings.push(message);
}

if (!fs.existsSync(FILE)) {
  console.error("catalog.json missing — run npm run catalog:build");
  process.exit(1);
}

const catalog = JSON.parse(fs.readFileSync(FILE, "utf8"));
const products = catalog.products ?? [];
/** extra store (guest) products — live-store parity check inhe chhod ke hota hai */
const noorProducts = products.filter((product) => product.source !== "extra");
const catalogCollectionHandles = new Set((catalog.collections ?? []).map((collection) => collection.handle));

if (noorProducts.length !== 287) fail(`expected 287 noor products, found ${noorProducts.length}`);
if (catalog.meta?.moneyUnit !== "paise") fail("meta.moneyUnit must be 'paise'");
if (!/^https?:\/\//.test(String(catalog.meta?.source ?? ""))) fail("meta.source must be a URL");

const handles = new Set();
const sizePattern = /^(XS|S|M|L|XL|2XL|3XL|4XL|5XL)( \[[0-9]{2}\])?$|^Free Size$/;

for (const product of products) {
  if (!/^[a-z0-9-]+$/.test(product.handle)) fail(`${product.handle}: handle is not an ASCII slug`);
  if (handles.has(product.handle)) fail(`${product.handle}: duplicate handle`);
  handles.add(product.handle);

  if (!Number.isInteger(product.price) || product.price <= 0) {
    fail(`${product.handle}: price must be a positive integer (paise)`);
  }
  if (product.compareAtPrice !== null) {
    if (!Number.isInteger(product.compareAtPrice) || product.compareAtPrice <= product.price) {
      fail(`${product.handle}: compareAtPrice must be > price`);
    }
  }
  if (!product.images?.length) fail(`${product.handle}: no image`);
  if (!product.sizes?.length) fail(`${product.handle}: no sizes`);
  for (const size of product.sizes ?? []) {
    if (!sizePattern.test(size)) fail(`${product.handle}: bad size "${size}"`);
  }
  for (const collection of product.collections ?? []) {
    const known = LIVE_COLLECTIONS.includes(collection) || catalogCollectionHandles.has(collection);
    if (!known) fail(`${product.handle}: unknown collection "${collection}"`);
  }
  if (!product.description || product.description.length < 10) {
    fail(`${product.handle}: description is missing (live body_html se aana chahiye)`);
  }
  if (!product.descriptionHtml) fail(`${product.handle}: descriptionHtml is missing`);
  if (!product.sizePricing || !Object.keys(product.sizePricing).length) {
    fail(`${product.handle}: sizePricing is missing`);
  }
  for (const size of product.sizes ?? []) {
    if (!product.sizePricing?.[size]) fail(`${product.handle}: size "${size}" has no pricing entry`);
  }
}

const handlesInCatalog = (catalog.collections ?? []).map((collection) => collection.handle);
for (const handle of LIVE_COLLECTIONS) {
  if (!handlesInCatalog.includes(handle)) fail(`missing collection "${handle}"`);
}

const catalogCollections = (catalog.collections ?? []).map((collection) => collection.handle);

const counts = {};
for (const product of products) {
  for (const collection of product.collections ?? []) counts[collection] = (counts[collection] ?? 0) + 1;
}

console.log(`products: ${products.length}`);
console.log(
  Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([handle, count]) => `  ${handle}: ${count}`)
    .join("\n"),
);

// live snapshot ke against parity: galleries, descriptions, collections
if (fs.existsSync(path.join(LIVE_DIR, "products.json"))) {
  const live = JSON.parse(fs.readFileSync(path.join(LIVE_DIR, "products.json"), "utf8")).products;
  const liveByHandle = new Map(live.map((item) => [item.handle, item]));
  let missingGallery = 0;
  for (const product of noorProducts) {
    const source = liveByHandle.get(product.sourceHandle);
    if (!source) {
      fail(`${product.handle}: snapshot me source product nahi mila (${product.sourceHandle})`);
      continue;
    }
    const liveImages = (source.images ?? []).length;
    // images sirf dedupe ki wajah se kam ho sakti hain (kabhi zyada nahi)
    if (product.images.length > liveImages) {
      fail(`${product.handle}: ${product.images.length} images > snapshot ${liveImages}`);
    }
    if (!product.images.length) fail(`${product.handle}: koi image nahi`);
    if (!source.body_html && !product.descriptionHtml) fail(`${product.handle}: description missing in both`);
    if (liveImages === 1) missingGallery += 1;
  }
  if (missingGallery) warnings.push(`${missingGallery} products ki live gallery me bhi ek hi image hai`);

  // ek image poore catalogue me sirf ek hi product par honi chahiye
  const imageOwner = new Map();
  const shared = [];
  for (const product of products) {
    for (const image of product.images ?? []) {
      const owner = imageOwner.get(image);
      if (owner) shared.push(`${image.split("/").pop()} → ${owner} + ${product.handle}`);
      else imageOwner.set(image, product.handle);
    }
  }
  if (shared.length) fail(`shared images (${shared.length}): ${shared.slice(0, 5).join("; ")}`);
  console.log(`images unique across products: ${imageOwner.size}`);

  const membership = JSON.parse(fs.readFileSync(path.join(LIVE_DIR, "membership.json"), "utf8")).collections;
  // sirf noor ke products se count — extra store ke items alag collections me hain
  const noorCounts = {};
  for (const product of noorProducts) {
    for (const collection of product.collections ?? []) noorCounts[collection] = (noorCounts[collection] ?? 0) + 1;
  }
  for (const [handle, handles] of Object.entries(membership)) {
    if (handle === "frontpage") continue; // home-page grouping, nav collection nahi
    const expected = handles.length;
    const actual = noorCounts[handle] ?? 0;
    if (expected !== actual) fail(`collection ${handle}: ${actual}/${expected} products match the live store`);
  }
} else {
  warnings.push("live snapshot missing — parity check skipped (run npm run catalog:sync)");
}

for (const message of [...new Set(warnings)]) console.warn(`warn: ${message}`);
if (errors.length) {
  for (const message of errors) console.error(`error: ${message}`);
  process.exit(1);
}
console.log("catalog ok");
