#!/usr/bin/env node
/**
 * npm run pricing:sale            -> catalog JSON files par festive sale pricing lagao
 * npm run pricing:sale -- --verify -> sirf check karo (kuch nahi likhta)
 *
 * Files: database/seeds/catalog.json (canonical) + web/admin runtime copies.
 * Rebuild ke baad bhi price same rehne ke liye yeh same function
 * scripts/build-catalog.mjs ke andar bhi chalta hai.
 */
import fs from "node:fs";
import path from "node:path";
import { applySalePricing, displayedPercent, SALE_FINAL_PRICES } from "../lib/sale-pricing.mjs";

const ROOT = path.resolve(import.meta.dirname, "..", "..");
const FILES = [
  "database/seeds/catalog.json",
  "apps/web/src/data/catalog.json",
  "apps/admin/src/data/catalog.json",
];
const verifyOnly = process.argv.includes("--verify");

let failed = 0;
for (const relative of FILES) {
  const file = path.join(ROOT, relative);
  if (!fs.existsSync(file)) {
    console.warn(`skip (missing): ${relative}`);
    continue;
  }
  const raw = fs.readFileSync(file, "utf8");
  const catalog = JSON.parse(raw);
  const products = catalog.products ?? [];
  if (!products.length) {
    console.warn(`skip (no products): ${relative}`);
    continue;
  }

  if (!verifyOnly) {
    applySalePricing(products);
    fs.writeFileSync(file, `${JSON.stringify(catalog, null, 1)}\n`);
  }

  // verify
  const badPrice = products.filter((product) => !SALE_FINAL_PRICES.includes(product.price));
  const badPercent = products.filter((product) => {
    const percent = displayedPercent(product.price, product.compareAtPrice);
    return percent !== 70 && percent !== 60;
  });
  const badSize = products.filter((product) =>
    Object.values(product.sizePricing ?? {}).some((entry) => entry && entry.price && !SALE_FINAL_PRICES.includes(entry.price)),
  );
  const percentages = products.reduce((acc, product) => {
    const percent = displayedPercent(product.price, product.compareAtPrice);
    acc[percent] = (acc[percent] ?? 0) + 1;
    return acc;
  }, {});
  console.log(
    `${verifyOnly ? "verify" : "apply "} ${relative}: ${products.length} products · ` +
      `badPrice=${badPrice.length} badPercent=${badPercent.length} badSize=${badSize.length} · ` +
      JSON.stringify(percentages),
  );
  if (badPrice.length || badPercent.length || badSize.length) {
    failed += 1;
    console.error(
      "  examples:",
      [...badPrice, ...badPercent, ...badSize].slice(0, 5).map((product) => ({
        handle: product.handle,
        price: product.price,
        mrp: product.compareAtPrice,
      })),
    );
  }
}

if (failed) {
  console.error(`sale pricing FAILED for ${failed} file(s)`);
  process.exit(1);
}
console.log(verifyOnly ? "sale pricing verified ✔" : "sale pricing applied ✔");
